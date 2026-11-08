import React, { useEffect, useRef, useState } from "react";
import { usePlatform } from "./PlatformStore.jsx";
import { paged, Pager, CSelect } from "./ui.jsx";
import { Sk, SkelRows, useNotices, useLoaded } from "./portalUi.jsx";

/*
 * Team (ui/team-client), Settings (ui/settings-client) and Invoices (ui/invoices-client, a placeholder in
 * Kavin's too). What the viewer may change on Team depends on their role: owners manage everyone, admins
 * manage admins and users, users only look. The auth service (authServer.js) enforces the same rules.
 */

const ROLE = {OWNER: ["blue", "Owner"], ADMIN: ["green", "Admin"], USER: ["gray", "User"]};
const canManage = (actor, target) => actor === "OWNER" || (actor === "ADMIN" && target !== "OWNER");
const Pill = ({ role }) => { const [hue, label] = ROLE[role] || ["gray", role]; return <span className={`pill ${hue}`}>{label}</span>; };
const fmt = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"}); };

/* ---- Team ---- */

export function Team({ ctx }){
  const { portal, rows: _ } = usePlatform();
  const { notify, ask } = useNotices();
  const loaded = useLoaded();
  const [mpage, setMpage] = useState(0), [ipage, setIpage] = useState(0);
  const [invRole, setInvRole] = useState(""), [err, setErr] = useState(""), [bad, setBad] = useState(false), [busy, setBusy] = useState(false), [link, setLink] = useState(null);
  const emailEl = useRef(null), warned = useRef(false);
  let team = null;
  if (loaded) {
    try { team = portal.team(); }
    catch (e) { if (!warned.current) { warned.current = true; setTimeout(() => notify("Could not load the team", e.message, "red", 0), 0); } }
  }
  const call = (name, ...args) => portal.teamWrite(name, ...args);

  if (!loaded) return (<>
    <section className="pad greet"><div className="gt"><h1>Team</h1><div className="meta" id="teamMeta"><Sk w={160} h={13} /></div></div></section>
    <div id="members"><SkelRows n={3} cols={4} /></div>
  </>);
  if (!team) return (<>
    <section className="pad greet"><div className="gt"><h1>Team</h1><div className="meta" id="teamMeta"></div></div></section>
    <div id="members"><div className="empty"><b>No workspace</b>Your account is not in a workspace yet.</div></div>
  </>);

  const my = team.role, manager = my === "OWNER" || my === "ADMIN";
  const mp = paged(team.members, mpage), inv = team.invitations || [], ip = paged(inv, ipage);
  const roleChange = async (m, role) => {
    try { call("setRole", m.user.id, role); notify("Role updated", `${ROLE[role][1]} from now on.`, "blue", 3000); }
    catch (e) { notify("Could not change the role", e.message, "red"); }
  };
  const remove = async m => {
    const name = m.user.name || m.user.email;
    if (!await ask({title: `Remove ${name}?`, text: `They lose access to ${team.org.name} and its reports right away.`, ok: "Remove", danger: true})) return;
    try { call("removeMember", m.user.id); notify("Removed", `${name} no longer has access.`, "blue", 3000); }
    catch (e) { notify("Could not remove", e.message, "red"); }
  };
  const leave = async m => {
    if (!await ask({title: `Leave ${team.org.name}?`, text: "You will lose access to its reports and jobs. An owner or admin can invite you back.", ok: "Leave workspace", danger: true})) return;
    try { call("removeMember", m.user.id); ctx.signOut(); }   // Kavin's goes to /auth/logout
    catch (e) { notify("Could not leave", e.message, "red"); }
  };
  const revoke = i => {
    try { call("revokeInvitation", i.id); notify("Invitation revoked", "That link no longer works.", "blue", 3000); }
    catch (e) { notify("Could not revoke", e.message, "red"); }
  };
  const roleNow = invRole || "USER";
  const invite = e => {
    e.preventDefault();
    const email = emailEl.current.value.trim();
    setErr(""); setLink(null); setBad(false);
    if (!email.includes("@")) { setErr("Enter an email address."); setBad(true); emailEl.current.focus(); return; }
    setBusy(true);
    try {
      const r = call("invite", email, roleNow);
      emailEl.current.value = "";
      setLink({email, url: r.link, sent: !!r.email?.sent});
      notify(r.email?.sent ? "Invitation sent" : "Invitation created", `${email} can join as ${roleNow.toLowerCase()}.`, "blue", 4000);
    } catch (x) { setErr(x.message); }
    finally { setBusy(false); }
  };
  const copy = () => navigator.clipboard.writeText(link.url).then(() => notify("Copied", "The invite link is on your clipboard.", "blue", 2500), () => {});

  return (<>
    <section className="pad greet"><div className="gt"><h1>Team</h1>
      <div className="meta" id="teamMeta"><span><b>{team.org.name}</b></span><span>{`${team.members.length} member${team.members.length === 1 ? "" : "s"}`}</span><span>{`You are ${my === "OWNER" ? "an owner" : my === "ADMIN" ? "an admin" : "a user"}`}</span></div></div></section>
    <div id="members">
      <div className="tablewrap listgap"><table className="rtable"><thead><tr><th>Member</th><th>Role</th><th>Joined</th><th className="r"></th></tr></thead><tbody>
        {mp.slice.map(m => { const you = m.user.id === team.me;
          return (<tr key={m.user.id}>
            <td><div className="who"><span className="av">{(m.user.name || m.user.email || "?").trim()[0].toUpperCase()}</span><span className="tx"><b>{m.user.name}{you ? <>{" "}<span className="pill gray">You</span></> : null}</b><span>{m.user.email}</span></span></div></td>
            <td>{canManage(my, m.role) && !you
              ? <CSelect className="rolesel" label={`Role for ${m.user.name}`} value={m.role} onChange={v => { if (v !== m.role) roleChange(m, v); }} options={Object.entries(ROLE).filter(([k]) => canManage(my, k)).map(([value, [, label]]) => ({value, label}))} />
              : <Pill role={m.role} />}</td>
            <td className="sub">{fmt(m.joined_at)}</td>
            <td className="r">{you ? <button className="btn sm leave" onClick={() => leave(m)}>Leave</button> : canManage(my, m.role) ? <button className="btn sm rm" onClick={() => remove(m)}>Remove</button> : null}</td>
          </tr>); })}
      </tbody></table></div>
      <Pager p={mp} onChange={d => setMpage(mp.page + d)} />
    </div>
    <section className={`pad${manager ? "" : " hide"}`} id="inviteSec">
      <div className="sechead"><h2>Invite someone</h2><span className="secnote" id="inviteNote">{manager ? (my === "OWNER" ? "Owners can invite anyone and set any role." : "Admins can invite admins and users.") : ""}</span></div>
      <form className="inviterow" id="inviteForm" noValidate onSubmit={invite}>
        <input id="invEmail" ref={emailEl} type="email" placeholder="name@company.com" autoComplete="off" aria-label="Email to invite" className={bad ? "bad" : undefined} />
        <CSelect label="Role" value={roleNow} onChange={setInvRole} options={Object.entries(ROLE).filter(([k]) => canManage(my, k)).map(([value, [, label]]) => ({value, label}))} />
        <button className="btn primary" type="submit" id="invBtn" disabled={busy}>Send invite</button>
        <span className="err" id="invErr">{err}</span>
      </form>
      <div className={`invlink${link ? "" : " hide"}`} id="invLink">{link ? <>
        {link.sent ? <>Invitation emailed to <b>{link.email}</b>.</> : <>We could not email this invitation from here (the request service has no email key in this environment), so send this link to <b>{link.email}</b> yourself:</>}
        {" "}<span className="mono">{link.url}</span>{" "}<button className="btn sm" id="copyInv" type="button" onClick={copy}>Copy link</button></> : null}</div>
      <div className="sechead"><h2>Pending invitations</h2><span className="secnote">Links work for 7 days.</span></div>
    </section>
    <div id="invites">{manager ? (inv.length ? <>
      <div className="tablewrap"><table className="rtable"><thead><tr><th>Invited</th><th>Role</th><th>Sent</th><th>Expires</th><th className="r"></th></tr></thead><tbody>
        {ip.slice.map(i => <tr key={i.id}><td>{i.email}</td><td><Pill role={i.role} /></td><td className="sub">{fmt(i.created_at)}</td><td className="sub">{fmt(i.expires_at)}</td>
          <td className="r">{canManage(my, i.role) ? <button className="btn sm rv" onClick={() => revoke(i)}>Revoke</button> : null}</td></tr>)}
      </tbody></table></div><Pager p={ip} onChange={d => setIpage(ip.page + d)} /></>
      : <div className="empty"><b>No pending invitations</b>Invite a teammate above; the invitation stays here until it is accepted.</div>) : null}</div>
  </>);
}

/* ---- Settings ---- */

export function Settings({ ctx }){
  const { portal } = usePlatform();
  const { notify } = useNotices();
  const loaded = useLoaded();
  const [saving, setSaving] = useState({ws: false, me: false});
  const wsEl = useRef(null), meEl = useRef(null);
  const me = loaded ? portal.me() : null;
  let team = null;
  if (loaded) { try { team = portal.team(); } catch { team = null; } }
  const u = me?.user || {}, org = team?.org || me?.account, canRename = me?.role === "OWNER" || me?.role === "SUPER";
  // the names start as the account has them; after that the fields are the reader's
  useEffect(() => { if (!loaded) return; if (wsEl.current) wsEl.current.value = org?.name || ""; if (meEl.current) meEl.current.value = u.name || ""; }, [loaded]);
  const skel = <Sk w={120} h={12} />, show = v => loaded ? v : skel;

  const renameWs = e => {
    e.preventDefault(); const name = wsEl.current.value.trim();
    if (!name) { notify("Give the workspace a name", "", "amber", 3000); return; }
    setSaving(s => ({...s, ws: true}));
    // Kavin's reloads the page 600 ms after a save; so does this (docs/platform-iteration-notes.md)
    try { const r = portal.teamWrite("renameOrg", name); notify("Workspace renamed", `It is now ${r.org.name}.`, "blue", 3000); setTimeout(ctx.reload, 600); }
    catch (x) { notify("Could not rename", x.message, "red"); setSaving(s => ({...s, ws: false})); }
  };
  const renameMe = e => {
    e.preventDefault(); const name = meEl.current.value.trim();
    if (!name) { notify("Enter your name", "", "amber", 3000); return; }
    setSaving(s => ({...s, me: true}));
    try { portal.rename(name); notify("Name saved", "", "blue", 2500); setTimeout(ctx.reload, 600); }
    catch (x) { notify("Could not save", x.message, "red"); setSaving(s => ({...s, me: false})); }
  };
  return (
    <section className="pad"><div className="greet"><div className="gt"><h1>Settings</h1></div></div>
      <div className="cols2" id="settingsCols">
        <div className="kv" id="wsCard"><h3>Workspace</h3>
          <form id="wsForm" onSubmit={renameWs}><input id="wsName" ref={wsEl} aria-label="Workspace name" maxLength={80} disabled={loaded && !canRename} /><button className="btn primary sm" type="submit" id="wsSave" disabled={(loaded && !canRename) || saving.ws}>Save</button></form>
          <div className="hint" id="wsHint">{loaded ? (canRename ? "Shown on the sidebar for everyone in the workspace." : "Only an owner can rename the workspace.") : ""}</div>
          <dl><dt>Address</dt><dd className="mono" id="wsSlug">{show(org?.slug ? "/" + org.slug : "")}</dd><dt>Your role</dt><dd id="wsRole">{show(u.role_label || me?.role || "")}</dd>
            <dt>Members</dt><dd id="wsMembers">{show(team ? `${team.members.length} member${team.members.length === 1 ? "" : "s"}${team.invitations.length ? `, ${team.invitations.length} invited` : ""}` : "")}</dd>
            <dt>Created</dt><dd id="wsCreated">{show(fmt(org?.created_at) || "")}</dd></dl></div>
        <div className="kv" id="meCard"><h3>Your account</h3>
          <form id="meForm" onSubmit={renameMe}><input id="meName" ref={meEl} aria-label="Your name" maxLength={120} /><button className="btn primary sm" type="submit" id="meSave" disabled={saving.me}>Save</button></form>
          <div className="hint">The name your teammates and inspectors see.</div>
          <dl><dt>Email</dt><dd id="meEmail">{show(u.email || "")}</dd><dt>Sign-in</dt><dd id="meSignin">{show([u.has_password ? "Password" : "", u.google_linked ? "Google" : ""].filter(Boolean).join(" and ") || "Password")}</dd>
            <dt>Workspaces</dt><dd id="meWorkspaces">{show((me?.workspaces || []).map(w => `${w.name} (${w.role_label || w.role})`).join(", "))}</dd></dl></div>
        <div className="kv"><h3>Session</h3><div className="hint" style={{ paddingTop: 12 }}>Signing out here signs you out of the portal on this device only.</div>
          <div style={{ padding: "0 16px 14px" }}><a className="btn" href="/auth/logout" onClick={e => { e.preventDefault(); ctx.signOut(); }}>Sign out</a></div></div>
      </div></section>
  );
}

/* ---- Invoices: a placeholder until the section is specified, as Kavin's is ---- */

export const Invoices = () => (
  <section className="pad"><div className="greet"><div className="gt"><h1>Invoices</h1></div></div>
    <div className="placeholder" id="ph"><b>No invoices yet</b>Billing is set up once your first jobs complete.</div></section>
);
