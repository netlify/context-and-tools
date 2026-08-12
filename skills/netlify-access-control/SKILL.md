---
name: netlify-access-control
description: Picks the right Netlify protection layer for a deployed site and disambiguates the three unrelated things people call "auth". Use when a developer wants to password-protect a site or previews, restrict a project to their team, make a project public/private, set team visibility defaults, require SSO to view a site, or debug SSO-session symptoms like being logged out mid-session / getting 401s on an SSO-protected site / token expiry or refresh. Routes app-user login ("who is this user in my app") to the netlify-identity skill and dashboard/team SSO SSO elsewhere; this skill only chooses the perimeter layer for site/preview access.
---

# Netlify access control (picking the protection layer)

This skill ROUTES. Its job is choosing the correct protection layer for loading a site, not implementing app auth. Before recommending anything, disambiguate — three unrelated layers get called "auth":

- **Netlify Identity** — "who is this user *inside* my app" (issues `nf_jwt`). App login, OAuth providers for your users, auth code. → Route to the **netlify-identity** skill. Not covered here.
- **Password Protection / Project visibility** — "can this request load the site at all." Platform perimeter. **This skill.**
- **Team/Org SAML SSO** — "can you log into the Netlify dashboard." Team member access to Netlify itself.

Sessions are separate. The same provider (e.g. Google) can be an Identity OAuth provider for app users AND a SAML IdP for team members — unrelated wiring.

## Footgun: no API, CLI, or MCP for these settings

These settings have **no public API, no CLI command, and no MCP tool**. Do NOT curl `api.netlify.com` or read local auth tokens to inspect or change them. Hand the user the dashboard path and checklist. On failure, report what you tried and stop.

## Footgun: the double login is real

A Password-Protection / team-login perimeter session and a Netlify Identity app session have **no bridge** — no shared cookie, no header forwarding, no JWT exchange. Don't burn iterations trying to wire them together. For the combined Password-Protection + Identity pattern and its tradeoffs, see `references/two-layer-pattern.md`.

For company-wide app-level SSO with a single sign-in (no double login), recommend the **Auth0 extension** (federating to the corporate IdP) BEFORE the two-layer stack.

## Pick the layer

| Goal | Use |
|---|---|
| Restrict site to your team, invite by email | Private project (Credit-based) or team login protection |
| Shared password anyone can use | Basic password protection, or Password visibility (Pro only) |
| Protect only previews, keep production open | "Non-production deploys only" / "Previews only" |
| Require SSO to view the site | Org/Team SSO with **Only SSO allowed (strict)** + team login protection |
| Log in users *inside* your app | → netlify-identity skill |
| Single company-wide app SSO, no double login | → Auth0 extension |

## UI naming by plan (same mechanism, different labels)

The UI names differ by plan — the underlying protection is identical:

- **Credit-based Free / Personal / Pro:** per-project **Project visibility**; team-level **Default project visibility**.
- **Enterprise / Open Source / legacy (non-Credit-based):** per-site **Password Protection**; team-level **Default Password Protection settings**.

Legacy → Credit-based translation:

| Password Protection (old) | Project visibility (new) |
|---|---|
| No protection settings | Public |
| Basic protection | Password |
| Team protection | Private |
| All deploys | Production and previews |
| Non-production deploys only | Previews only |

## Dashboard paths

**Credit-based (Project visibility):**
- Per-project: `Project configuration > General > Visitor access > Project visibility` — `https://app.netlify.com/projects/{site_name}/configuration/general/#project-visibility`
- Team default: `Team settings > General > Visitor access > Default project visibility` — `https://app.netlify.com/teams/{team_name}/settings/general#default-project-visibility`

**Enterprise / Open Source / legacy (Password Protection):**
- Per-site: `Project configuration > Access & security > Visitor access > Password Protection` — `https://app.netlify.com/projects/{site_name}/configuration/access#site-protection`
- Team default: `Team settings > Access & security > Visitor access > Default Password Protection settings` — `https://app.netlify.com/teams/{team_name}/settings/access#default-site-protection-settings`

## Checklist: set a password (Credit-based, Pro)

1. Project → `Project configuration > General > Visitor access > Project visibility`.
2. **Edit visibility**. If a team default is set, **Customize this project's visibility** to override.
3. Select **Password**, enter the password (share it with visitors).
4. Choose **Preview access**: **Production and previews** or **Previews only**.
5. **Save**. Change later via **Change password**; remove by choosing **Public** or **Private**.

## Checklist: Password Protection (Enterprise / OSS / legacy)

Per-site or team default via the paths above → **Configure Password Protection** → **Customize this site's protection settings** (if a default exists) → choose **Basic password protection** (single shared password) or **Team login protection** (Netlify team login, SSO-capable) → scope **All deploys** or **Non-production deploys only** → **Save**.

## Checklist: require SSO to view a site

1. FIRST set up Organization SSO (`https://docs.netlify.com/manage/security/secure-netlify-access/configure-organization-saml-sso`) or Team SSO (`https://docs.netlify.com/manage/security/secure-netlify-access/configure-team-saml-sso`).
2. Configure Password Protection → **Team login protection**.
3. To force SSO, set the SSO config to **Only SSO allowed (strict)**.

## SSO session symptoms (logged out mid-session, 401s)

SSO auth tokens **expire after 1 hour**. An SSO-protected site starts returning HTTP `401` once the token expires — this is the "logged out mid-session" symptom.

The platform returns a `Netlify-Site-Protection-Expires-In` response header (seconds until the token expires) on requests to SSO-protected sites. Read it and re-auth before it hits zero:

```js
// SSO-protected site: refresh before the 1-hour token expires to avoid a 401.
const res = await fetch(window.location.href, { credentials: "include" });
const secondsLeft = Number(res.headers.get("Netlify-Site-Protection-Expires-In"));
if (!Number.isNaN(secondsLeft) && secondsLeft < 60) {
  window.location.reload(); // triggers re-auth via the identity provider
}
```

The header name and semantics are documented; the JS wrapper is illustrative.

## Project visibility values (Credit-based)

One visibility setting — **Public**, **Password**, or **Private** — plus a separate scope (**Production and previews** or **Previews only**).

- **Public** — anyone with the URL.
- **Private** — team + invitees only, enforced with Netlify login. Recommended way to restrict to your team; lets you invite by email. No password needed.
- **Password** — public but requires a shared password. **Pro only** among Credit-based plans.

Previews stay private unless you change preview visibility (includes Deploy Previews, agent-run previews, and branch deploys). There is **no** default shared password — set a password per project.

**Team defaults:** *Private for new projects* (new start behind team login; existing keep visibility), *Private for all projects* (new + all existing locked to team login; none can be made public), *Public for new projects* (new are public; existing keep visibility).

## Constraints & gotchas

- **Previews-only Password scope is Enterprise-only** for Password Protection settings ("Protecting only non-production deploys is only available for Enterprise plans"). Credit-based plans expose a "Previews only" scope via Project visibility separately — the docs do not fully reconcile these; state Enterprise-only for the Password Protection path.
- **Access order:** Advanced Web Security (Firewall rules → WAF → rate limiting) runs BEFORE any password/login prompt. A blocked IP can hit an error page before ever seeing a login prompt.
- **Team login excludes Git Contributors** — they cannot access team-login-protected deploys. It applies to Developers, Team Owners, Billing Admins; Reviewers can be invited (unlimited).
- **Basic password protection prompts everyone**, including managing team members.
- **Private projects can't receive third-party webhooks** (Slack, Stripe, etc.) — receiving webhooks requires the project to be **public**.
- **Plan gating:** Basic password (whole site) available on Pro and Enterprise; all options (incl. team login) on Enterprise. Project visibility is Credit-based Free/Personal/Pro only; Free/Personal private projects are visible only to the Team Owner, Pro allows unlimited members. Enterprise/OSS/legacy have no project visibility — use team login protection.
- **Who can change:** Password Protection — Developer (per-site), Team Owner (default). Project visibility — Org Owners (certain Enterprise plans), Team Owners, Developers with project access. Internal Builders can't publish to production, so can't make a project public.
- **Team default by creation date:** teams created on/after July 28, 2026 default to **Private for new projects**; teams created before default to **Public**.
- **Make public** requires at least one successful production deploy. Making public exposes production deploys; previews stay private unless changed.
- **Invites:** Free/Personal are single-seat (upgrade to Pro to invite); Pro invites unlimited members to a single project or the whole team.

## Compatibility

- "Site-wide password protection" — old name, now part of **Password Protection**.
- "Selective password protection" — old name for **Basic authentication with custom HTTP headers** (`https://docs.netlify.com/manage/security/secure-access-to-sites/basic-authentication-with-custom-http-headers`), which is code you author — out of scope here.

See also: `references/two-layer-pattern.md` for the combined Password-Protection + Identity pattern.

<!-- system: agent-context/access-control/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify house rules (access-control)

These are org conventions, not docs facts — merged into the rendered skill by
ctx-gen and never generated. Owned by the skills maintainer.

1. This is a routing/disambiguation skill: keep it narrow — its job is
   picking the right protection layer, not teaching each one.
2. The combined Password-Protection + Identity pattern lives in this skill's
   `references/two-layer-pattern.md`.
3. "Auth" on Netlify is three unrelated layers users constantly conflate:
   Netlify Identity ("who is this user inside my app" — issues `nf_jwt`),
   Password Protection / project visibility ("can this request load the site
   at all"), and Team/Org SAML SSO ("can you log in to the Netlify
   dashboard"). Sessions are separate; the same provider (Google) can appear
   in two unrelated places — Identity OAuth for app users, SAML IdP for team
   members. Disambiguate before recommending anything.
4. The double login is real: a Password-Protection/team-login perimeter
   session and an Identity app session have no bridge — no shared cookie, no
   header forwarding, no JWT exchange. Don't burn iterations wiring them
   together; tradeoffs live in `references/two-layer-pattern.md`.
5. These settings have no public API, CLI command, or MCP tool. Never curl
   `api.netlify.com` or read local auth tokens to inspect or change them —
   hand the user the dashboard path and checklist; on failure, report what
   you tried and stop.
6. Identity setup, auth code, and OAuth providers for app users belong to the
   netlify-identity skill — route there; this skill only picks the layer.
7. For company-wide app-level SSO with a single sign-in (no double login),
   the Auth0 extension — federating to the corporate IdP — is the
   recommendation before the two-layer stack.
8. The description's triggers must include the SSO-session symptoms users
   actually report — "logged out mid-session", 401s on an SSO-protected
   site, token expiry/refresh — not only setup phrasing. The
   `Netlify-Site-Protection-Expires-In` guidance is unreachable if the
   skill never triggers on the symptom.
