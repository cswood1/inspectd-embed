/*
 * Job references: the one human identifier a job has, everywhere people see one (docs/platform/decisions.md, "Job
 * references"). "J-" plus six characters of Crockford base32 (0-9 and A-Z without I, L, O and U), random, assigned when
 * the job is created and never changed. Never derived from the internal id; on a collision, draw again.
 * In production the database assigns it on insert; here the seed and portalServer.js call newRef.
 */

export const REF_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const REF_RE = /^J-[0-9A-HJKMNP-TV-Z]{6}$/;
const cryptoRand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

/** A new reference not in `taken` (a Set of every reference in use), added to it. `rand` returns [0, 1). */
export function newRef(taken, rand = cryptoRand){
  for (;;) {
    let s = "J-";
    for (let i = 0; i < 6; i++) s += REF_ALPHABET[Math.floor(rand() * REF_ALPHABET.length)];
    if (!taken.has(s)) { taken.add(s); return s; }
  }
}

/** A reference as typed, in any case, with or without the dash ("j7kq2m9", "J-7kq2m9"), as stored ("J-7KQ2M9"), or null. */
export function normRef(s){
  const k = String(s || "").trim().toUpperCase().replace(/[\s-]/g, "");
  const m = k.match(/^J?([0-9A-Z]{6})$/);
  return m && REF_RE.test(`J-${m[1]}`) ? `J-${m[1]}` : null;
}

/** What a search box matches a job's references against: our reference with and without the dash, and the customer's. */
export const refHay = (ref, customerRef = "") => [ref || "", (ref || "").replace("-", ""), customerRef || ""].join(" ").toLowerCase();
