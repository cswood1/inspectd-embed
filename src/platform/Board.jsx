import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { dupEmails } from "./derive.js";
import { STATUS, received, vehicle, isClosed, Icon, Who, ClassTag, Sk, SkelRows, SkelCards, CSelect, PageDock, paged, anySelectOpen } from "./ui.jsx";
import { INSPECTION_TYPES, STATUSES, NEXT_STEP, typeLabel, inspectionLabel, dollars } from "./jobModel.js";
import { JobPanel, requester } from "./JobPanel.jsx";

/*
 * The jobs board: status cards, search and an inspection-type filter, the sortable table. Mounted as
 * Open jobs or Closed jobs. A row, or its next-step button, opens the job panel (JobPanel.jsx).
 */

const COLS = [["name", "Customer"], ["vehicle", "Vehicle"], ["where", "Location"], ["type", "Inspection"], ["payout", "Payout"], ["status", "Status"], ["created_at", "Received"]];
const STATUS_ORDER = STATUSES.map(([k]) => k);
const place = f => [f.city, (f.state || "").toUpperCase()].filter(Boolean).join(", ");
const colVal = (r, k) => ({name: requester(r).name.toLowerCase(), vehicle: vehicle(r.form).toLowerCase(), where: place(r.form).toLowerCase(), type: typeLabel(r.form.inspection_type),
  payout: r.payout_cents ?? -1, status: STATUS_ORDER.indexOf(r.status), created_at: r.created_at})[k];
// the cards along the top: the statuses this board holds, and a card for all of them
const OPEN_CARDS = [["all", "All open"], ["new", "New"], ["dispatching", "Dispatching"], ["claimed", "Claimed"]];
const CLOSED_CARDS = [["all", "All closed"], ["complete", "Complete"], ["canceled", "Canceled"]];
const VIEW = {
  open: ["Open jobs", "Jobs still being worked, newest first. New jobs need providers; Dispatching jobs have a live job link; Claimed jobs have a provider."],
  closed: ["Closed jobs", "Complete and canceled jobs. A canceled job can be reset to New and dispatched again."],
};

export function Board({ mode, loaded, onRefresh, onOpenPortal, initialQ = "", initialOpen = null }){
  const closed = mode === "closed";
  const { rows } = usePlatform();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState(initialQ);   // ?q= lands with the search already filled in (customers link here)
  const [jf, setJf] = useState({type: ""});   // the filter beyond the status cards and search
  const [sortKey, setSortKey] = useState("created_at"), [sortDir, setSortDir] = useState(-1);
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState(null);
  // the panel keeps the last job drawn after it closes, as Kavin's does: it slides out with its content,
  // and the next job opens in the same body, scrolled where the last one was left
  const [shownId, setShownId] = useState(null);
  // what a next-step button asked the panel to do as it opens: start the search, or ask to reset
  const [intent, setIntent] = useState(null);
  const returnFocus = useRef(null), closeBtn = useRef(null), searchBox = useRef(null);

  const pool = useMemo(() => loaded ? rows.filter(r => closed ? isClosed(r) : !isClosed(r)) : [], [rows, loaded, closed]);
  const cards = closed ? CLOSED_CARDS : OPEN_CARDS;

  // a chosen filter stays chosen even when nothing matches it any more, or the board would quietly widen itself
  const opts = (label, values, fmtv, cur) => [{value: "", label}, ...(cur && !values.includes(cur) ? [...values, cur] : values).map(v => ({value: v, label: fmtv ? fmtv(v) : v}))];
  const typeOpts = opts("Any type", INSPECTION_TYPES.map(([k]) => k), typeLabel, jf.type);

  const counts = {all: pool.length}; pool.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const dups = dupEmails(rows);
  const ql = q.trim().toLowerCase();
  const hay = r => [r.form.name, r.form.email, r.form.phone, vehicle(r.form), place(r.form), r.form.zip, r.form.vin, inspectionLabel(r.form), r.id, r.notes, r.org?.name].join(" ").toLowerCase();
  const list = pool.filter(r => (filter === "all" || r.status === filter) && (!jf.type || r.form.inspection_type === jf.type) && (!ql || hay(r).includes(ql)))
    .sort((a, b) => { const x = colVal(a, sortKey), y = colVal(b, sortKey); return (x < y ? -1 : x > y ? 1 : 0) * sortDir; });
  const pg = list.length ? paged(list, page) : null;
  const anyFilter = jf.type || filter !== "all" || ql;

  const pickCard = k => { setFilter(k); setPage(0); };
  const setJ = (k, v) => { setJf(f => ({...f, [k]: v})); setPage(0); };
  const clearAll = () => { setJf({type: ""}); setFilter("all"); setQ(""); setPage(0); };
  const sortBy = k => { if (sortKey === k) setSortDir(d => -d); else { setSortKey(k); setSortDir(k === "created_at" ? -1 : 1); } setPage(0); };
  // the next-step button: "Find providers" opens the panel and starts the search, "Reset" opens it with the confirm
  const STEP_ACTION = {new: "search", canceled: "reset"};
  const step = (e, r) => { e.stopPropagation(); openOver(r.id); if (STEP_ACTION[r.status]) setIntent({id: r.id, action: STEP_ACTION[r.status], n: Date.now()}); };

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
  const viewAll = value => { setOpenId(null); returnFocus.current = null; setJf({type: ""}); setFilter("all");
    setSortKey("created_at"); setSortDir(-1); setPage(0); setQ(value); };

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
          <div className="search"><Icon name="search" size={14} /><input type="search" ref={searchBox} placeholder="Search customer, vehicle, VIN, city" autoComplete="off" value={q} onChange={e => { setQ(e.target.value); setPage(0); }} /></div>
          <CSelect className={`fsel${jf.type ? " on" : ""}`} label="Inspection type" options={typeOpts} value={jf.type} onChange={v => setJ("type", v)} />
          <button className={`btn sm${anyFilter ? "" : " hide"}`} onClick={clearAll}>Clear filters</button>
          <span className="chip">{loaded ? `${list.length} of ${pool.length}` : <Sk w={54} h={12} />}</span>
        </div>
      </div>
      <div className="tablewrap">
        {!loaded ? <SkelRows n={6} heads={COLS.map(([, t]) => t).concat([""])} />
          : !list.length ? (
            <div className="empty"><b>{pool.length ? "Nothing matches" : (closed ? "No closed jobs yet" : "No open jobs")}</b>{pool.length ? "" : (closed ? "Complete and canceled jobs land here." : "Requests arrive from the client portal.")}</div>
          ) : (
            <table className="board">
              <thead><tr>
                {COLS.map(([k, t]) => <th key={k} className={`sortable ${sortKey === k ? "on" : ""}`} onClick={() => sortBy(k)}>{t}<span className="arrow">{sortKey === k ? (sortDir > 0 ? "▲" : "▼") : ""}</span></th>)}
                <th className="r"></th>
              </tr></thead>
              <tbody>
                {pg.slice.map(r => {
                  const f = r.form, [hue, label] = STATUS[r.status] || ["gray", r.status], next = NEXT_STEP[r.status] || "View";
                  // a walk-in customer submitting twice is worth a flag; a workspace sending a batch is not
                  const dup = !r.org && dups.has(f.email.toLowerCase())
                    ? <Icon name="warn" size={14} className="warnico" role="img" aria-label="Another request uses this email"><title>Another request uses this email</title></Icon> : null;
                  const w = requester(r);
                  return (
                    <tr key={r.id} className={`row st-${r.status} ${r.id === openId ? "on" : ""}`} data-id={r.id} onClick={() => openOver(r.id)}>
                      <td><Who name={w.name} email={w.sub} extra={dup} /></td>
                      <td className="nowrap">{vehicle(f)}<ClassTag c={f.vehicle_class} /></td>
                      <td className="sub nowrap">{place(f)}</td>
                      <td className="sub nowrap">{typeLabel(f.inspection_type)}</td>
                      <td className="nowrap">{r.payout_cents != null ? dollars(r.payout_cents) : ""}</td>
                      <td><span className={`pill ${hue}`}>{label}</span></td>
                      <td className="sub nowrap" title={new Date(r.created_at).toLocaleString()}>{received(r.created_at)}</td>
                      <td className="r">
                        <button className={`btn sm ${r.status === "new" ? "primary" : ""} rowact`} data-id={r.id} onClick={e => step(e, r)}>
                          {next}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
      <PageDock pg={pg} rowSelector=".tablewrap tbody tr.row" onChange={d => setPage(p => p + d)} />
      <JobPanel row={rows.find(r => r.id === shownId) || null} rows={rows} open={!!openId} closeRef={closeBtn} intent={intent}
        onClose={closeOver} onViewAll={viewAll} onOpenPortal={onOpenPortal} />
    </>
  );
}
