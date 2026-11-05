import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { dupEmails } from "./derive.js";
import { TYPES, DESIGNATIONS, STATUS, LOOKUP, fmt, where, vehicle, isClosed, Icon, Who, DesigTag, Sk, SkelRows, SkelCards, CSelect, PageDock, paged, useToast, anySelectOpen } from "./ui.jsx";
import { JobPanel, requester } from "./JobPanel.jsx";

/*
 * The jobs board: status cards, search and filters, the sortable table. Ported from
 * inspection-requests/ui/shared/board.js, mounted as Open jobs or Closed jobs. A row opens the job
 * detail slide-over (JobPanel.jsx), as openOver/closeOver do.
 */

const COLS = [["name", "Customer"], ["vehicle", "Vehicle"], ["where", "Location"], ["type", "Type"], ["status", "Status"], ["lookup", "Lookup"], ["shops", "Shops"], ["created_at", "Received"]];
const colVal = (r, k) => ({name: requester(r).name.toLowerCase(), vehicle: vehicle(r.form).toLowerCase(), where: where(r.form).toLowerCase(), type: r.form.inspection_type,
  status: r.status, lookup: r.lookup, shops: r.result ? r.result.shops.length : -1, created_at: r.created_at})[k];
// the cards along the top: the statuses this board holds, and a card for all of them
const OPEN_CARDS = [["all", "All open"], ["received", "Received"], ["dispatching", "Dispatching"], ["confirmed", "Confirmed"]];
const CLOSED_CARDS = [["all", "All closed"], ["complete", "Complete"], ["canceled", "Canceled"]];
const VIEW = {
  open: ["Open jobs", "Requests still being worked, newest first. New requests are looked up automatically and come back with nearby mobile inspectors."],
  closed: ["Closed jobs", "Complete and canceled jobs. Reopen one by changing its status in the detail panel."],
};

export function Board({ mode, loaded, onRefresh, onOpenPortal, initialQ = "", initialOpen = null }){
  const closed = mode === "closed";
  const { rows, fulfill } = usePlatform();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState(initialQ);   // ?q= lands with the search already filled in (customers link here)
  const [jf, setJf] = useState({type: "", designation: "", state: ""});   // filters beyond the status cards and search
  const [sortKey, setSortKey] = useState("created_at"), [sortDir, setSortDir] = useState(-1);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState(null);
  // the panel keeps the last job drawn after it closes, as Kavin's does: it slides out with its content,
  // and the next job opens in the same body, scrolled where the last one was left
  const [shownId, setShownId] = useState(null);
  // "Change" blanks a job's link on this page only, as Kavin's does; nothing is saved, and Refresh brings it back
  const [unlinked, setUnlinked] = useState(() => new Set());
  const returnFocus = useRef(null), closeBtn = useRef(null), searchBox = useRef(null);
  useEffect(() => { if (!loaded) setUnlinked(new Set()); }, [loaded]);

  const pool = useMemo(() => loaded ? rows.filter(r => closed ? isClosed(r) : !isClosed(r)) : [], [rows, loaded, closed]);
  const cards = closed ? CLOSED_CARDS : OPEN_CARDS;

  // a chosen filter stays chosen even when nothing matches it any more, or the board would quietly widen itself
  const opts = (label, values, fmtv, cur) => [{value: "", label}, ...(cur && !values.includes(cur) ? [...values, cur] : values).map(v => ({value: v, label: fmtv ? fmtv(v) : v}))];
  const typeOpts = opts("Any type", [...new Set(pool.map(r => r.form.inspection_type))].sort(), v => TYPES[v] || v, jf.type);
  const desigOpts = opts("Any vehicle", [...new Set(pool.map(r => r.form.designation || "standard"))].sort(), v => DESIGNATIONS[v] || v, jf.designation);
  const stateOpts = opts("Any state", [...new Set(pool.map(r => (r.form.state || "").toUpperCase()).filter(Boolean))].sort(), null, jf.state);
  const statusOpts = [{value: "", label: "Any status"}, ...cards.map(([k]) => k).filter(k => k !== "all").map(k => ({value: k, label: STATUS[k]?.[1] || k}))];

  const counts = {all: pool.length}; pool.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const dups = dupEmails(rows);
  const ql = q.trim().toLowerCase();
  const hay = r => [r.form.name, r.form.email, r.form.phone, vehicle(r.form), where(r.form), r.form.vin, r.id, r.notes, r.org?.name].join(" ").toLowerCase();
  const list = pool.filter(r => (filter === "all" || r.status === filter) && (!jf.type || r.form.inspection_type === jf.type) && (!jf.designation || (r.form.designation || "standard") === jf.designation)
      && (!jf.state || (r.form.state || "").toUpperCase() === jf.state) && (!ql || hay(r).includes(ql)))
    .sort((a, b) => { const x = colVal(a, sortKey), y = colVal(b, sortKey); return (x < y ? -1 : x > y ? 1 : 0) * sortDir; });
  const pg = list.length ? paged(list, page) : null;
  const anyFilter = jf.type || jf.designation || jf.state || filter !== "all" || ql;

  const pickCard = k => { setFilter(k); setPage(0); };
  const setJ = (k, v) => { setJf(f => ({...f, [k]: v})); setPage(0); };
  const clearAll = () => { setJf({type: "", designation: "", state: ""}); setFilter("all"); setQ(""); setPage(0); };
  const sortBy = k => { if (sortKey === k) setSortDir(d => -d); else { setSortKey(k); setSortDir(k === "created_at" ? -1 : 1); } setPage(0); };
  const run = (e, id) => { e.stopPropagation(); fulfill(id); toast("Looking up shops"); };

  /* ---- job detail ---- */
  const openOver = id => {
    if (!rows.some(r => r.id === id)) return;
    returnFocus.current = document.activeElement;
    setOpenId(id); setShownId(id);
  };
  const closeOver = () => {
    if (!openId) return;
    setOpenId(null);
    // back to where they were, unless that was inside the panel just closed
    const back = returnFocus.current, over = closeBtn.current?.closest(".over");
    if (back && document.contains(back) && !over?.contains(back) && back !== document.body) back.focus();
    else searchBox.current?.focus();
    returnFocus.current = null;
  };
  useEffect(() => { if (openId) closeBtn.current?.focus(); }, [openId]);
  // ?open=<id> lands with the detail panel already open (reports link here)
  const pendingOpen = useRef(initialOpen);
  useEffect(() => { if (loaded && pendingOpen.current) { const id = pendingOpen.current; pendingOpen.current = null; if (rows.some(r => r.id === id)) openOver(id); } }, [loaded]);
  useEffect(() => { if (openId && !rows.some(r => r.id === openId)) setOpenId(null); }, [rows, openId]);   // deleted while open
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape" && openId && !e.closedASelect && !anySelectOpen()) closeOver(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  // "view all": the board again, filtered by that customer, as /dashboard?q=... mounts it
  const viewAll = value => { setOpenId(null); returnFocus.current = null; setJf({type: "", designation: "", state: ""}); setFilter("all");
    setSortKey("created_at"); setSortDir(-1); setPage(0); setQ(value); };
  const unlink = id => setUnlinked(s => new Set(s).add(id));
  const relink = id => setUnlinked(s => { const n = new Set(s); n.delete(id); return n; });

  const [title, intro] = VIEW[mode];
  return (
    <>
      <div className="pad greet">
        <div className="gt"><h1>{title}</h1><p>{intro}</p></div>
        <div className="actions"><button className="btn icon" title="Refresh" onClick={onRefresh}><Icon name="refresh" /></button></div>
      </div>
      <div className="pad">
        <div className="cards">
          {!loaded ? <SkelCards n={5} /> : cards.map(([k, t]) => (
            <div key={k} className={`card ${filter === k ? "on" : ""}`} role="button" tabIndex={0} onClick={() => pickCard(k)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickCard(k); } }}>
              <div className="t">{t}</div><div className="n">{counts[k] || 0}</div>
            </div>
          ))}
        </div>
        <div className="toolbar">
          <div className="search"><Icon name="search" size={14} /><input type="search" ref={searchBox} placeholder="Search name, email, vehicle, city" autoComplete="off" value={q} onChange={e => { setQ(e.target.value); setPage(0); }} /></div>
          <CSelect className={`fsel${filter !== "all" ? " on" : ""}`} label="Status" options={statusOpts} value={filter === "all" ? "" : filter} onChange={v => pickCard(v || "all")} />
          <CSelect className={`fsel${jf.type ? " on" : ""}`} label="Inspection type" options={typeOpts} value={jf.type} onChange={v => setJ("type", v)} />
          <CSelect className={`fsel${jf.designation ? " on" : ""}`} label="Vehicle designation" options={desigOpts} value={jf.designation} onChange={v => setJ("designation", v)} />
          <CSelect className={`fsel${jf.state ? " on" : ""}`} label="State" options={stateOpts} value={jf.state} onChange={v => setJ("state", v)} />
          <button className={`btn sm${anyFilter ? "" : " hide"}`} onClick={clearAll}>Clear filters</button>
          <span className="chip">{loaded ? `${list.length} of ${pool.length}` : <Sk w={54} h={12} />}</span>
        </div>
      </div>
      <div className="tablewrap">
        {!loaded ? <SkelRows n={6} heads={COLS.map(([, t]) => t).concat([""])} />
          : !list.length ? (
            <div className="empty"><b>{pool.length ? "Nothing matches" : (closed ? "No closed jobs yet" : "No open jobs")}</b>{pool.length ? "" : (closed ? "Complete and canceled jobs land here." : "Requests arrive from the client portal.")}</div>
          ) : (
            <table>
              <thead><tr>
                {COLS.map(([k, t]) => <th key={k} className={`sortable ${sortKey === k ? "on" : ""}`} onClick={() => sortBy(k)}>{t}<span className="arrow">{sortKey === k ? (sortDir > 0 ? "▲" : "▼") : ""}</span></th>)}
                <th className="r"></th>
              </tr></thead>
              <tbody>
                {pg.slice.map(r => {
                  const f = r.form, [hue, label] = STATUS[r.status] || ["gray", r.status], [lhue, llabel] = LOOKUP[r.lookup] || ["gray", r.lookup], done = isClosed(r);
                  // a walk-in customer submitting twice is worth a flag; a workspace sending a batch is not
                  const dup = !r.org && dups.has(f.email.toLowerCase())
                    ? <Icon name="warn" size={14} className="warnico" role="img" aria-label="Another request uses this email"><title>Another request uses this email</title></Icon> : null;
                  const w = requester(r);
                  return (
                    <tr key={r.id} className={`row st-${r.status} ${r.id === openId ? "on" : ""}`} data-id={r.id} onClick={() => openOver(r.id)}>
                      <td><Who name={w.name} email={w.sub} extra={dup} /></td>
                      <td>{vehicle(f)}</td>
                      <td className="sub">{where(f)}</td>
                      <td className="sub">{TYPES[f.inspection_type] || f.inspection_type}<DesigTag d={f.designation} /></td>
                      <td><span className={`pill ${hue}`}>{label}</span></td>
                      <td>{r.lookup === "none" && done ? null : <span className={`pill ${lhue}`}>{llabel}</span>}</td>
                      <td className="sub">{r.result ? r.result.shops.length : ""}</td>
                      <td className="sub">{fmt(r.created_at)}</td>
                      <td className="r">{done ? null : (
                        <button className={`btn sm ${r.lookup === "none" ? "primary" : ""} rowact`} data-id={r.id} disabled={r.lookup === "running"} onClick={e => run(e, r.id)}>
                          {r.lookup === "running" ? <><span className="spin"></span> Researching</> : r.lookup === "none" ? <><Icon name="search" size={13} /> Fulfill</> : <><Icon name="refresh" size={13} /> Run again</>}
                        </button>
                      )}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
      <PageDock pg={pg} rowSelector=".tablewrap tbody tr.row" onChange={d => setPage(p => p + d)} />
      <JobPanel row={rows.find(r => r.id === shownId) || null} rows={rows} open={!!openId} closed={closed} closeRef={closeBtn}
        onClose={closeOver} onOpen={openOver} onViewAll={viewAll} onOpenPortal={onOpenPortal}
        unlinked={shownId ? unlinked.has(shownId) : false} onUnlink={() => unlink(shownId)} onRelink={() => relink(shownId)} />
    </>
  );
}
