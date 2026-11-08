import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { dupEmails } from "./derive.js";
import { STATUS, received, useJobVehicle, isClosed, Icon, Who, ClassTag, SkelRows, CSelect, PageDock, paged, anySelectOpen } from "./ui.jsx";
import { ORDERED_BY, STATUSES, NEXT_STEP, orderedByOf, orderedByLabel, isConsumer, inspectionLabel, dollars } from "./jobModel.js";
import { JobPanel, requester } from "./JobPanel.jsx";
import { refHay } from "./jobRef.js";

/*
 * The jobs board: search, the status chips (with counts), an "ordered by" filter, the sortable table. Mounted as
 * Open jobs or Closed jobs. A row, or its one button in Actions, opens the job panel (JobPanel.jsx).
 */

const COLS = [["ref", "Job"], ["name", "Customer"], ["vehicle", "Vehicle"], ["where", "Location"], ["ordered", "Ordered by"], ["payout", "Payout"], ["status", "Status"], ["created_at", "Requested"]];
const STATUS_ORDER = STATUSES.map(([k]) => k), ORDERED_ORDER = ORDERED_BY.map(([k]) => k);
const place = f => [f.city, (f.state || "").toUpperCase()].filter(Boolean).join(", ");
const colVal = (r, k, vehicle) => ({ref: r.ref || "", name: requester(r).name.toLowerCase(), vehicle: vehicle(r).toLowerCase(), where: place(r.form).toLowerCase(), ordered: ORDERED_ORDER.indexOf(orderedByOf(r)),
  payout: r.payout_cents ?? -1, status: STATUS_ORDER.indexOf(r.status), created_at: r.created_at})[k];
// the status chips: the statuses this board holds, and one for all of them
const OPEN_CARDS = [["all", "All"], ["new", "Submitted"], ["dispatching", "Dispatching"], ["claimed", "Claimed"]];
const CLOSED_CARDS = [["all", "All"], ["complete", "Complete"], ["canceled", "Canceled"]];
// the one button per row: Dispatch ▸ (ink) on a Submitted job, Reopen on a canceled one, Open → on any other
const ACTION = {new: {icon: "play", primary: true}, canceled: {icon: "refresh"}};
const VIEW = {open: "Open jobs", closed: "Closed jobs"};

export function Board({ mode, loaded, onOpenPortal, initialQ = "", initialOpen = null }){
  const closed = mode === "closed";
  const { rows } = usePlatform();
  const vehicle = useJobVehicle();   // a job with a report is named as its report names the car
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState(initialQ);   // ?q= lands with the search already filled in (customers link here)
  const [jf, setJf] = useState({ordered: ""});   // the filter beyond the status cards and search
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
  const orderedOpts = opts("Anyone", ORDERED_ORDER, orderedByLabel, jf.ordered);

  const counts = {all: pool.length}; pool.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const dups = dupEmails(rows);
  const ql = q.trim().toLowerCase();
  const hay = r => [r.form.name, r.form.email, r.form.phone, vehicle(r), place(r.form), r.form.zip, r.form.vin, inspectionLabel(r.form), orderedByLabel(orderedByOf(r)), refHay(r.ref, r.form.customer_ref), r.notes, isConsumer(r) ? "" : r.org?.name].join(" ").toLowerCase();
  const list = pool.filter(r => (filter === "all" || r.status === filter) && (!jf.ordered || orderedByOf(r) === jf.ordered) && (!ql || hay(r).includes(ql)))
    .sort((a, b) => { const x = colVal(a, sortKey, vehicle), y = colVal(b, sortKey, vehicle); return (x < y ? -1 : x > y ? 1 : 0) * sortDir; });
  const pg = list.length ? paged(list, page) : null;
  const anyFilter = jf.ordered || filter !== "all" || ql;

  const pickCard = k => { setFilter(k); setPage(0); };
  const setJ = (k, v) => { setJf(f => ({...f, [k]: v})); setPage(0); };
  const clearAll = () => { setJf({ordered: ""}); setFilter("all"); setQ(""); setPage(0); };
  const sortBy = k => { if (sortKey === k) setSortDir(d => -d); else { setSortKey(k); setSortDir(k === "created_at" ? -1 : 1); } setPage(0); };
  // the row's button: Dispatch opens the panel and starts the provider search, Reopen opens it with the confirm
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
  const viewAll = value => { setOpenId(null); returnFocus.current = null; setJf({ordered: ""}); setFilter("all");
    setSortKey("created_at"); setSortDir(-1); setPage(0); setQ(value); };

  const title = VIEW[mode];
  return (
    <>
      <div className="pad greet">
        <div className="gt"><h1>{title}</h1></div>
      </div>
      <div className="pad">
        <div className="toolbar">
          <div className="search"><Icon name="search" size={14} /><input type="search" ref={searchBox} placeholder="Search reference, customer, vehicle, VIN, city" autoComplete="off" value={q} onChange={e => { setQ(e.target.value); setPage(0); }} /></div>
          <div className="filters" id="statusChips" role="group" aria-label="Status">{cards.map(([k, t]) => (
            <button key={k} type="button" className={`fbtn${filter === k ? " on" : ""}`} data-status={k} aria-pressed={filter === k} disabled={!loaded} onClick={() => pickCard(k)}>
              {t}<span className="n">{loaded ? counts[k] || 0 : ""}</span></button>))}</div>
          <CSelect className={`fsel${jf.ordered ? " on" : ""}`} label="Ordered by" options={orderedOpts} value={jf.ordered} onChange={v => setJ("ordered", v)} />
          <button className={`btn sm${anyFilter ? "" : " hide"}`} onClick={clearAll}>Clear filters</button>
          {loaded && anyFilter ? <span className="chip" id="boardCount">{`${list.length} of ${pool.length}`}</span> : null}
        </div>
      </div>
      <div className="tablewrap">
        {!loaded ? <SkelRows n={6} heads={COLS.map(([, t]) => t).concat(["Actions"])} />
          : !list.length ? (
            <div className="empty"><b>{pool.length ? "Nothing matches" : (closed ? "No closed jobs yet" : "No open jobs")}</b>{pool.length ? "" : (closed ? "Complete and canceled jobs land here." : "Requests arrive from the client portal.")}</div>
          ) : (
            <table className="board">
              <thead><tr>
                {COLS.map(([k, t]) => <th key={k} className={`sortable ${sortKey === k ? "on" : ""}`} onClick={() => sortBy(k)}>{t}<span className="arrow">{sortKey === k ? (sortDir > 0 ? "▲" : "▼") : ""}</span></th>)}
                <th className="r">Actions</th>
              </tr></thead>
              <tbody>
                {pg.slice.map(r => {
                  const f = r.form, [hue, label] = STATUS[r.status] || ["gray", r.status], next = NEXT_STEP[r.status] || "Open", act = ACTION[r.status];
                  // a consumer submitting twice is worth a flag; a business sending a batch is not
                  const dup = isConsumer(r) && dups.has(f.email.toLowerCase())
                    ? <Icon name="warn" size={14} className="warnico" role="img" aria-label="Another request uses this email"><title>Another request uses this email</title></Icon> : null;
                  const w = requester(r);
                  return (
                    <tr key={r.id} className={`row st-${r.status} ${r.id === openId ? "on" : ""}`} data-id={r.id} onClick={() => openOver(r.id)}>
                      <td className="jobcell"><span className="mono">{r.ref}</span>{f.customer_ref ? <span className="cref">{f.customer_ref}</span> : null}</td>
                      <td><Who name={w.name} email={w.sub} extra={dup} /></td>
                      <td className="vehcell">{vehicle(r)}<ClassTag c={f.vehicle_class} /></td>
                      <td className="sub nowrap">{place(f)}</td>
                      <td className="sub nowrap">{orderedByLabel(orderedByOf(r))}</td>
                      <td className="nowrap">{r.payout_cents != null ? dollars(r.payout_cents) : ""}</td>
                      <td><span className={`pill ${hue}`}>{label}</span></td>
                      <td className="sub nowrap" title={new Date(r.created_at).toLocaleString()}>{received(r.created_at)}</td>
                      <td className="r">
                        <button className={`btn sm${act?.primary ? " primary" : ""} rowact`} data-id={r.id} data-act={r.status === "new" ? "dispatch" : r.status === "canceled" ? "reset" : "open"} onClick={e => step(e, r)}>
                          {act ? <><Icon name={act.icon} size={act.icon === "play" ? 11 : 13} />{next}</> : <>{next}<Icon name="next" size={13} /></>}
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
