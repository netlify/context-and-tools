---
name: netlify-identity
description: Use when the task involves authentication, user signups, logins, password recovery, OAuth providers, role-based access control, or protecting routes and functions. Always use `@netlify/identity`. Never use `netlify-identity-widget` or `gotrue-js` — they are deprecated.
---

# Netlify Identity

Netlify Identity is a user management service for signups, logins, password recovery, user metadata, and role-based access control. It is built on [GoTrue](https://github.com/netlify/gotrue) and issues JSON Web Tokens (JWTs).

**Always use `@netlify/identity`.** Never use `netlify-identity-widget` or `gotrue-js` — they are deprecated. `@netlify/identity` provides a unified, headless TypeScript API that works in both browser and server contexts (Netlify Functions, Edge Functions, SSR frameworks).

## Dashboard configuration (user handoff required)

**All Identity instance configuration is dashboard-only — there is no public API.** The agent owns the code, deploys, and the handoff checklist; the user owns flipping dashboard settings. Outside of a Netlify Agent Runner deploy, the Identity instance must be enabled in the dashboard before any auth flow will work. If you write Identity code first and only discover this when `/.netlify/identity/signup` 404s after a production deploy, that's wasted work — surface the dashboard handoff up front instead.

**Dashboard URL pattern:** `https://app.netlify.com/projects/<project-slug>/configuration/identity` (it's under project configuration — not under Integrations, and not a top-level sidebar item).

### Dashboard-only operations

- **Enable Identity** — turns the Identity instance on for the site. **Required** before any auth flow works.
- **Registration mode** — Open (anyone can sign up, the default) or Invite only.
- **Autoconfirm** — ON skips the email-confirmation step on signup; OFF requires the new user to click a confirmation email before they can log in.
- **External providers** — Add Google / GitHub / GitLab / Bitbucket / Facebook. The "Use Netlify's app" option means no `client_id`/`secret` needed — good for prototypes. Adding an OAuth provider does NOT disable email/password — email/password is always available unless the front-end omits it.
- **Custom email templates / SMTP** — advanced; out of scope for typical prototypes.

There is no CLI command and no public API for any of these. **Do not** curl `https://api.netlify.com/...` to flip toggles, **do not** read auth tokens out of `~/Library/Preferences/netlify/config.json`, and **do not** probe for an undocumented endpoint. Give the user the dashboard URL and exact checklist instead.

### Agent/user sequence

1. Agent asks any missing auth-shape questions before scaffolding.
2. Agent writes the Identity code and runs a draft deploy.
3. User enables Identity and any OAuth providers in the dashboard using the handoff checklist.
4. Agent verifies the draft URL and then runs the production deploy.

### Recommended settings per use case

| Use case | Registration | Autoconfirm | External providers |
|---|---|---|---|
| Prototype / demo | Open | ON | as requested |
| Production with email signup | Open or Invite per product | OFF (real email confirmation) | configured with custom email templates / SMTP as needed |

### Handoff checklist

When the dashboard work is needed, give the user a copy-pasteable checklist **between the draft deploy and the production deploy** — not after the prod deploy fails:

```
Before this works end-to-end, flip these in the Netlify dashboard at
https://app.netlify.com/projects/<your-slug>/configuration/identity:

- [ ] Identity → Enable
- [ ] Registration → Open (default) or Invite only
- [ ] Autoconfirm → ON for prototypes; OFF for prod with email confirmation
- [ ] External providers → Add Google (etc.) with "Use Netlify's app"

Tell me when these are flipped and I'll run the production deploy.
```

## Before you build

If the prompt didn't already specify, ask the user a few short questions before scaffolding any auth code — the answers shape both the dashboard config above and the auth UI you'll write:

- Which sign-in methods should this app expose: email/password, OAuth, or both?
- Which parts of the app need authenticated access: the whole app, specific routes, or only specific actions?
- Who can create accounts: public signup or invite-only?
- Should new email/password users be able to log in immediately for a prototype (Autoconfirm ON), or confirm by email first for production (Autoconfirm OFF)?
- Which OAuth providers should be enabled (Google, GitHub, GitLab, Bitbucket, Facebook)?

**If you don't have preferences here, tell me what you want overall and I'll pick sensible defaults** — typically email/password + Google OAuth, autoconfirm ON, registration Open for a prototype.

Asking these *after* coding causes rework — both the auth UI shape and the dashboard config fall out of these answers.

## When something fails, surface and stop

If a deploy fails, an Identity callback 404s, an OAuth flow doesn't return, or `/.netlify/identity/*` is unreachable — report the failure to the user with the deploy log URL, the exact error, and the site URL, then stop. Do not curl the Netlify API to "fix" the Identity instance, do not invent recovery commands, do not bypass the dashboard. Identity instance state has no public API to repair; the recovery is to hand the user the dashboard URL, the setting to check, and the observed failure.

## Setup

```bash
npm install @netlify/identity
```

The Identity instance must be enabled in the dashboard first (see [Dashboard configuration](#dashboard-configuration-user-handoff-required) above). The one exception: a deploy created by a Netlify Agent Runner session that includes Identity code auto-enables the instance.

### Local Development

Identity does **not** currently work with `netlify dev`. You must deploy to Netlify to test Identity features. Use `npx netlify deploy` for preview deploys during development. This limitation may be resolved in a future release.

## Quick Start

Log in from the browser:

```typescript
import { login, getUser } from '@netlify/identity'

const user = await login('user@example.com', '<password>')
console.log(`Hello, ${user.name}`)

// Later, check auth state
const currentUser = await getUser()
```

Protect a Netlify Function:

```typescript
// netlify/functions/protected.mts
import { getUser } from '@netlify/identity'
import type { Context } from '@netlify/functions'

export default async (req: Request, context: Context) => {
  const user = await getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  return Response.json({ id: user.id, email: user.email })
}
```

## Core API

Import and use headless functions directly:

```typescript
import {
  getUser,
  handleAuthCallback,
  login,
  logout,
  signup,
  oauthLogin,
  onAuthChange,
  getSettings,
} from '@netlify/identity'
```

### Login

```typescript
import { login, AuthError } from '@netlify/identity'

async function handleLogin(email: string, password: string) {
  try {
    const user = await login(email, password)
    showSuccess(`Welcome back, ${user.name ?? user.email}`)
  } catch (error) {
    if (error instanceof AuthError) {
      showError(error.status === 401 ? 'Invalid email or password.' : error.message)
    }
  }
}
```

### Signup

After signup, check `user.emailVerified` to determine if the user was auto-confirmed or needs to confirm their email.

```typescript
import { signup, AuthError } from '@netlify/identity'

async function handleSignup(email: string, password: string, name: string) {
  try {
    const user = await signup(email, password, { full_name: name })
    if (user.emailVerified) {
      // Autoconfirm ON — user is logged in immediately
      showSuccess('Account created. You are now logged in.')
    } else {
      // Autoconfirm OFF — confirmation email sent
      showSuccess('Check your email to confirm your account.')
    }
  } catch (error) {
    if (error instanceof AuthError) {
      showError(error.status === 403 ? 'Signups are not allowed.' : error.message)
    }
  }
}
```

### Logout

```typescript
import { logout } from '@netlify/identity'

await logout()
```

### OAuth

OAuth is a two-step flow: `oauthLogin(provider)` redirects away from the site, then `handleAuthCallback()` processes the redirect when the user returns.

```typescript
import { oauthLogin } from '@netlify/identity'

// Step 1: Redirect to provider (navigates away — never returns)
function handleOAuthClick(provider: 'google' | 'github' | 'gitlab' | 'bitbucket') {
  oauthLogin(provider)
}
```

Providers must be enabled in the dashboard before `oauthLogin()` works — see [Dashboard configuration](#dashboard-configuration-user-handoff-required) above. Registration is Open by default, so OAuth users can create accounts without any extra signup-related configuration; only the provider itself must be enabled.

Email/password is always available as a login method — there is **no "Email provider" toggle** in Identity settings, only External providers for OAuth. To restrict users to OAuth-only, omit the email/password form from your UI; the front-end is the gate.

### Handling Callbacks

Always call `handleAuthCallback()` on page load in any app that uses OAuth, password recovery, invites, or email confirmation. It processes all callback types via the URL hash.

```typescript
import { handleAuthCallback, AuthError } from '@netlify/identity'

async function processCallback() {
  try {
    const result = await handleAuthCallback()
    if (!result) return // No callback hash — normal page load

    switch (result.type) {
      case 'oauth':
        showSuccess(`Logged in as ${result.user?.email}`)
        break
      case 'confirmation':
        showSuccess('Email confirmed. You are now logged in.')
        break
      case 'recovery':
        // User is authenticated but must set a new password
        showPasswordResetForm(result.user)
        break
      case 'invite':
        // User must set a password to accept the invite
        showInviteAcceptForm(result.token)
        break
      case 'email_change':
        showSuccess('Email address updated.')
        break
    }
  } catch (error) {
    if (error instanceof AuthError) showError(error.message)
  }
}
```

### Auth State

```typescript
import { getUser, onAuthChange, AUTH_EVENTS } from '@netlify/identity'

// Check current user (never throws — returns null if not authenticated)
const user = await getUser()

// Subscribe to auth state changes (returns unsubscribe function)
const unsubscribe = onAuthChange((event, user) => {
  switch (event) {
    case AUTH_EVENTS.LOGIN:
      console.log('Logged in:', user?.email)
      break
    case AUTH_EVENTS.LOGOUT:
      console.log('Logged out')
      break
    case AUTH_EVENTS.TOKEN_REFRESH:
      break
    case AUTH_EVENTS.USER_UPDATED:
      console.log('Profile updated:', user?.email)
      break
    case AUTH_EVENTS.RECOVERY:
      console.log('Password recovery initiated')
      break
  }
})
```

### Settings-Driven UI

Fetch the project's Identity settings to conditionally render signup forms and OAuth buttons.

```typescript
import { getSettings } from '@netlify/identity'

const settings = await getSettings()
// settings.autoconfirm — boolean
// settings.disableSignup — boolean
// settings.providers — Record<AuthProvider, boolean>

if (!settings.disableSignup) showSignupForm()

for (const [provider, enabled] of Object.entries(settings.providers)) {
  if (enabled) showOAuthButton(provider)
}
```

## Minimal React Example

```tsx
import { useEffect, useState } from 'react'
import {
  getUser,
  handleAuthCallback,
  login,
  logout,
  oauthLogin,
  onAuthChange,
} from '@netlify/identity'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      await handleAuthCallback()
      setUser(await getUser())
      setLoading(false)
    })()
    return onAuthChange((_event, currentUser) => setUser(currentUser))
  }, [])

  const handleLogin = async (email, password) => {
    const currentUser = await login(email, password)
    setUser(currentUser)
  }

  const handleGoogleLogin = () => oauthLogin('google')

  const handleSignOut = async () => {
    await logout()
    setUser(null)
  }

  if (loading) return <p>Loading...</p>
  // Render login form or user details based on `user` state
}
```

## Error Handling

`@netlify/identity` throws two error classes:

- **`AuthError`** — Thrown by auth operations. Has `message`, optional `status` (HTTP status code), and optional `cause`.
- **`MissingIdentityError`** — Thrown when Identity is not configured in the current environment.

`getUser()` and `isAuthenticated()` never throw — they return `null` and `false` respectively on failure.

| Status | Meaning |
|--------|---------|
| 401 | Invalid credentials or expired token |
| 403 | Action not allowed (e.g., signups disabled) |
| 422 | Validation error (e.g., weak password, malformed email) |
| 404 | User or resource not found |

## Identity Event Functions

Functions can subscribe to Identity lifecycle events by exporting an object whose properties are named event handlers. See the **netlify-functions** skill for the full event-handler pattern.

**Available identity handlers:**

| Handler | Trigger |
|---|---|
| `userValidate` | User attempts to sign up. Can deny. |
| `userSignup` | User completes signup. Can deny or mutate. |
| `userLogin` | User logs in. Can deny or mutate. |
| `userModified` | User profile is updated. Can deny or mutate. |
| `userDeleted` | User is deleted. Notification only. |

Each handler receives a typed event with a parsed `user` object (camelCase fields: `appMetadata`, `userMetadata`, `confirmedAt`, etc.).

### Mutate the user

Return `{ user: ... }` to substitute the user record before it's persisted. This is the common pattern for role assignment at signup.

```typescript
// netlify/functions/identity.mts
import type { UserSignupEvent } from '@netlify/functions'

export default {
  userSignup(event: UserSignupEvent) {
    return {
      user: {
        ...event.user,
        appMetadata: {
          ...event.user.appMetadata,
          roles: ['member'],
        },
      },
    }
  },
}
```

### Deny an action

Call `event.deny()` to reject a signup, login, validation, or modification. The end user receives a 401. Do not throw — `event.deny()` is the canonical denial mechanism and does not produce an error in observability.

```typescript
import type { UserValidateEvent } from '@netlify/functions'

export default {
  userValidate(event: UserValidateEvent) {
    if (!event.user.email?.endsWith('@example.com')) {
      return event.deny()
    }
  },
}
```

If multiple functions subscribe to the same event, the first to call `event.deny()` aborts the chain — subsequent functions are not invoked.

### Legacy filename convention

The previous syntax — files named `identity-validate.ts`, `identity-signup.ts`, `identity-login.ts`, exporting `handler` and signaling denial via non-2xx response — still works. New functions should prefer the typed handler syntax above.

## Roles and Authorization

### First Admin User

The first admin user cannot be created through code alone. You must direct the user to set it up through the Netlify UI:

1. Go to **Project configuration > Identity** in the Netlify dashboard (`https://app.netlify.com/projects/<project-slug>/configuration/identity`)
2. Click **Invite users** and enter the admin user's email address
3. After the user accepts the invite, click the user in the Identity list to open their detail page
4. In the **Roles** field, add the `admin` role and save

Once the first admin exists, subsequent users can be managed programmatically using Identity event functions (e.g., assigning roles in `identity-signup`) or role-based redirects.

- **`app_metadata.roles`** — Server-controlled. Only settable via the Netlify UI, admin API, or Identity event functions. Never let users set their own roles.
- **`user_metadata`** — User-controlled. Users can update via `updateUser({ data: { ... } })`.

### Role-Based Redirects

```toml
# netlify.toml
[[redirects]]
  from = "/admin/*"
  to = "/admin/:splat"
  status = 200
  conditions = { Role = ["admin"] }

[[redirects]]
  from = "/admin/*"
  to = "/"
  status = 302
```

Rules are evaluated top-to-bottom. The `nf_jwt` cookie is read by the CDN to evaluate role conditions.

## References

- [Advanced patterns](references/advanced-patterns.md) — password recovery, invite acceptance, email change, session hydration, SSR integration
