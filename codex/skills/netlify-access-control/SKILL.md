---
name: netlify-access-control
description: Use when the task involves controlling who can reach a Netlify site, or telling Netlify Identity apart from Secure Access. Trigger whenever the user wants to lock a site or deploy to their company/team, restrict access to employees only, build an internal or employees-only app, set up password protection, SSO, or SAML, asks "who can access my site", or is confused about Netlify Identity vs Secure Access vs team login vs OAuth providers. Routes the request to the right layer — app-level Identity, site-visitor Password Protection, the Auth0 extension, or Team/Org SAML SSO — and explains the two-layer (perimeter + in-app identity) pattern and its double-login tradeoff. For building the app-level auth itself, use the netlify-identity skill.
---

# Netlify Access Control

"Auth" on Netlify means three different things that are easy to conflate. Picking the wrong one — or stacking two when one would do — is the main source of friction. This skill disambiguates the layers and routes you to the right one. For actually building app-level user auth, see the **netlify-identity** skill.

## The three layers

| Layer | Answers | Who it's for | Plan | How it's configured |
|---|---|---|---|---|
| **Netlify Identity** | "Who is this user *inside my app*?" (signups, logins, roles; issues `nf_jwt`) | Your app's end users | All plans, free | Dashboard + `@netlify/identity` code |
| **Password Protection** (Secure access to *sites*) | "Can this request even *load the site*?" | Basic: anyone with a shared password · Team login: Netlify team members | Basic: Pro+ · Team login: Enterprise | Dashboard-only |
| **Team / Org SAML SSO** (Secure access to *Netlify*) | "Can you log in to the *Netlify dashboard*?" (and, with strict mode, pass the site gate) | Netlify team members, via a corporate SAML IdP | Enterprise | Dashboard-only |

These are independent. The `nf_jwt` cookie is issued by app-level JWT auth: Netlify Identity, or a configured external JWT provider such as Auth0/Okta (the two are mutually exclusive); Password Protection and SAML SSO sessions are separate, with their own lifecycles, and do not populate `nf_jwt`.

> **Note on terminology:** Netlify's docs file Identity, Password Protection, role-based access, and more under an umbrella called "Secure access to your sites," while SAML SSO lives under "Secure access to Netlify." So "Secure Access" is not one feature — when a user says it, find out whether they mean *gating site visitors* (Password Protection) or *gating dashboard login* (SAML SSO).

## Why Google causes confusion

The same provider can show up in two unrelated places:

- **Google as a Netlify Identity OAuth provider** — your app's end users click "Log in with Google." Any Google account works, it creates an Identity user, and it issues an `nf_jwt`. This is app-level auth.
- **Google Workspace as a SAML IdP for Team/Org SSO** — your *Netlify team members* log in to the dashboard (and, with strict mode + team-login, pass the site gate) using their corporate Google account. It does **not** create an Identity user and does **not** issue an `nf_jwt`.

Both are "sign in with Google," but they target different populations and produce different sessions. Don't assume one implies the other.

## Pick the layer

Start from what the user actually needs and walk down:

1. **Does anyone need to be blocked from loading the site at all?**
   - **No — the site is public, but I need user accounts/roles inside the app** → **Netlify Identity** (open or invite-only registration). Use the **netlify-identity** skill. Done.
   - **Yes — restrict who can reach it** → keep going.

2. **What kind of restriction?**
   - **Just keep the public out — a shared secret is fine, no per-user identity needed** (staging, a soft pre-launch gate) → **Basic Password Protection** (Pro+, one shared password). Dashboard-only.
   - **Only my employees, it's an internal tool / smaller team, and I also want to tell users apart inside the app** → **invite-only Netlify Identity** (all plans, free). Invite only company addresses; Identity itself becomes the gate because no uninvited user can sign in. **One login, full per-user identity, every plan.** This is the best default for "employees-only internal tool." Tradeoff: you manage invites manually and rely on invite links not being shared — it doesn't auto-provision from a corporate directory.
   - **Big company, app-level company SSO with a single sign-in (no double login), where company-only is enforced inside the IdP** → the **Auth0 extension**. The extension links an Auth0 tenant to your site and exposes `AUTH0_*` env vars so your app authenticates end users through Auth0; Auth0 federates to your corporate IdP (Okta, Entra, Google Workspace) and enforces who counts as company, so users sign in once. This is **app-level**, not a CDN-edge perimeter: the site still loads and your app redirects unauthenticated visitors. Use it when invite-only Identity won't scale to a real org but you don't need a true edge perimeter; that's Option D below. Configured via the Netlify Auth0 extension (dashboard); see the Netlify docs setup guide.
   - **I genuinely need a CDN-edge perimeter (Enterprise team login / SSO-gated site access) AND a separate app-level Identity** → the **two-layer pattern**. This works, but users sign in **twice** (once at the perimeter, once in the app) — there is no passthrough today. Read [references/two-layer-pattern.md](references/two-layer-pattern.md) before recommending it.

If the user isn't sure, the most common real answer is **invite-only Netlify Identity** for "just my team" and the **Auth0 extension** for "my whole company with our existing IdP." Lead with those before reaching for the double-login stack.

## The double login is real — name it early

When Password Protection (team login) and Netlify Identity are both on, **users authenticate twice** and there is no documented bridge between them — no shared cookie, no header forwarding, no JWT exchange. Don't burn iterations trying to wire the perimeter session into the app session; it isn't supported. If single sign-on matters, that's a reason to choose the Auth0 extension (or invite-only Identity) instead of the two-layer stack. Full detail and the per-option tradeoffs are in [references/two-layer-pattern.md](references/two-layer-pattern.md).

Also flag the hidden cost of team-login: it admits only **Netlify team members**, so every employee who passes that gate needs a paid Netlify seat. That alone usually rules it out for company-wide apps.

## Configuration is dashboard-only — hand it off, don't probe

Password Protection, Team/Org SAML SSO, and the Auth0 extension are all configured in the Netlify dashboard or the extensions UI — **there is no public API, CLI command, or MCP tool to set or read them**, and there is no way for an agent to see this state while writing code. So:

- Give the user the dashboard location and an exact checklist; let them flip the setting and confirm.
- **Do not** `curl https://api.netlify.com/...`, read tokens off disk, or probe for an undocumented endpoint to inspect or change access settings.
- If a documented path fails, report it to the user with context (what you tried, the URL, the error) and stop — don't work around it.

For the one piece an agent *can* read at runtime (which Identity providers are live), call `getSettings()` from `@netlify/identity` rather than hard-coding assumptions. It hits `/.netlify/identity/settings` and works against any origin serving the page, including localhost under `netlify dev` (which proxies to the live service). See the netlify-identity skill.

## References

- [Two-layer pattern (perimeter + in-app identity)](references/two-layer-pattern.md) — the four architecture options for "company-only access + per-user identity," the double-login reality, plan/seat costs, and the visibility gap.
