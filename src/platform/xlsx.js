/*
 * The two .xlsx jobs Kavin's portal hands its server (apps/common/xlsx.py), done here with no
 * dependency: reading an uploaded sheet into a table of strings (POST /api/jobs/parse) and writing the
 * request template (GET /api/jobs/template.xlsx). An .xlsx is a zip of XML parts; reading inflates the
 * parts with the browser's DecompressionStream, writing stores them uncompressed.
 */

export class XlsxError extends Error {}

/* ---- reading ------------------------------------------------------ */

async function inflate(bytes){
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
// the zip's central directory: every entry's name, method and where its data starts
async function unzip(buf){
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new XlsxError("That file is not an Excel workbook (.xlsx)");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {}, dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new XlsxError("The workbook is damaged");
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true), name = dec.decode(u8.subarray(p + 46, p + 46 + nameLen));
    files[name] = {method, size, local};
    p += 46 + nameLen + extraLen + commentLen;
  }
  const read = async name => {
    const f = files[name]; if (!f) return null;
    const start = f.local + 30 + dv.getUint16(f.local + 26, true) + dv.getUint16(f.local + 28, true);
    const raw = u8.subarray(start, start + f.size);
    if (f.method === 0) return dec.decode(raw);
    if (f.method === 8) return dec.decode(await inflate(raw));
    throw new XlsxError("The workbook uses a compression this reader does not know");
  };
  return {names: Object.keys(files), read};
}
const colIndex = ref => { let n = 0; for (const c of ref.replace(/\d+$/, "")) n = n * 26 + (c.charCodeAt(0) - 64); return n - 1; };
const textOf = el => [...el.getElementsByTagName("t")].map(t => t.textContent).join("");
// a whole number stored as a float reads as the number a person typed
const numText = v => /^-?\d+\.0+$/.test(v) ? v.replace(/\.0+$/, "") : v;

/** The first worksheet as rows of strings, blank rows dropped. */
export async function readTable(buf){
  const zip = await unzip(buf), xml = s => new DOMParser().parseFromString(s, "application/xml");
  const shared = [], ss = await zip.read("xl/sharedStrings.xml");
  if (ss) for (const si of xml(ss).getElementsByTagName("si")) shared.push(textOf(si));
  let sheetPath = "xl/worksheets/sheet1.xml";
  const wb = await zip.read("xl/workbook.xml"), rels = await zip.read("xl/_rels/workbook.xml.rels");
  if (wb && rels) {
    const first = xml(wb).getElementsByTagName("sheet")[0];
    const rid = first?.getAttribute("r:id") || first?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const target = [...xml(rels).getElementsByTagName("Relationship")].find(r => r.getAttribute("Id") === rid)?.getAttribute("Target");
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.\//, "");
  }
  const sheet = await zip.read(sheetPath);
  if (!sheet) throw new XlsxError("The workbook has no worksheet");
  const table = [];
  for (const row of xml(sheet).getElementsByTagName("row")) {
    const cells = [];
    for (const c of row.getElementsByTagName("c")) {
      const t = c.getAttribute("t"), v = c.getElementsByTagName("v")[0]?.textContent ?? "";
      const val = t === "s" ? (shared[+v] ?? "") : t === "inlineStr" ? textOf(c) : t === "b" ? (v === "1" ? "TRUE" : "FALSE") : numText(v);
      cells[colIndex(c.getAttribute("r") || "A1")] = String(val).trim();
    }
    const out = Array.from(cells, x => x ?? "");
    if (out.some(x => x)) table.push(out);
  }
  return table;
}

/* ---- writing ------------------------------------------------------ */

const CRC = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = u8 => { let c = 0xffffffff; for (const b of u8) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = i => { let s = ""; for (i++; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };

function zipStored(entries){
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0;
  for (const [name, text] of entries) {
    const nm = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint32(14, crc, true);
    head.setUint32(18, data.length, true); head.setUint32(22, data.length, true); head.setUint16(26, nm.length, true);
    parts.push(new Uint8Array(head.buffer), nm, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true); cd.setUint16(28, nm.length, true); cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nm);
    offset += 30 + nm.length + data.length;
  }
  const cdSize = central.reduce((n, p) => n + p.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)], out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0; for (const p of all) { out.set(p, at); at += p.length; }
  return out;
}

/** One sheet of strings as .xlsx bytes, the first row bold, with column widths in characters. */
export function writeTable(rows, sheetName = "Sheet1", widths = []){
  const cols = widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
  const data = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => v === "" || v == null ? "" :
    `<c r="${colName(ci)}${ri + 1}" t="inlineStr"${ri === 0 ? ' s="1"' : ""}><is><t xml:space="preserve">${esc(v)}</t></is></c>`).join("")}</row>`).join("");
  return zipStored([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`],
    ["xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${data}</sheetData></worksheet>`],
  ]);
}
