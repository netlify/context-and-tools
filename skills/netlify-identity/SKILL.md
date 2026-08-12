---
name: netlify-identity
description: Add authentication and user management to a Netlify site with @netlify/identity — signup/login/logout, OAuth social login (Google/GitHub/GitLab/Bitbucket), server-side user verification in Functions, role-based access control (RBAC), admin user management, and Identity event hooks. Use when adding a login/signup flow, "add social login", gating content by user role, protecting a function or page behind auth, assigning roles at signup, customizing auth emails, or handling OAuth/confirmation/recovery callbacks. Not for locking an entire site to a company/team — that is netlify-access-control.
---

# Netlify Identity

Auth and user management for a Netlify site without requiring visitors to be Netlify users. Package: `@netlify/identity`.

**Reach for `@netlify/identity`.** Do NOT use the legacy `netlify-identity-widget` or `gotrue-js` for new work — same capabilities, simpler API, built-in server-side support.

## Footguns — read first

- **Identity does not work under `netlify dev`.** Test auth flows on a deploy — Deploy Previews work. Local `netlify dev` cannot exercise `/.netlify/identity/*`.
- **Never build a from-scratch third-party OAuth flow beside Identity** — no provider app registration in code, no `client_id`/`secret` in code, no custom callback token exchange. Use `oauthLogin()` + `handleAuthCallback()`. Raw OAuth beside Identity is the single most common source of rework.
- **Identity config has no public API — dashboard only.** Never curl `api.netlify.com` to flip/inspect Identity settings, never read tokens from `~/Library/Preferences/netlify/config.json`, never probe undocumented endpoints.
- **RBAC redirects without a fallback = raw 404.** A visitor lacking the role gets a bare 404 with no way to log in. Always add a fallback rule.
- **Server-side `login()`/`signup()`/`logout()` need CSRF protection.** Call `verifyRequestOrigin(req)` first, or an attacker can log a victim into the attacker's account.
- **Site-gating** ("lock this site to my company", employees-only) → route to **netlify-access-control** first. Identity is the app-level user layer only.
- **On failure** (callback 404s, `/.netlify/identity/*` unreachable, OAuth doesn't return): surface the error, the dashboard URL, and the setting to check — then stop. Do not invent recovery commands.

## Setup

Identity must be enabled in the dashboard first (no API): **Project configuration > Identity** (`https://app.netlify.com/projects/{site_name}/configuration/identity`) → **Enable Identity**.

```bash
npm install @netlify/identity
```

HTTPS is required. On a custom domain, get HTTPS/SSL working before integrating Identity.

## Client / universal auth

```ts
import { signup, login, logout, getUser, oauthLogin, handleAuthCallback } from '@netlify/identity'

// Sign up — sends a confirmation email by default (skippable via autoconfirm setting)
const user = await signup('jane@example.com', 'securepassword', { full_name: 'Jane Doe' })

// Log in / log out
await login('jane@example.com', 'securepassword')
await logout()

// Current user — null if not logged in (works in browser + server)
const u = await getUser()
if (u) console.log(u.email)

// OAuth — redirects browser to provider login
oauthLogin('github') // 'google' | 'github' | 'gitlab' | 'bitbucket'
```

**Callback handling is mandatory.** Call `handleAuthCallback()` on your landing page. It processes ALL token types in the URL hash — OAuth redirect, email confirmation, password recovery, invite. Without it, confirmation links and OAuth redirects never complete.

```ts
import { handleAuthCallback } from '@netlify/identity'

const result = await handleAuthCallback()
if (result) console.log(result.type, result.user.email) // may be falsy if nothing to process
```

Other client functions:
- `recoverPassword()` — complete a password reset (alternative to letting `handleAuthCallback()` handle the `recovery_token`).
- `acceptInvite()` — complete invite acceptance (alternative to `handleAuthCallback()` handling `invite_token`).
- `refreshSession()` — refresh token/session so newly-assigned roles take effect.

**Don't hard-code which providers exist.** Call `getSettings()` at startup and render the signup form and OAuth buttons from what it returns.

## Server-side (Functions / Edge Functions)

Handlers are modern v2 functions: `export default async (req, context) => {}`. **v1 `export { handler }` is not supported** for `getUser()`/`login()`/`admin.*`.

```ts
import { getUser } from '@netlify/identity'
import type { Context } from '@netlify/functions'      // or '@netlify/edge-functions' for Edge

export default async (req: Request, context: Context) => {
  const user = await getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  if (!user.roles.includes('admin')) return new Response('Forbidden', { status: 403 })
  return Response.json({ id: user.id, email: user.email })
}
```

`getUser()` works in browser, Netlify Functions, and Edge Functions.

**CSRF — always guard exposed `login`/`signup`/`logout` endpoints:**

```ts title="netlify/functions/login.ts"
import { login, verifyRequestOrigin } from '@netlify/identity'
import type { Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  verifyRequestOrigin(req)   // throws 403 on Origin mismatch; supports { allowedOrigins }
  const { email, password } = await req.json()
  await login(email, password)
  return new Response(null, { status: 302, headers: { Location: '/dashboard' } })
}
```

### admin — Netlify Functions ONLY

`admin.*` uses a short-lived admin token and runs **only in Netlify Functions** — NOT browser, NOT Edge Functions.

```ts
import { admin } from '@netlify/identity'
import type { Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  const users = await admin.listUsers()   // array of users
  return Response.json({ total: users.length })
}
```

- `admin.listUsers()` — array of users.
- `admin.updateUser()` — update a user (e.g. roles). Full API: https://github.com/netlify/identity#admin-operations

### Session cookies
JWT stored in cookie `nf_jwt`, sent automatically. Server-side `login`/`signup`/`logout` read/write `nf_jwt` and `nf_refresh` via the runtime, so the browser gets the session in the response.

### The `User` object
`id`, `email`, `roles` (array from `app_metadata.roles`, included in the JWT).

## Identity event functions

Functions the platform invokes automatically on Identity events (you don't call them).

**Modern typed-handler syntax** — export a default object with a method per event. Typed handlers require `@netlify/functions` ≥ 5.2.0.

```typescript title="netlify/functions/identity.mts"
import type { UserSignupEvent } from "@netlify/functions"

export default {
  userSignup(event: UserSignupEvent) {
    console.log(`New signup: ${event.user.email}`)
  },
}
```

Handlers and triggers:

| Handler | Fires when |
|---|---|
| `userValidate` | User attempts signup, before account creation — block by email domain, rate-limit, custom validation. |
| `userSignup` | Signup completes (email or external). Fires *after* email confirmation if confirmation is enabled. Assign roles, sync, notify. |
| `userLogin` | User logs in — track logins, sync, block a user. |
| `userModified` | Profile updated. |
| `userDeleted` | User deleted (notification only). |

**Deny an action:** call `event.deny()` from `userValidate`/`userSignup`/`userLogin`/`userModified` (NOT `userDeleted`). User gets a `401`; no observability error. With multiple subscribers, the first `event.deny()` aborts the chain.

```typescript title="netlify/functions/identity.mts"
import type { UserValidateEvent } from "@netlify/functions"

export default {
  userValidate(event: UserValidateEvent) {
    if (!event.user.email?.endsWith("@example.com")) return event.deny()
  },
}
```

**Assign roles at signup** — return `{ user: {...} }` to mutate the persisted record. Payload fields are **camelCase** (`appMetadata`, `userMetadata`, `confirmedAt`).

```typescript title="netlify/functions/identity.mts"
import type { UserSignupEvent } from "@netlify/functions"

export default {
  userSignup(event: UserSignupEvent) {
    return {
      user: { ...event.user, appMetadata: { ...event.user.appMetadata, roles: ["member"] } },
    }
  },
}
```

**Background mode** — action completes immediately, handler runs async:

```typescript title="netlify/functions/identity.mts"
import type { Config, UserLoginEvent } from "@netlify/functions"

export default { userLogin(event: UserLoginEvent) { /* async tracking */ } }
export const config: Config = { background: true }
```

Event types from `@netlify/functions`: `UserValidateEvent`, `UserSignupEvent`, `UserLoginEvent`, `UserModifiedEvent`, `UserDeletedEvent`, `Config`.

## Registration & providers (dashboard)

- **Registration preferences** — **Open** (default: any visitor signs up via `signup()`) or **Invite only** (all new users, including external-provider logins, must be invited first).
- **Confirmation:** open registration sends a confirmation email; skip via **Emails > Confirmation template > Configure** (allow signup without verifying email / autoconfirm).
- **External providers** — enable Google/GitHub/GitLab/Bitbucket under **Registration > External providers**. Set your own client ID/secret for branded OAuth (your app name shows on the provider screen). No email confirmation for external-provider signup, but Invite-only still requires an invite.
- **Invitations** — **Project configuration > Identity > Users**; Netlify team users with any role can invite. Invite link carries an `invite_token` → process with `handleAuthCallback()` or `acceptInvite()`.

## Roles & metadata

Stored on the User object; edit in **Identity > Users > Edit settings**:
- **Name** — user-editable: `user_metadata.full_name`.
- **Email** — user-editable; triggers email-change confirmation; changes login credentials: `user_metadata.email`.
- **Roles** — NOT user-editable: `app_metadata.roles`. Read via `getUser()`.

Set roles: at signup via `userSignup` handler returning `{ user: {...} }`; for existing users via `admin.updateUser()` in a Function. **Role changes take effect on next login or token refresh**, not immediately (they don't invalidate the current JWT — client can `refreshSession()`).

## Role-based access control (redirect rules)

Enforced at the CDN edge (no origin round trip). Add a `Role` parameter to redirect rules.

```
# _redirects — ALWAYS include a fallback or non-admins get a raw 404
/admin/*  /admin/:splat  200!  Role=admin
/admin/*  /login         401!

# multiple roles, comma-chained
/private/* /private/:splat  200!  Role=editor,admin
```

```toml
# netlify.toml
[[redirects]]
  from = "/admin/*"
  to = "/admin/:splat"
  force = true
  status = 200
  conditions = {Role = ["editor", "admin"]}
```

Netlify Identity roles resolve at `app_metadata.roles`.

### External JWT provider (Enterprise; alternative to Identity)
You may use Identity **OR** an external JWT provider, **not both** — you cannot authenticate third-party JWT tokens while Identity is enabled. Set the secret at **Project configuration > Access & security > Visitor access > JWT secret** (project-level overrides team-level default).

- Tokens must be **HS256**; header requires `"alg": "HS256"`, `"typ": "JWT"`.
- Payload requires `exp` (future Unix Epoch); other fields optional.
- External-provider roles resolve at `app_metadata.authorization.roles`. Different path → contact support for a custom role path (support-configured, not self-service).

## Emails (Pro+ for customization)

Default sender `no-reply@netlify.com`. Custom sender (Pro+): set SMTP hostname/port/username/password under **Emails > Outgoing email address** (use SendGrid/Mailjet/etc. for volume).

Custom templates (Pro+): publish HTML to a path on your deployed project, set the path (relative to domain, starting `/`) under **Emails**. Rules: inline CSS only, absolute image links, NO `<html>`/`<head>`/`<body>` tags. Keep template variables intact — don't let your build rewrite them.

Go template variables: `{{ .Email }}`, `{{ .NewEmail }}` (email-change only), `{{ .SiteURL }}`, `{{ .ConfirmationURL }}`, `{{ .Token }}`. Custom link form: `{{ .SiteURL }}/path/#confirmation_token={{ .Token }}` (also `invite_token`, `recovery_token`, `email_change_token`).

## Audit log (Pro+)

**Project configuration > Identity > Identity audit log**. Search with a required scope prefix: `author:[string]` or `action:[string]`. Action names: `login`, `logout`, `user_signedup`, `user_deleted`, `user_modified`, `token_revoked`, `token_refreshed`, `user_recovery_requested`, `user_invited`.

## Plan gating

- Identity itself: all credit-based plans, no extra cost. Unlimited active + invite-only users, custom OAuth credentials, Functions integration — all plans.
- **Pro+ only:** custom outgoing email, custom email templates, Identity audit log.
- **Enterprise only:** external JWT providers.

## Deep guides

- `references/advanced-patterns.md` — SSR / session hydration.
- `references/authorization-and-sessions.md`.

## Legacy (avoid for new work)

- `netlify-identity-widget` / `gotrue-js` — superseded by `@netlify/identity`.
- Legacy event-function filenames (`identity-validate.ts`, `identity-signup.ts`, `identity-login.ts`, `-background` suffix) still work but prefer typed handlers. Legacy denial = return non-2xx status; new code uses `event.deny()`.

<!-- getSettings() referenced in house rules but not documented in sources; its return shape/signature is not specified in the intermediate. -->

<!-- system: agent-context/identity/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify house rules (identity)

These are org conventions, not docs facts — merged into the rendered skill by
ctx-gen and never generated. Owned by the skills maintainer.

1. Deep guides live in this skill: `references/advanced-patterns.md`
   (SSR/session hydration) and `references/authorization-and-sessions.md`.
2. Identity does not work under `netlify dev` — test auth flows on deploys
   (Deploy Previews work).
3. Identity configuration has no public API — it is dashboard-only. Never curl
   `api.netlify.com` to flip or inspect Identity settings, never read auth
   tokens from `~/Library/Preferences/netlify/config.json`, never probe for
   undocumented endpoints.
4. On failure (callback 404s, `/.netlify/identity/*` unreachable, OAuth flow
   doesn't return), surface the error, the dashboard URL, and the setting to
   check — then stop. Do not invent recovery commands.
5. Never build a from-scratch third-party OAuth flow when Identity is in play —
   no provider app registration, no `client_id`/`secret` in code, no custom
   callback token exchange. Use `oauthLogin()` + `handleAuthCallback()`;
   raw OAuth beside Identity is the single most common source of rework.
6. Server-side `getUser()`/`login()`/`admin.*` require modern v2 functions
   (`export default`) — v1 `export { handler }` is not supported. Typed
   Identity event handlers (`UserSignupEvent`, `event.deny()`) require
   `@netlify/functions` ≥ 5.2.0; older installs use the legacy filenames.
7. Don't hard-code which auth providers exist — call `getSettings()` at
   startup and render the signup form and OAuth buttons from what it returns.
8. Site-gating requests ("lock this site to my company", employees-only)
   route to the netlify-access-control skill first — Identity is the
   app-level user layer only.
