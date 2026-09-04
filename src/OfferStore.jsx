import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/*
 * Provider offer state for /job/:token.
 *
 * Self-contained: no dependency on OrderStore, though the field names mirror it
 * so the two can be joined later without a rewrite.
 *
 * Persisted to one localStorage key so the dev panel's Reset is a single
 * delete, and synced across tabs via the `storage` event — which is what makes
 * "open two tokens for the same job" actually demonstrate first-claim-wins.
 * Every write goes through commit(), the single writer; the storage listener
 * only ever reads, so the two can't loop.
 */

export const STORAGE_KEY = "inspectd_offers_v1";

/* ---- vocabulary --------------------------------------------- */

export const JOB_STATES = [
  "OPEN",
  "CLAIMED",
  "IN_PROGRESS",
  "SUBMITTED",
  "ACCEPTED",
  "PAID",
];
// Recovery / terminal states outside the happy path.
export const JOB_RECOVERY_STATES = ["REVISION_REQUESTED", "RELEASED", "WITHDRAWN"];

export const TOKEN_STATES = ["ACTIVE", "SUPERSEDED", "DECLINED"];

// Screens that show a single line plus the vehicle summary and nothing else.
export const TERMINAL_KINDS = new Set([
  "NOT_FOUND",
  "DECLINED",
  "SUPERSEDED",
  "WITHDRAWN",
  "CLAIMED_BY_ANOTHER",
]);

export const DECLINE_REASONS = [
  { code: "TOO_FAR", label: "Too far" },
  { code: "TIMING", label: "Timing does not work" },
  { code: "PAYOUT_TOO_LOW", label: "Payout too low" },
  { code: "OUTSIDE_CAPABILITIES", label: "Outside my capabilities" },
  { code: "VEHICLE_TYPE_UNSUPPORTED", label: "Vehicle type not supported" },
  { code: "ALREADY_BOOKED", label: "Already booked" },
];

export function declineLabel(code) {
  return DECLINE_REASONS.find((r) => r.code === code)?.label || code;
}

/* ---- requirements: sections and evidence, not procedure ------ */

export const PRE_PURCHASE = [
  "Exterior walkaround",
  "Interior",
  "Undercarriage",
  "Engine bay",
  "Road test",
  "OBD-II scan",
  "Minimum 100 photos",
  "All warning lights photographed",
];

export const EV_ADDENDUM = [
  "Battery state of health",
  "Charge port condition and function",
];

// What the dev panel Advance button will do next, or null at a dead end.
export const NEXT_STATE = {
  OPEN: "CLAIMED",
  CLAIMED: "IN_PROGRESS",
  IN_PROGRESS: "SUBMITTED",
  REVISION_REQUESTED: "SUBMITTED",
  SUBMITTED: "ACCEPTED",
  ACCEPTED: "PAID",
};

// datetime-local shape, matching what the real submit form produces.
function stubSubmission() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return {
    pdfName: "inspection-report.pdf",
    odometer: 48210,
    photoCount: 104,
    completedAt: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`,
    blockingIssues: "",
  };
}

/* ---- seed ---------------------------------------------------- */

const MIN = 60000;

function iso(ms) {
  return new Date(ms).toISOString();
}

export function buildSeed(now = Date.now()) {
  return {
    version: 2,
    providers: {
      pro_kestrel: {
        id: "pro_kestrel",
        name: "Kestrel Mobile Inspection",
        phone: "(303) 555-0164",
      },
      pro_ridgeline: {
        id: "pro_ridgeline",
        name: "Ridgeline Vehicle Assessment",
        phone: "(303) 555-0131",
      },
    },
    jobs: {
      "JOB-4471": {
        id: "JOB-4471",
        state: "OPEN",
        vehicle: {
          year: 2021,
          make: "Toyota",
          model: "RAV4",
          trim: "XLE Hybrid AWD",
          vin: "2T3W1RFV5MW128841",
        },
        service: {
          name: "Pre-purchase inspection",
          evAddendum: false,
          requirements: [...PRE_PURCHASE],
        },
        city: "Aurora",
        state_: "CO",
        zip: "80011",
        address: "16820 E Colfax Ave, Aurora, CO 80011",
        distanceMi: 6,
        window: "Thu Sep 4, 8:00 AM – 12:00 PM",
        payout: 160,
        contact: { name: "Dana Whitfield", phone: "(303) 555-0117" },
        claimedBy: null,
        claimedAt: null,
        startedAt: null,
        submittedAt: null,
        acceptedAt: null,
        paidAt: null,
        submission: null,
        revisionNotes: null,
        log: [{ at: iso(now - 12 * MIN), event: "Offer sent" }],
      },
      "JOB-4472": {
        id: "JOB-4472",
        state: "OPEN",
        vehicle: {
          year: 2022,
          make: "Tesla",
          model: "Model Y",
          trim: "Performance",
          vin: "7SAYGDEF5NF000789",
        },
        service: {
          name: "Pre-purchase inspection",
          evAddendum: true,
          requirements: [...PRE_PURCHASE, ...EV_ADDENDUM],
        },
        city: "Denver",
        state_: "CO",
        zip: "80202",
        address: "1801 California St, Denver, CO 80202",
        distanceMi: 11,
        window: "Fri Sep 5, 1:00 PM – 5:00 PM",
        payout: 300,
        contact: { name: "Marcus Bell", phone: "(303) 555-0182" },
        claimedBy: null,
        claimedAt: null,
        startedAt: null,
        submittedAt: null,
        acceptedAt: null,
        paidAt: null,
        submission: null,
        revisionNotes: null,
        log: [{ at: iso(now - 26 * MIN), event: "Offer sent" }],
      },
      "JOB-4473": {
        id: "JOB-4473",
        state: "OPEN",
        vehicle: {
          year: 2021,
          make: "Ford",
          model: "F-150",
          trim: "Lariat SuperCrew 4x4",
          vin: "1FTFW1E84MFA90765",
        },
        service: {
          name: "Pre-purchase inspection",
          evAddendum: false,
          requirements: [...PRE_PURCHASE],
        },
        city: "Lakewood",
        state_: "CO",
        zip: "80226",
        address: "7150 W Alameda Ave, Lakewood, CO 80226",
        distanceMi: 14,
        window: "Sat Sep 6, 9:00 AM – 1:00 PM",
        payout: 244,
        contact: { name: "Priya Raghunathan", phone: "(720) 555-0143" },
        claimedBy: null,
        claimedAt: null,
        startedAt: null,
        submittedAt: null,
        acceptedAt: null,
        paidAt: null,
        submission: null,
        revisionNotes: null,
        log: [{ at: iso(now - 3 * 60 * MIN), event: "Offer sent" }],
      },
    },
    tokens: {
      // The two-tab pair — same job, two providers.
      t_k4rav: { jobId: "JOB-4471", providerId: "pro_kestrel", state: "ACTIVE" },
      t_r9rav: { jobId: "JOB-4471", providerId: "pro_ridgeline", state: "ACTIVE" },
      t_k2tsl: { jobId: "JOB-4472", providerId: "pro_kestrel", state: "ACTIVE" },
      t_r7f15: { jobId: "JOB-4473", providerId: "pro_ridgeline", state: "ACTIVE" },
      // Pre-set so the superseded screen is reachable without the dev panel.
      t_r3sup: { jobId: "JOB-4472", providerId: "pro_ridgeline", state: "SUPERSEDED" },
    },
  };
}

function hashCode(s) {
  let h = 0;
  const str = String(s ?? "");
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const mintToken = (seed) => "t_" + hashCode(seed).toString(36).slice(0, 7);

/* ---- persistence --------------------------------------------- */

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 2 && parsed.jobs && parsed.tokens) return parsed;
  } catch {
    // fall through to a fresh seed
  }
  return null;
}

function writeStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable; state stays in memory for this tab.
  }
}

/* ---- resolution ---------------------------------------------- */

/*
 * Claimed-by-another is DERIVED, never stored. A claim writes only
 * job.claimedBy; sibling tokens stay ACTIVE and their screen is computed here.
 * That means a release reopens every other token for free.
 *
 * First match wins.
 */
export function resolveToken(state, tokenId) {
  const token = state.tokens[tokenId];
  if (!token) return { kind: "NOT_FOUND", tokenId };

  const job = state.jobs[token.jobId];
  if (!job) return { kind: "NOT_FOUND", tokenId };

  /*
   * A seeded token names its provider. A token minted by Dispatch is one link
   * sent to everyone, so it carries no provider and the token itself is the
   * claimant identity — otherwise whoever claimed would read their own claim
   * back as CLAIMED_BY_ANOTHER.
   */
  const provider = token.providerId ? state.providers[token.providerId] : null;
  const claimant = token.providerId || tokenId;
  const base = { tokenId, token, job, provider, claimant };

  if (token.state === "DECLINED") return { kind: "DECLINED", ...base };
  if (token.state === "SUPERSEDED") return { kind: "SUPERSEDED", ...base };
  if (job.state === "WITHDRAWN") return { kind: "WITHDRAWN", ...base };
  if (job.state === "OPEN") return { kind: "OFFERED", ...base };
  if (job.claimedBy !== claimant) return { kind: "CLAIMED_BY_ANOTHER", ...base };
  if (job.state === "CLAIMED") return { kind: "CLAIMED_BY_YOU", ...base };

  // IN_PROGRESS | SUBMITTED | REVISION_REQUESTED | ACCEPTED | PAID
  return { kind: job.state, ...base };
}

export function vinLast6(vin) {
  return String(vin || "").slice(-6);
}

export function vehicleLine(v) {
  if (!v) return "";
  // Dispatched jobs carry the console vehicle string; seeded ones decompose.
  if (v.label) return v.label;
  return `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}`;
}

/* ---- provider ------------------------------------------------ */

const OfferContext = createContext(null);

export function OfferStoreProvider({ children }) {
  const [state, setState] = useState(() => readStorage() || buildSeed());
  const stateRef = useRef(state);

  // Single writer. Everything that mutates goes through here, so the storage
  // listener below can be read-only and the two never loop.
  const commit = (next) => {
    stateRef.current = next;
    setState(next);
    writeStorage(next);
  };

  // Seed the key on first run so a second tab opened later reads the same data.
  useEffect(() => {
    if (!readStorage()) writeStorage(stateRef.current);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      const next = readStorage();
      if (!next) return;
      stateRef.current = next;
      setState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* -- mutation helpers -- */

  // Re-read storage first so a claim races correctly against another tab.
  const current = () => readStorage() || stateRef.current;

  const withJob = (s, jobId, patch, event) => {
    const job = s.jobs[jobId];
    return {
      ...s,
      jobs: {
        ...s.jobs,
        [jobId]: {
          ...job,
          ...patch,
          log: event
            ? [...(job.log || []), { at: new Date().toISOString(), event }]
            : job.log,
        },
      },
    };
  };

  const withToken = (s, tokenId, patch) => ({
    ...s,
    tokens: { ...s.tokens, [tokenId]: { ...s.tokens[tokenId], ...patch } },
  });

  /* -- actions -- */

  // First claim wins. Returns a result rather than throwing so the UI can show
  // the losing tab why it failed.
  const claim = (tokenId, phone = null) => {
    const s = current();
    const token = s.tokens[tokenId];
    if (!token) return { ok: false, reason: "NOT_FOUND" };
    const job = s.jobs[token.jobId];
    if (!job) return { ok: false, reason: "NOT_FOUND" };
    if (job.state !== "OPEN") return { ok: false, reason: "ALREADY_CLAIMED" };

    const claimant = token.providerId || tokenId;
    const who = s.providers[token.providerId]?.name || phone || "a provider";
    const at = new Date().toISOString();
    commit(
      withJob(
        s,
        job.id,
        { state: "CLAIMED", claimedBy: claimant, claimedAt: at, claimedByPhone: phone },
        `Claimed by ${who}`
      )
    );
    return { ok: true };
  };

  const decline = (tokenId, reason, note = "") => {
    const s = current();
    if (!s.tokens[tokenId]) return { ok: false, reason: "NOT_FOUND" };
    commit(
      withToken(s, tokenId, {
        state: "DECLINED",
        declineReason: reason,
        declineNote: note,
        declinedAt: new Date().toISOString(),
      })
    );
    return { ok: true };
  };

  /*
   * Release returns the job to OPEN and marks the releasing token DECLINED, so
   * the provider who gave it back does not immediately see it as claimable.
   * Every other token flips out of claimed-by-another on its own, because that
   * view is derived.
   */
  const release = (tokenId, reason, note = "") => {
    const s = current();
    const token = s.tokens[tokenId];
    if (!token) return { ok: false, reason: "NOT_FOUND" };
    const job = s.jobs[token.jobId];
    const claimant = token.providerId || tokenId;
    if (!job || job.claimedBy !== claimant) {
      return { ok: false, reason: "NOT_YOURS" };
    }
    const reopened = withJob(
      s,
      job.id,
      { state: "OPEN", claimedBy: null, claimedAt: null, claimedByPhone: null, startedAt: null },
      `Released by ${s.providers[token.providerId]?.name || token.providerId} — ${declineLabel(reason)}`
    );
    commit(
      withToken(reopened, tokenId, {
        state: "DECLINED",
        declineReason: reason,
        declineNote: note,
        releasedAt: new Date().toISOString(),
      })
    );
    return { ok: true };
  };

  const start = (jobId) => {
    const s = current();
    if (s.jobs[jobId]?.state !== "CLAIMED") return { ok: false };
    commit(
      withJob(
        s,
        jobId,
        { state: "IN_PROGRESS", startedAt: new Date().toISOString() },
        "Inspection started"
      )
    );
    return { ok: true };
  };

  const submit = (jobId, submission) => {
    const s = current();
    const job = s.jobs[jobId];
    if (!job || !["IN_PROGRESS", "REVISION_REQUESTED"].includes(job.state)) {
      return { ok: false };
    }
    const at = new Date().toISOString();
    commit(
      withJob(
        s,
        jobId,
        {
          state: "SUBMITTED",
          submittedAt: at,
          submission: { ...submission, submittedAt: at },
          revisionNotes: null,
        },
        job.state === "REVISION_REQUESTED" ? "Report resubmitted" : "Report submitted"
      )
    );
    return { ok: true };
  };

  const requestRevision = (jobId, notes) => {
    const s = current();
    if (s.jobs[jobId]?.state !== "SUBMITTED") return { ok: false };
    commit(
      withJob(
        s,
        jobId,
        { state: "REVISION_REQUESTED", revisionNotes: notes },
        "Revision requested"
      )
    );
    return { ok: true };
  };

  const accept = (jobId) => {
    const s = current();
    if (s.jobs[jobId]?.state !== "SUBMITTED") return { ok: false };
    commit(
      withJob(
        s,
        jobId,
        { state: "ACCEPTED", acceptedAt: new Date().toISOString() },
        "Report accepted"
      )
    );
    return { ok: true };
  };

  const pay = (jobId) => {
    const s = current();
    if (s.jobs[jobId]?.state !== "ACCEPTED") return { ok: false };
    commit(
      withJob(s, jobId, { state: "PAID", paidAt: new Date().toISOString() }, "Payout sent")
    );
    return { ok: true };
  };

  /*
   * Dev-panel only: step a job along the happy path. Token-scoped rather than
   * job-scoped because OPEN -> CLAIMED needs to know which provider is
   * claiming, and that only exists on the token.
   */
  const advance = (tokenId) => {
    const s = current();
    const token = s.tokens[tokenId];
    const job = token && s.jobs[token.jobId];
    if (!job) return { ok: false, reason: "NOT_FOUND" };
    switch (job.state) {
      case "OPEN":
        return claim(tokenId);
      case "CLAIMED":
        return start(job.id);
      case "IN_PROGRESS":
      case "REVISION_REQUESTED":
        return submit(job.id, stubSubmission());
      case "SUBMITTED":
        return accept(job.id);
      case "ACCEPTED":
        return pay(job.id);
      default:
        return { ok: false, reason: "TERMINAL" };
    }
  };

  /*
   * Dispatch mints ONE link for the job rather than one per provider. The
   * offer job is COPIED, not referenced — /job/:token renders standalone and
   * must never need RequestStore mounted.
   *
   * Idempotent: dispatching a job that already has a live link returns the
   * existing one instead of minting a second.
   */
  const dispatch = (draft) => {
    const s = current();
    const jobId = "OFR-" + String(draft.sourceId).replace(/[^A-Za-z0-9]/g, "");
    const tokenId = mintToken(jobId);
    if (s.tokens[tokenId] && s.jobs[jobId]) return { ok: true, tokenId, existing: true };

    const at = new Date().toISOString();
    const isEv = /\bEV\b/.test(draft.serviceLevel || "");
    const next = {
      ...s,
      jobs: {
        ...s.jobs,
        [jobId]: {
          id: jobId,
          state: "OPEN",
          sourceId: draft.sourceId,
          // The console has no VIN or trim breakdown, so the offer screen
          // renders the vehicle string it does have.
          vehicle: { label: draft.vehicleLabel, vin: null },
          service: {
            name: draft.serviceLevel,
            evAddendum: isEv,
            requirements: isEv ? [...PRE_PURCHASE, ...EV_ADDENDUM] : [...PRE_PURCHASE],
          },
          city: draft.city,
          state_: draft.state_,
          zip: draft.zip,
          // Street address, distance and time window are not in the console
          // model. Omitted rather than invented; the offer screen degrades.
          address: null,
          distanceMi: null,
          window: null,
          payout: draft.payout,
          contact: { name: draft.contactName, email: draft.contactEmail, phone: null },
          claimedBy: null,
          claimedAt: null,
          claimedByPhone: null,
          startedAt: null,
          submittedAt: null,
          acceptedAt: null,
          paidAt: null,
          submission: null,
          revisionNotes: null,
          log: [{ at, event: "Dispatched from the internal console" }],
        },
      },
      tokens: {
        ...s.tokens,
        [tokenId]: { jobId, providerId: null, state: "ACTIVE", dispatchedAt: at },
      },
    };
    commit(next);
    return { ok: true, tokenId, existing: false };
  };

  // What the console needs to show: is this job already out, and to whom.
  const findDispatch = (sourceId) => {
    const jobId = "OFR-" + String(sourceId).replace(/[^A-Za-z0-9]/g, "");
    const tokenId = mintToken(jobId);
    const job = state.jobs[jobId];
    if (!job || !state.tokens[tokenId]) return null;
    return { tokenId, job, token: state.tokens[tokenId] };
  };

  const withdraw = (jobId) => {
    const s = current();
    if (!s.jobs[jobId]) return { ok: false };
    commit(withJob(s, jobId, { state: "WITHDRAWN" }, "Withdrawn by requestor"));
    return { ok: true };
  };

  const resetAll = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    commit(buildSeed());
    return { ok: true };
  };

  const value = useMemo(
    () => ({
      state,
      resolve: (tokenId) => resolveToken(state, tokenId),
      claim,
      decline,
      release,
      start,
      submit,
      requestRevision,
      accept,
      pay,
      withdraw,
      advance,
      dispatch,
      findDispatch,
      resetAll,
    }),
    // The action closures read live storage anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  );

  return <OfferContext.Provider value={value}>{children}</OfferContext.Provider>;
}

export function useOffers() {
  const ctx = useContext(OfferContext);
  if (!ctx) throw new Error("useOffers must be used inside <OfferStoreProvider>");
  return ctx;
}
