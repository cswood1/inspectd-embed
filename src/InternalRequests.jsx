import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Copy, RotateCw, Search, X } from "lucide-react";
import { formatReceived } from "./OrderStore.jsx";
import { RequestProvider, useRequests } from "./RequestStore.jsx";
import {
  Avatar,
  Btn,
  CONTROL_CLS,
  Drawer,
  Empty,
  Field,
  IconBtn,
  OUTCOMES,
  OutcomePill,
  SearchInput,
  SectionHeading,
  STATUSES,
  StatCard,
  StatusPill,
  TD,
  TH,
  copyText,
} from "./InternalUI.jsx";

/*
 * Internal Requests console.
 *
 * Takes inspection requests, looks up the providers covering that area, and
 * lists them. A human works the list — makes the calls, logs notes, and sets an
 * outcome. The surface claims nothing about a provider beyond who they are and
 * how to reach them.
 */

const telHref = (phone) => "tel:" + String(phone).replace(/[^0-9]/g, "");

/* ---- drawer pieces ------------------------------------------ */

function ProviderCard({ p }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="font-semibold text-slate-900">{p.name}</div>
      <dl className="mt-2 flex justify-between gap-6">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Phone
        </dt>
        <dd className="text-sm">
          <a
            href={telHref(p.phone)}
            className="font-medium text-blue-700 hover:text-blue-900"
          >
            {p.phone}
          </a>
        </dd>
      </dl>
    </div>
  );
}

function DuplicateBanner({ job, siblings, onOpenJob }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div>
        {siblings.length === 1 ? "Another job" : `${siblings.length} other jobs`} from{" "}
        {job.customer.email}:{" "}
        {siblings.map((s, i) => (
          <React.Fragment key={s.id}>
            {i > 0 && <span className="text-amber-700">, </span>}
            <button
              onClick={() => onOpenJob(s.id)}
              className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
            >
              {s.vehicle} ({formatReceived(s.receivedAt)})
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function DrawerBody({ job, onClose, onOpenJob }) {
  const { siblingsOf, runAgain, setOutcome, setNotes, contactSheet } = useRequests();
  const [copied, setCopied] = useState(false);
  const siblings = siblingsOf(job.id);
  const running = job.status === "Researching";

  useEffect(() => setCopied(false), [job.id]);

  const doCopy = async () => {
    const ok = await copyText(contactSheet(job.id));
    setCopied(ok ? true : false);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {job.customer.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>
              {job.vehicle}, {job.location} {job.zip}
            </span>
            <StatusPill status={job.status} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Btn variant="primary" onClick={() => runAgain(job.id)} disabled={running}>
            <Search className="h-4 w-4" />
            {running ? "Running…" : "Run again"}
          </Btn>
          <IconBtn onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-base font-semibold text-slate-900">Request</h3>
            <span className="font-mono text-xs text-slate-400">{job.id}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Field label="Email">{job.customer.email}</Field>
            <Field label="Type">{job.serviceLevel}</Field>
            <Field label="Vehicle location">
              {job.location} {job.zip}
            </Field>
            <Field label="Received">{formatReceived(job.receivedAt)}</Field>
          </div>
        </section>

        {siblings.length > 0 && (
          <DuplicateBanner job={job} siblings={siblings} onOpenJob={onOpenJob} />
        )}

        <section>
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-slate-900">Progress</h3>
            <select
              value={job.outcome}
              onChange={(e) => setOutcome(job.id, e.target.value)}
              className={CONTROL_CLS + " py-1.5"}
            >
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <textarea
            rows={4}
            value={job.notes}
            onChange={(e) => setNotes(job.id, e.target.value)}
            placeholder="Internal notes: who you called, what they quoted, when it is booked"
            className={"mt-3 w-full resize-y " + CONTROL_CLS}
          />
          <p className="mt-2.5 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Sent</span> Confirmation of
            job {job.id} to {job.customer.email}
          </p>
        </section>

        <section>
          <SectionHeading
            action={
              <Btn size="sm" onClick={doCopy} disabled={job.providers.length === 0}>
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy contact sheet"}
              </Btn>
            }
          >
            Providers
          </SectionHeading>

          {job.status === "Ready" && (
            <>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {job.providers.length === 0
                  ? `No providers found near ${job.zip || job.location}.`
                  : `${job.providers.length} provider${
                      job.providers.length === 1 ? "" : "s"
                    } found near ${job.zip || job.location}.`}
                {job.ranAt && (
                  <>
                    <br />
                    Last run {formatReceived(job.ranAt)}.
                  </>
                )}
              </p>
              {job.providers.length > 0 && (
                <div className="mt-4 space-y-3">
                  {job.providers.map((p) => (
                    <ProviderCard key={p.name} p={p} />
                  ))}
                </div>
              )}
            </>
          )}

          {(job.status === "Waiting" || job.status === "Researching") && (
            <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              {job.status === "Researching"
                ? "Lookup running. Providers appear here when it finishes."
                : "Queued. The agent has not started this lookup yet."}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* ---- table --------------------------------------------------- */

function Row({ job, duplicate, selected, onOpen, onRun }) {
  return (
    <tr
      onClick={onOpen}
      className={
        "cursor-pointer transition " +
        (selected ? "bg-emerald-50/70" : "hover:bg-slate-50")
      }
    >
      <td className={TD}>
        <div className="flex items-center gap-3">
          <Avatar name={job.customer.name} />
          <div className="min-w-0">
            <div className="font-semibold text-slate-900">{job.customer.name}</div>
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs text-slate-500">{job.customer.email}</span>
              {duplicate && (
                <AlertTriangle
                  className="h-3.5 w-3.5 shrink-0 text-amber-500"
                  aria-label="Another job from this customer"
                />
              )}
            </div>
          </div>
        </div>
      </td>
      <td className={TD + " whitespace-nowrap"}>{job.vehicle}</td>
      <td className={TD + " whitespace-nowrap"}>
        {job.location}
        {job.zip ? `, ${job.zip}` : ""}
      </td>
      <td className={TD + " whitespace-nowrap"}>{job.serviceLevel}</td>
      <td className={TD}>
        <StatusPill status={job.status} />
      </td>
      <td className={TD}>
        <OutcomePill outcome={job.outcome} />
      </td>
      <td className={TD + " text-right tabular-nums"}>
        {job.status === "Ready" ? job.providers.length : "—"}
      </td>
      <td className={TD + " whitespace-nowrap"}>{formatReceived(job.receivedAt)}</td>
      <td className={TD + " text-right"}>
        <Btn
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRun();
          }}
          disabled={job.status === "Researching"}
        >
          <RotateCw className="h-3.5 w-3.5" />
          {job.status === "Researching" ? "Running…" : "Run again"}
        </Btn>
      </td>
    </tr>
  );
}

/* ---- surface ------------------------------------------------- */

function Surface() {
  const { jobs, counts, jobById, runAgain } = useRequests();
  const [filter, setFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  // An address with more than one live job gets flagged in the table.
  const duplicateEmails = useMemo(() => {
    const seen = new Map();
    for (const j of jobs) seen.set(j.customer.email, (seen.get(j.customer.email) || 0) + 1);
    return new Set([...seen].filter(([, n]) => n > 1).map(([e]) => e));
  }, [jobs]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (filter && j.status !== filter) return false;
      if (!q) return true;
      return [j.customer.name, j.customer.email, j.vehicle, j.location, j.zip, j.serviceLevel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [jobs, filter, query]);

  const selected = selectedId ? jobById[selectedId] : null;
  const runQueued = () => jobs.filter((j) => j.status === "Waiting").forEach((j) => runAgain(j.id));

  return (
    <div className="relative h-full overflow-hidden bg-slate-100 font-inter">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-8 py-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Jobs</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                New jobs are researched automatically. Each one lists nearby providers
                with their contact details.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <IconBtn onClick={runQueued} title="Run queued lookups">
                <RotateCw className="h-4 w-4" />
              </IconBtn>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <StatCard
              label="All jobs"
              value={jobs.length}
              active={filter === null}
              onClick={() => setFilter(null)}
            />
            {STATUSES.map((s) => (
              <StatCard
                key={s}
                label={s}
                value={counts[s] || 0}
                active={filter === s}
                onClick={() => setFilter((f) => (f === s ? null : s))}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search customer, email, vehicle, city"
            />
            <span className="shrink-0 text-sm font-medium text-slate-500">
              {rows.length} of {jobs.length}
            </span>
          </div>

          <div className="mt-4">
            {rows.length === 0 ? (
              <Empty>No jobs match the current filter.</Empty>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="w-full">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className={TH}>Customer</th>
                      <th className={TH}>Vehicle</th>
                      <th className={TH}>Location</th>
                      <th className={TH}>Type</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>Outcome</th>
                      <th className={TH + " !text-right"}>Providers</th>
                      <th className={TH}>Received</th>
                      <th className={TH + " !text-right"}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((j) => (
                      <Row
                        key={j.id}
                        job={j}
                        duplicate={duplicateEmails.has(j.customer.email)}
                        selected={selectedId === j.id}
                        onOpen={() => setSelectedId(j.id)}
                        onRun={() => runAgain(j.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer open={!!selected} onClose={() => setSelectedId(null)}>
        {selected && (
          <DrawerBody
            job={selected}
            onClose={() => setSelectedId(null)}
            onOpenJob={setSelectedId}
          />
        )}
      </Drawer>
    </div>
  );
}

export function InternalRequests() {
  return (
    <RequestProvider>
      <Surface />
    </RequestProvider>
  );
}
