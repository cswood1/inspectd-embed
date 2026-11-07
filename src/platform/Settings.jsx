import React, { useEffect, useRef, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { fmt, ROLE, Icon, Who, Pill, Sk, SkelRows, SkelKv, CSelect, Pager, paged, useToast, useAsk } from "./ui.jsx";
import { PORTAL } from "./seed.js";

/*
 * Settings: workspaces and their teams, who reaches this console, your own account, and how this
 * deployment is set up. A port of inspection-requests/ui/settings-client. One pane at a time, chosen
 * from the rail; the console is SUPER-only, so this page acts as owner of every workspace.
 *
 * Kavin's page fetches the workspaces, the team and the team-access list each time it opens, so the
 * tables pulse first; the mock waits as long as a fetch would. Your account and the deployment are
 * already in hand when the page opens, so they draw at once.
 */

// key, label, and the one line that says what is in it
const SECTIONS = [
  ["workspaces", "Workspaces", "Clients and their teams"],
  ["access", "Team access", "Who reaches this console"],
  ["account", "Your account", "Your name and sign-in"],
  ["system", "This deployment", "What is switched on"],
];
const FETCH_MS = 300;
const stay = e => e.preventDefault();
const onOff = on => <Pill hue={on ? "green" : "gray"}>{on ? "On" : "Off"}</Pill>;
// what to say when an email did not go: the reason, not "off"
const notSent = entry => !entry || !entry.error ? "" : entry.error.includes("RESEND_API_KEY") ? "Email is off on this server" : "The email could not be sent: " + entry.error.replace(/^HTTP \d+: /, "").slice(0, 160);

// the box for an invitation whose email did not go: the link is the only way to deliver it
function LinkNote({ note, toast }){
  if (!note) return <div className="invnote hide"></div>;
  return (
    <div className="invnote"><Icon name="warn" size={14} />{` ${notSent(note.entry) || "Not emailed"}, so send this link to `}<b>{note.email}</b>{" yourself: "}
      <span className="mono">{note.link}</span>{" "}<button className="btn sm copylink" onClick={() => navigator.clipboard.writeText(note.link).then(() => toast("Invite link copied"))}><Icon name="copy" size={13} /> Copy link</button></div>
  );
}

export function Settings({ onOpenPortal }){
  const { auth, rows, meta } = usePlatform();
  const toast = useToast(), ask = useAsk();   // the in-page confirm() and prompt() (ui.jsx Dialog)
  const [pane, setPane] = useState("workspaces");
  const [orgsReady, setOrgsReady] = useState(false), [teamReady, setTeamReady] = useState(false), [supersReady, setSupersReady] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [mpage, setMpage] = useState(0), [ipage, setIpage] = useState(0);
  const [invEmail, setInvEmail] = useState(""), [invRole, setInvRole] = useState("USER"), [inverr, setInverr] = useState(""), [invBusy, setInvBusy] = useState(false), [invNote, setInvNote] = useState(null);
  const [supEmail, setSupEmail] = useState(""), [superr, setSuperr] = useState(""), [supBusy, setSupBusy] = useState(false), [supNote, setSupNote] = useState(null);
  const [renaming, setRenaming] = useState(false), [nameDraft, setNameDraft] = useState("");
  const timers = useRef([]), invInput = useRef(null), supInput = useRef(null), nameInput = useRef(null);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // what each pane fetches the first time it is shown on this visit
  useEffect(() => {
    if ((pane === "workspaces" || pane === "system") && !orgsReady) later(() => { setOrgsReady(true); if (pane === "workspaces") later(() => setTeamReady(true), FETCH_MS / 2); }, FETCH_MS);
    if (pane === "workspaces" && orgsReady && !teamReady) later(() => setTeamReady(true), FETCH_MS / 2);
    if (pane === "access" && !supersReady) later(() => setSupersReady(true), FETCH_MS);
  }, [pane]);
  useEffect(() => { if (renaming) nameInput.current?.focus(); }, [renaming]);

  const orgs = orgsReady ? auth.listOrgs() : [];
  const current = orgs.some(o => o.org.id === orgId) ? orgId : orgs[0]?.org.id || "";
  const team = teamReady && current ? auth.members(current) : null;
  const supers = supersReady ? auth.supers() : null;
  const me = auth.me();
  const fail = e => toast(e.message);
  const pickOrg = id => { setOrgId(id); setMpage(0); setIpage(0); setTeamReady(false); later(() => setTeamReady(true), FETCH_MS / 2); };

  /* ---------- workspaces and teams ---------- */
  const rename = async () => {
    const cur = orgs.find(o => o.org.id === current)?.org.name || "";
    const name = await ask({title: "Workspace name", input: {value: cur, maxlength: 80}});
    if (!name || name.trim() === cur) return;
    try { auth.renameOrg(current, name.trim()); toast("Renamed"); } catch (e) { fail(e); }
  };
  const invite = e => {
    e.preventDefault();
    const email = invEmail.trim();
    setInverr(""); setInvNote(null);
    if (!email.includes("@")) { setInverr("Enter an email address."); invInput.current?.focus(); return; }
    setInvBusy(true);
    try {
      const r = auth.invite(current, email, invRole);
      setInvEmail("");
      if (r.email?.sent) toast(`Invitation emailed to ${email}`, {ms: 3500});
      else { setInvNote({email, entry: r.email, link: r.link}); toast("Invitation created; copy the link below", {kind: "warn", ms: 5000}); }
    } catch (err) { setInverr(err.message); }
    finally { setInvBusy(false); }
  };
  const setRole = (uid, role) => { try { auth.setRole(current, uid, role); toast("Role updated"); } catch (e) { fail(e); } };
  const removeMember = async (uid, name, orgName) => {
    if (!await ask({title: `Remove ${name} from ${orgName}?`, danger: true})) return;
    try { auth.removeMember(current, uid); toast("Removed"); } catch (e) { fail(e); }
  };
  const revoke = (oid, iid) => { try { auth.revokeInvitation(oid, iid); toast("Invitation revoked"); } catch (e) { fail(e); } };

  /* ---------- team access ---------- */
  const grantSuper = e => {
    e.preventDefault();
    const email = supEmail.trim();
    setSuperr(""); setSupNote(null);
    if (!email.includes("@")) { setSuperr("Enter an email address."); supInput.current?.focus(); return; }
    setSupBusy(true);
    try {
      const r = auth.inviteTeam(email);
      setSupEmail("");
      if (r.granted) toast(`${email} has team access now`, {ms: 3500});
      else if (r.email?.sent) toast(`Invitation emailed to ${email}`, {ms: 3500});
      else { setSupNote({email, entry: r.email, link: r.link}); toast("Invitation created; copy the link below", {kind: "warn", ms: 5000}); }
    } catch (err) { setSuperr(err.message); }
    finally { setSupBusy(false); }
  };
  const removeSuper = async (uid, name) => {
    if (!await ask({title: `Take team access away from ${name}? They keep their own workspace.`, danger: true})) return;
    try { auth.revokeSuper(uid); toast("Team access removed"); } catch (e) { fail(e); }
  };

  /* ---------- your account ---------- */
  const saveName = () => {
    const name = nameDraft.trim();
    if (!name) { toast("Enter a name"); return; }
    try { auth.updateMe(name); setRenaming(false); toast("Name changed"); } catch (e) { fail(e); }
  };

  /* ---------- panes ---------- */
  const workspaces = () => {
    const o = team?.org, mp = team ? paged(team.members, mpage) : null, ip = team ? paged(team.invitations, ipage) : null;
    return (
      <section className={`pane${pane === "workspaces" ? "" : " hide"}`} id="pane-workspaces">
        <div className="sechead"><h2>Workspaces</h2><span className="secnote">Every client company is a workspace. Owners and admins invite their own people; from here you can do it for them.</span></div>
        <div className="teambar">
          <CSelect label="Workspace" disabled={!orgsReady} value={orgsReady ? current : "loading"} onChange={pickOrg}
            options={orgsReady ? orgs.map(x => ({value: x.org.id, label: `${x.org.name} (${x.member_count})`})) : [{value: "loading", label: "Loading workspaces"}]} />
          <span className="chip" id="orgmeta">{!team ? (orgsReady && !current ? "" : <Sk w={150} h={12} />) : o ? <><span className="mono">{`/${o.slug}`}</span>{` · created ${fmt(o.created_at)}`}</> : ""}</span>
          <button className="btn sm" id="renamebtn" disabled={!orgsReady || !current} onClick={rename}>Rename</button>
          <span className="sp"></span>
          <span className="chip" id="orgempty">{orgsReady && !orgs.length ? "No workspaces yet. The first sign-up on the landing page creates one." : ""}</span>
        </div>
        <div className="tablewrap" id="members">
          {!team ? (orgsReady && !current ? null : <SkelRows n={3} heads={["Member", "Role", "Joined", "Sign-in", ""]} extraCls="team" />) : (<>
            <table className="team"><thead><tr><th>Member</th><th>Role</th><th>Joined</th><th>Sign-in</th><th className="r"></th></tr></thead><tbody>
              {mp.slice.map(m => (
                <tr key={m.user.id}>
                  <td><Who name={m.user.name} email={m.user.is_super ? `${m.user.email} ` : m.user.email} extra={m.user.is_super ? <Pill hue="blue">Inspectd team</Pill> : null} /></td>
                  <td><CSelect className="rolesel" label="Role" value={m.role} onChange={v => setRole(m.user.id, v)} options={Object.entries(ROLE).map(([k, [, t]]) => ({value: k, label: t}))} /></td>
                  <td className="sub">{fmt(m.joined_at)}</td>
                  <td className="sub">{[m.user.has_password ? "Password" : "", m.user.google_linked ? "Google" : ""].filter(Boolean).join(", ") || "Not yet"}</td>
                  <td className="r"><button className="btn sm danger rm" onClick={() => removeMember(m.user.id, m.user.name || m.user.email, o.name)}><Icon name="trash" size={13} /> Remove</button></td>
                </tr>))}
            </tbody></table>
            <Pager p={mp} onChange={d => setMpage(mp.page + d)} />
          </>)}
        </div>
        <form className="inviterow" id="inviteform" noValidate onSubmit={invite}>
          <input ref={invInput} id="invemail" type="email" placeholder="name@company.com" autoComplete="off" aria-label="Email to invite" value={invEmail} onChange={e => setInvEmail(e.target.value)} />
          <CSelect label="Role" value={invRole} onChange={setInvRole} options={[{value: "USER", label: "User"}, {value: "ADMIN", label: "Admin"}, {value: "OWNER", label: "Owner"}]} />
          <button className="btn primary sm" type="submit" id="invbtn" disabled={!orgsReady || !current || invBusy}>Send invite</button>
          <span className="err" id="inverr">{inverr}</span>
        </form>
        <LinkNote note={invNote} toast={toast} />
        <div className="sechead sub"><h3>Pending invitations</h3></div>
        <div className="tablewrap" id="invites">
          {!team ? (orgsReady && !current ? null : <SkelRows n={2} heads={["Invited", "Role", "Sent", "Expires", ""]} extraCls="team" />)
            : team.invitations.length ? (<>
              <table className="team"><thead><tr><th>Invited</th><th>Role</th><th>Sent</th><th>Expires</th><th className="r"></th></tr></thead><tbody>
                {ip.slice.map(i => { const [hue, label] = ROLE[i.role] || ["gray", i.role]; return (
                  <tr key={i.id}><td>{i.email}</td><td><Pill hue={hue}>{label}</Pill></td><td className="sub">{fmt(i.created_at)}</td><td className="sub">{fmt(i.expires_at)}</td>
                    <td className="r"><button className="btn sm rv" onClick={() => revoke(current, i.id)}>Revoke</button></td></tr>); })}
              </tbody></table>
              <Pager p={ip} onChange={d => setIpage(ip.page + d)} />
            </>) : <div className="empty"><b>No pending invitations</b>Invite someone above and the link lands here until it is accepted.</div>}
        </div>
      </section>
    );
  };

  const access = () => {
    const fixed = new Set(supers?.by_address || []);
    return (
      <section className={`pane${pane === "access" ? "" : " hide"}`} id="pane-access">
        <div className="sechead"><h2>Team access</h2><span className="secnote">These accounts reach this console and every workspace in it. Everyone else sees only their own workspace, in the client portal.</span></div>
        <form className="inviterow" id="superform" noValidate onSubmit={grantSuper}>
          <input ref={supInput} id="supemail" type="email" placeholder="name@inspectd.com" autoComplete="off" aria-label="Email to invite onto the team" value={supEmail} onChange={e => setSupEmail(e.target.value)} />
          <button className="btn primary sm" type="submit" id="supbtn" disabled={supBusy}>Invite to the team</button>
          <span className="err" id="superr">{superr}</span>
        </form>
        <p className="setnote">An address with an account gets access straight away; anyone else gets an invitation link, and their new account is on the team when they accept it.</p>
        <LinkNote note={supNote} toast={toast} />
        <div className="tablewrap" id="supers">
          {!supers ? <SkelRows n={2} heads={["Person", "Access", "Joined", ""]} extraCls="team" /> : (
            <table className="team"><thead><tr><th>Person</th><th>Access</th><th>Joined</th><th className="r"></th></tr></thead><tbody>
              {supers.supers.map(u => {
                const byServer = fixed.has((u.email || "").toLowerCase()), you = u.id === supers.me;
                return (
                  <tr key={u.id}><td><Who name={u.name} email={u.email + (you ? " · you" : "")} /></td>
                    <td><Pill hue="blue">Inspectd team</Pill>{byServer ? <>{" "}<span className="sub">always on for this address</span></> : null}</td>
                    <td className="sub">{fmt(u.created_at)}</td>
                    <td className="r">{you || byServer ? null : <button className="btn sm danger rmsuper" onClick={() => removeSuper(u.id, u.name || u.email)}><Icon name="trash" size={13} /> Remove</button>}</td></tr>);
              })}
            </tbody></table>)}
        </div>
        <div className="sechead sub"><h3>Pending team invitations</h3></div>
        <div className="tablewrap" id="supinvites">
          {!supers ? null : supers.invitations.length ? (
            <table className="team"><thead><tr><th>Invited</th><th>Sent</th><th>Expires</th><th className="r"></th></tr></thead><tbody>
              {supers.invitations.map(i => <tr key={i.id}><td>{i.email}</td><td className="sub">{fmt(i.created_at)}</td><td className="sub">{fmt(i.expires_at)}</td>
                <td className="r"><button className="btn sm rvsup" onClick={() => revoke(i.org_id, i.id)}>Revoke</button></td></tr>)}
            </tbody></table>
          ) : <div className="empty"><b>No pending team invitations</b>Invite someone above and the link lands here until it is accepted.</div>}
        </div>
      </section>
    );
  };

  const account = () => {
    const u = me.user;
    const how = [u.has_password ? "A password" : "", u.google_linked ? "Google" : ""].filter(Boolean).join(" and ") || "Not set up yet";
    return (
      <section className={`pane${pane === "account" ? "" : " hide"}`} id="pane-account">
        <div className="sechead"><h2>Your account</h2><span className="secnote">How you appear to the rest of the team, and how you sign in.</span></div>
        <div className="cols" id="account">
          <div className="kv"><h3>Profile</h3><dl>
            <dt>Name</dt><dd id="namecell">{renaming ? (<>
              <input ref={nameInput} id="nameinput" value={nameDraft} onChange={e => setNameDraft(e.target.value)} aria-label="Your name" style={{ width: "auto", flex: 1, minWidth: 140 }} />
              <button className="btn primary sm" id="namesave" onClick={saveName}>Save</button><button className="btn sm" id="namecancel" onClick={() => setRenaming(false)}>Cancel</button>
            </>) : (<><span>{u.name || ""}</span><button className="btn sm" id="namebtn" onClick={() => { setNameDraft(u.name || ""); setRenaming(true); }}>Change</button></>)}</dd>
            <dt>Email</dt><dd>{u.email || ""}</dd>
            <dt>Access</dt><dd>{u.is_super ? <Pill hue="blue">Inspectd team</Pill> : <Pill hue="gray">Client</Pill>}{" "}<span className="sub">{u.is_super ? "This console and every workspace" : "One workspace"}</span></dd>
          </dl></div>
          <div className="kv"><h3>Signing in</h3><dl>
            <dt>How</dt><dd>{how}</dd>
            <dt>Last sign-in</dt><dd>{u.last_login_at ? fmt(u.last_login_at) : "This session"}</dd>
            <dt>Account made</dt><dd>{u.created_at ? fmt(u.created_at) : ""}</dd>
          </dl></div>
        </div>
      </section>
    );
  };

  const system = () => (
    <section className={`pane${pane === "system" ? "" : " hide"}`} id="pane-system">
      <div className="sechead"><h2>This deployment</h2><span className="secnote">What is switched on for this installation, and the addresses customers use.</span></div>
      {/* the plain-language version; the setting that switches each one lives in the tooltip, not the page */}
      <div className="cols" id="system">
        <div className="kv"><h3>Provider search</h3><dl>
          <dt>Status</dt><dd title="OPENAI_API_KEY">{onOff(meta.agent_enabled)}{" "}<span className="sub">{meta.agent_enabled ? "New requests are looked up automatically" : "Requests are still collected; no shops are found for them"}</span></dd>
          <dt>Runs</dt><dd>When a request arrives, and again from a job's Find providers</dd>
        </dl></div>
        <div className="kv"><h3>Email</h3><dl>
          <dt>Status</dt><dd title="RESEND_API_KEY">{onOff(meta.mail_enabled)}{" "}<span className="sub">{meta.mail_enabled
            ? (meta.mail_test_sender ? "On, but only to the Resend account owner: mail goes from Resend's test address until a sender on a verified domain is set" : "Confirmations and invitations are sent")
            : "Nothing is sent; invitation links have to be copied by hand"}</span></dd>
          <dt>Sent from</dt><dd title="MAIL_FROM">{meta.mail_from ? meta.mail_from : <>{"Resend's test address "}{meta.mail_test_sender ? <Pill hue="amber">Set a sender</Pill> : null}</>}</dd>
          <dt>Sends</dt><dd>Request confirmations with a tracking link, and team invitations</dd>
        </dl></div>
        <div className="kv"><h3>Sign-in</h3><dl>
          <dt>Password</dt><dd>{onOff(true)}{" "}<span className="sub">Everyone can sign in with an email and password</span></dd>
          <dt>Google</dt><dd title="GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET">{onOff(meta.google_enabled)}{" "}<span className="sub">{meta.google_enabled ? "People can sign in with a Google account" : "Not available yet"}</span></dd>
        </dl></div>
        <div className="kv"><h3>Data</h3><dl>
          <dt>Stored in</dt><dd>{meta.storage === "postgres" ? <>{"The shared database "}<span className="sub">Same data as the client portal</span></> : <>{"This machine only "}<span className="sub">A development copy; the live data is elsewhere</span></>}</dd>
          <dt>Requests</dt><dd>{rows.length}</dd>
          <dt>Workspaces</dt><dd>{orgs.length || "—"}</dd>
        </dl></div>
        <div className="kv"><h3>Addresses</h3><dl>
          <dt>Landing page</dt><dd><a href={`${PORTAL}/`} target="_blank" rel="noopener" onClick={e => { stay(e); onOpenPortal(); }}>{`${PORTAL}/`}</a></dd>
          <dt>Tracking</dt><dd><span className="mono">{`${PORTAL}/track/<id>`}</span></dd>
          <dt>Client portal</dt><dd>{meta.portal_url ? <a href={meta.portal_url} target="_blank" rel="noopener" onClick={e => { stay(e); onOpenPortal(); }}>{meta.portal_url}</a> : "—"}</dd>
        </dl></div>
      </div>
    </section>
  );

  return (<>
    <div className="pad greet"><div className="gt"><h1>Settings</h1><p>Workspaces and their teams, who reaches this console, your own account, and how this deployment is set up.</p></div></div>
    <div className="pad setlayout">
      <nav className="subnav" id="subnav" aria-label="Settings sections">
        {SECTIONS.map(([k, label, note]) => <a key={k} href={`#${k}`} data-k={k} className={k === pane ? "on" : ""} onClick={e => { stay(e); setPane(k); }}>{label}<small>{note}</small></a>)}
      </nav>
      <div className="setmain">{workspaces()}{access()}{account()}{system()}</div>
    </div>
  </>);
}
