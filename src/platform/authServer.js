/*
 * The auth service the Settings section calls: apps/auth/router.py over apps/auth/store.py, as pure
 * functions on the stored state. Each takes the state and returns {state, out}; a refusal throws
 * ApiError with the server's own words. Roles follow store.can_manage and deps.actor_role, so the
 * client portal (step 4), where admins and users act, gets the same rules from the same code.
 */
import { PORTAL, INVITATION_DAYS } from "./seed.js";

export class ApiError extends Error {}
const ROLES = ["OWNER", "ADMIN", "USER"];
const nowIso = () => new Date().toISOString();
const b64url = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const id12 = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, "0")).join("");
const hex = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, "0")).join("").slice(0, n);
export const normalizeEmail = e => (e || "").trim().toLowerCase();

/** OWNER manages every role, ADMIN manages ADMIN and USER, USER manages nothing. */
export const canManage = (actor, target) => actor === "OWNER" ? ROLES.includes(target) : actor === "ADMIN" ? ["ADMIN", "USER"].includes(target) : false;

// store._invitation: its status is worked out, never stored
export const inviteStatus = i => i.accepted_at ? "accepted" : i.revoked_at ? "revoked" : new Date(i.expires_at) <= new Date() ? "expired" : "pending";
const invitationOut = i => ({id: i.id, org_id: i.org_id, email: i.email, role: i.role, invited_by: i.invited_by, grants_super: !!i.grants_super,
                             created_at: i.created_at, expires_at: i.expires_at, status: inviteStatus(i)});
// store._user: what leaves the store
export const userOut = u => ({id: u.id, email: u.email, name: u.name, is_super: !!u.is_super, has_password: !!u.has_password,
                              google_linked: !!u.google_linked, created_at: u.created_at, last_login_at: u.last_login_at});
const ROLE_ORDER = {OWNER: 0, ADMIN: 1, USER: 2};
// mail.send with email on: delivered, and the entry handed back
const sent = (to, subject) => ({to, subject, at: nowIso(), sent: true, id: `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`});

export function createAuth(state, actorId = state.meId){
  const user = id => state.users.find(u => u.id === id) || null;
  const me = user(actorId);
  const membership = (oid, uid) => state.memberships.find(m => m.org_id === oid && m.user_id === uid) || null;
  const owners = oid => state.memberships.filter(m => m.org_id === oid && m.role === "OWNER").length;
  // deps.actor_role: SUPER acts as OWNER everywhere
  const actorRole = oid => me?.is_super ? "OWNER" : membership(oid, actorId)?.role || null;
  const orgAndRole = (oid, manage = false) => {
    const org = state.orgs.find(o => o.id === oid);
    if (!org) throw new ApiError("No such organization");
    const role = actorRole(oid);
    if (!role) throw new ApiError("You are not a member of this organization");
    if (manage && !["OWNER", "ADMIN"].includes(role)) throw new ApiError("Only owners and admins can manage the team");
    return [org, role];
  };
  const pendingFor = oid => state.invitations.filter(i => i.org_id === oid && inviteStatus(i) === "pending").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const withState = patch => ({...state, ...patch});
  // a new invitation replaces the address's pending ones in that workspace
  const createInvitation = (oid, email, role, grantsSuper) => {
    email = normalizeEmail(email);
    if (!email || !email.includes("@")) throw new ApiError("A valid email is required");
    const ts = nowIso(), token = b64url(32);
    const inv = {id: id12(), org_id: oid, email, role, invited_by: actorId, grants_super: !!grantsSuper, token, created_at: ts,
                 expires_at: new Date(Date.now() + INVITATION_DAYS * 864e5).toISOString(), accepted_at: null, accepted_by: null, revoked_at: null};
    const invitations = state.invitations.map(i => i.org_id === oid && i.email === email && !i.accepted_at && !i.revoked_at ? {...i, revoked_at: ts} : i);
    return [inv, token, [...invitations, inv]];
  };

  return {
    me: () => ({user: userOut(me), memberships: state.memberships.filter(m => m.user_id === actorId).sort((a, b) => a.joined_at.localeCompare(b.joined_at))
      .map(m => ({org: state.orgs.find(o => o.id === m.org_id), role: m.role}))}),
    // GET /orgs: every workspace (SUPER's view), oldest first, with member counts
    listOrgs: () => state.orgs.filter(o => me?.is_super || membership(o.id, actorId)).slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(o => ({org: o, role: me?.is_super ? null : membership(o.id, actorId)?.role, member_count: state.memberships.filter(m => m.org_id === o.id).length})),
    // GET /orgs/{id}/members
    members(oid){
      const [org, role] = orgAndRole(oid);
      const members = state.memberships.filter(m => m.org_id === oid).map(m => ({user: userOut(user(m.user_id)), role: m.role, joined_at: m.joined_at}))
        .sort((a, b) => a.joined_at.localeCompare(b.joined_at) || ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.user.email.localeCompare(b.user.email));
      return {org, role, members, invitations: pendingFor(oid).map(invitationOut)};
    },
    // PATCH /orgs/{id}: an owner renames it; the slug stays. The jobs read the name, so theirs changes too.
    renameOrg(oid, name){
      const [, role] = orgAndRole(oid);
      if (role !== "OWNER") throw new ApiError("Only an owner can rename the organization");
      name = (name || "").trim();
      if (!name) throw new ApiError("A company name is required");
      const orgs = state.orgs.map(o => o.id === oid ? {...o, name} : o);
      const rows = state.rows.map(r => r.org_id === oid && r.org ? {...r, org: {...r.org, name}} : r);
      return {state: withState({orgs, rows}), out: {org: orgs.find(o => o.id === oid)}};
    },
    // POST /orgs/{id}/invitations
    invite(oid, email, roleIn){
      const [org, role] = orgAndRole(oid, true);
      const newRole = (roleIn || "USER").toUpperCase();
      if (!ROLES.includes(newRole)) throw new ApiError("Role must be OWNER, ADMIN or USER");
      if (!canManage(role, newRole)) throw new ApiError(`An admin cannot invite an ${newRole.toLowerCase()}`);
      const addr = normalizeEmail(email);
      const existing = addr ? state.users.find(u => u.email === addr) : null;
      if (existing && membership(oid, existing.id)) throw new ApiError(`${addr} is already a member`);
      const [inv, token, invitations] = createInvitation(oid, addr, newRole, false);
      const link = `${PORTAL}/invite/${token}`;
      return {state: withState({invitations}), out: {invitation: invitationOut(inv), link, email: sent(addr, `${me.name || me.email} invited you to ${org.name} on Inspectd`)}};
    },
    // DELETE /orgs/{id}/invitations/{iid}
    revokeInvitation(oid, iid){
      const [, role] = orgAndRole(oid, true);
      const inv = state.invitations.find(i => i.id === iid);
      if (!inv || inv.org_id !== oid) throw new ApiError("No such invitation");
      if (!canManage(role, inv.role)) throw new ApiError("You cannot revoke this invitation");
      if (inv.accepted_at || inv.revoked_at) throw new ApiError(`This invitation is already ${inviteStatus(inv)}`);
      return {state: withState({invitations: state.invitations.map(i => i.id === iid ? {...i, revoked_at: nowIso()} : i)}), out: null};
    },
    // PATCH /orgs/{id}/members/{uid}: both the old role and the new one must be the actor's to manage; never the last owner
    setRole(oid, uid, roleIn){
      const [, role] = orgAndRole(oid, true);
      const target = membership(oid, uid);
      if (!target) throw new ApiError("No such member");
      const newRole = (roleIn || "").toUpperCase();
      if (!ROLES.includes(newRole)) throw new ApiError("Role must be OWNER, ADMIN or USER");
      if (!(canManage(role, target.role) && canManage(role, newRole))) throw new ApiError("You cannot change this member's role");
      if (newRole !== "OWNER" && target.role === "OWNER" && owners(oid) <= 1) throw new ApiError("An organization needs at least one owner");
      const memberships = state.memberships.map(m => m === target ? {...m, role: newRole} : m);
      return {state: withState({memberships}), out: {member: {user: userOut(user(uid)), role: newRole, joined_at: target.joined_at}}};
    },
    // DELETE /orgs/{id}/members/{uid}: anyone may leave; removing someone else needs their role; never the last owner
    removeMember(oid, uid){
      const [, role] = orgAndRole(oid);
      const target = membership(oid, uid);
      if (!target) throw new ApiError("No such member");
      if (uid !== actorId && !canManage(role, target.role)) throw new ApiError("You cannot remove this member");
      if (target.role === "OWNER" && owners(oid) <= 1) throw new ApiError("An organization needs at least one owner");
      return {state: withState({memberships: state.memberships.filter(m => m !== target)}), out: null};
    },
    // GET /supers
    supers: () => ({supers: state.users.filter(u => u.is_super).sort((a, b) => a.created_at.localeCompare(b.created_at)).map(userOut),
      invitations: state.invitations.filter(i => i.grants_super && inviteStatus(i) === "pending").sort((a, b) => b.created_at.localeCompare(a.created_at)).map(invitationOut),
      by_address: [...state.superEmails].sort(), me: actorId}),
    // POST /supers/invitations: an account already there is granted at once; anyone else is invited
    // as an admin of the inviter's own workspace, with team access when they accept
    inviteTeam(emailIn){
      if (!me?.is_super) throw new ApiError("This console is for the Inspectd team");
      const email = normalizeEmail(emailIn);
      if (!email || !email.includes("@")) throw new ApiError("Enter an email address");
      const existing = state.users.find(u => u.email === email);
      if (existing) {
        if (existing.is_super) throw new ApiError(`${email} already has team access`);
        const users = state.users.map(u => u.id === existing.id ? {...u, is_super: true} : u);
        return {state: withState({users}), out: {granted: userOut({...existing, is_super: true}), invitation: null, link: null, email: null}};
      }
      const home = state.memberships.filter(m => m.user_id === actorId).sort((a, b) => a.joined_at.localeCompare(b.joined_at))[0];
      if (!home) throw new ApiError("Your account is not in a workspace, so there is nowhere to invite them into");
      const [inv, token, invitations] = createInvitation(home.org_id, email, "ADMIN", true);
      const link = `${PORTAL}/invite/${token}`;
      return {state: withState({invitations}), out: {granted: null, invitation: invitationOut(inv), link, email: sent(email, `${me.name || me.email} invited you to the Inspectd team`)}};
    },
    // DELETE /supers/{uid}
    revokeSuper(uid){
      if (uid === actorId) throw new ApiError("You cannot take your own team access away");
      const target = user(uid);
      if (!target || !target.is_super) throw new ApiError("That account does not have team access");
      if (state.superEmails.includes(target.email.toLowerCase()))
        throw new ApiError(`${target.email} is granted team access by the server's own settings, so it cannot be revoked here`);
      const users = state.users.map(u => u.id === uid ? {...u, is_super: false} : u);
      return {state: withState({users}), out: {user: userOut({...target, is_super: false})}};
    },
    // PATCH /me: your own name
    updateMe(nameIn){
      const name = (nameIn || "").trim();
      if (!name) throw new ApiError("A name is required");
      const users = state.users.map(u => u.id === actorId ? {...u, name: name.slice(0, 120)} : u);
      return {state: withState({users}), out: null};
    },
  };
}
