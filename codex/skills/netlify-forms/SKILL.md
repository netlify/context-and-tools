---
name: netlify-forms
description: Set up and debug Netlify Forms — serverless form handling for static HTML, JavaScript/JSX, and SSR sites. Use when adding a contact form, newsletter signup, or file-upload form; wiring AJAX/fetch form submissions; configuring email/webhook/Slack form notifications; adding spam protection (honeypot, reCAPTCHA 2); customizing form success pages or email subject lines; reading submissions via the Netlify API; or troubleshooting missing form submissions on Netlify (including Next.js, Gatsby, Nuxt, SvelteKit).
---

# Netlify Forms

Serverless form handling. Forms are detected at **deploy time** by parsing the built HTML — client-side-rendered forms are invisible to detection unless a matching static HTML form exists. Enable **form detection** in the Netlify UI (per-site) before any form works; it takes effect on the next deploy.

## Reach for this / avoid this

- Use: `<form ... data-netlify="true">` (or bare `netlify` — equivalent).
- Every form needs a unique `name`. At build time Netlify strips the `data-netlify`/`netlify` attribute and injects `<input type="hidden" name="form-name" value="<name>" />`.
- Bodies MUST be URL-encoded. **JSON form data is NOT supported** — do not `JSON.stringify` a submission.

## Static HTML form

```html
<form name="contact" method="POST" data-netlify="true">
  <p><label>Name: <input type="text" name="name" /></label></p>
  <p><label>Email: <input type="email" name="email" /></label></p>
  <p><label>Message: <textarea name="message"></textarea></label></p>
  <button type="submit">Send</button>
</form>
```

An `<input name="email" />` also sets the notification `Reply-to`.

## JavaScript / JSX / SSR forms

Client-rendered forms aren't in the built HTML, so they aren't detected. Two fixes:

1. Ship a hidden static HTML form with `data-netlify="true"` and inputs whose `name`s match your rendered form (also add a `<div data-netlify-recaptcha="true">` here if using reCAPTCHA).
2. Add a hidden `form-name` input to the rendered form matching its `name`:

```jsx
<form data-netlify="true" name="pizzaOrder" method="post" onSubmit={handleSubmit}>
  <input type="hidden" name="form-name" value="pizzaOrder" />
  <input name="order" type="text" onChange={handleChange} />
  <input type="submit" />
</form>
```

## AJAX submission (fetch, URL-encoded)

```js
const handleSubmit = event => {
  event.preventDefault();
  const formData = new FormData(event.target);
  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(formData).toString()
  })
    .then(() => console.log("submitted"))
    .catch(error => alert(error));
};
```

**SSR footgun:** In Next.js, Nuxt, SvelteKit, etc. `fetch("/")` is caught by the SSR catch-all function and never reaches form processing. POST to the static skeleton file itself (e.g. `/__forms.html`), not `/` or an arbitrary path.

`FormData` automatically includes `form-name`, honeypot, and `g-recaptcha-response` fields — use it. Body must be URL-encoded; include `form-name` in the body either way.

### AJAX file upload — omit Content-Type

Let the browser set the multipart boundary:

```js
fetch("/", { method: "POST", body: new FormData(event.target) })
  .then(() => { /* success */ })
  .catch(error => { /* fail */ });
```

## File uploads

Add `<input type="file" name="file" />` (optionally `enctype="multipart/form-data"` on the `<form>`; usually auto-detected).

- One file per field — use multiple fields for multiple files.
- Max request size **8 MB**; upload times out after **30 s**.
- After a form is deleted, uploaded files stay reachable by direct URL for **24 h**.
- For PII uploads, use the Very Good Security integration.

## Spam protection

Akismet filters all submissions automatically. Honeypot/reCAPTCHA rejects are dropped entirely (not even shown in Spam).

### Honeypot

`netlify-honeypot="bot-field"` on the `<form>`, plus a CSS-hidden field of that name. Attribute is stripped at build; any value in the field silently rejects the submission.

```html
<form name="contact" method="POST" netlify-honeypot="bot-field" data-netlify="true">
  <p class="hidden"><label>Don't fill this out: <input name="bot-field" /></label></p>
  <p><label>Email: <input type="text" name="email" /></label></p>
</form>
```

### reCAPTCHA 2 (Netlify-provided)

`data-netlify-recaptcha="true"` on the `<form>`, plus an empty `<div data-netlify-recaptcha="true"></div>` where the widget renders. Only **one** Netlify-provided reCAPTCHA per page.

### Custom reCAPTCHA 2

Needed for multiple CAPTCHAs per page, JS-injected CAPTCHAs, or more control. Set env vars:
- `SITE_RECAPTCHA_KEY` — site key; scope must include **Builds** and **Runtime**.
- `SITE_RECAPTCHA_SECRET` — secret; scope must include **Runtime**.

Submission accepted only with a valid `g-recaptcha-response` in the body (automatic with `FormData()`).

## Success handling

Redirect via `action` (path relative to site root, starting with `/`):

```html
<form name="contact" action="/pages/success" method="POST" data-netlify="true"></form>
```

Or resolve the AJAX promise: `.then(() => navigate("/thank-you/"))` or `.then(() => alert("Thanks"))`.

## Email subject line

Hidden `subject` input overrides any UI-set subject. Pick **one** place (HTML or UI) to set it — not both.

```html
<input type="hidden" name="subject" value="New lead from %{formName} (%{submissionId})" />
```

Predefined variables: `%{formName}`, `%{siteName}`, `%{submissionId}`.

For forms created before **May 5, 2023**, add `data-remove-prefix` to drop the legacy `[Netlify]` prefix while keeping the HTML subject:

```html
<input type="hidden" name="subject" data-remove-prefix value="..." />
```

Notification emails send from `formresponses@netlify.com`; set an `email` input for `Reply-to`.

## Notifications (UI)

Project configuration → Notifications → Form submission notifications → **Add notification** (email or webhook). Slack via the Netlify App for Slack. Notifications fire on verified submissions, per-form or site-wide.

## Reading submissions (API)

Use documented endpoints only. Do not invent `api.netlify.com` shapes or read tokens from local CLI config files. Get started: https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api#forms

`listFormSubmissions` retrieves submissions, including data from renamed/removed fields no longer shown in the UI: https://open-api.netlify.com/#tag/submission/operation/listFormSubmissions

**Page through results.** Follow the `Link` header — code that reads only the first response silently drops the rest.

## Submission summary (field order matters)

The UI summary is chosen by field **type**, not name:
- **Title:** first non-hidden text `<input>` that isn't email-related (`type="email"` or name matching `email`/`mail`/`from`/`twitter`/`sender`, case-insensitive). Falls back to a field named `title` or `subject`.
- **Body:** first `<textarea>`.

HTML field order determines what appears — order fields intentionally.

## Constraints & gotchas

- **Form detection must be enabled** or new/changed forms are never processed (submissions silently missing). Enable in Forms UI, then redeploy. Disabling only suits sites not using Forms.
- **Deleting a form is destructive:** future submissions return `404` and past submissions are gone. Export CSV first.
- Submitted markup is auto-sanitized (`<script>` → escaped entities).
- Store PII carefully — export and delete submissions regularly.

## Troubleshooting

- **Missing submissions:** confirm form detection is enabled (Forms → Usage and configuration → Form detection), then **redeploy**.
- **Test submissions in Spam:** use a real email, full sentences, and spread out submissions from one IP; check **Spam submissions** to find them.
- **Custom success page fails:** link to it from the form's page using the exact `action` path; verify the link works.
- **Old field data missing:** the UI only shows fields from the last deploy. Retrieve via `listFormSubmissions`; or mark old fields "hidden" instead of removing them.
- **Next.js Runtime v5 (incl. 13.5+):** extract form definitions to a dedicated static HTML file and submit via AJAX, not full-page navigation. https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview#v5-breaking-changes

<!-- system: agent-context/forms/system.md — human-owned, merged by ctx-gen; edit system.md, not this section -->
# Netlify house rules (forms)

These are org conventions and field-learned guardrails, not docs facts — they
are merged into the rendered skill by ctx-gen and are never generated.
Extracted from the previous hand-written netlify-forms skill; owned by the
skills maintainer.

1. In SSR apps (Next.js, Nuxt, SvelteKit, etc.), `fetch("/")` is intercepted
   by the SSR catch-all function and never reaches Netlify's form processing.
   POST the AJAX submission to the static skeleton file itself (e.g.
   `/__forms.html`), not to an arbitrary path.
2. Use only documented surfaces: do not curl `https://api.netlify.com/...`
   with an invented endpoint shape, and do not read tokens out of local CLI
   config files (`~/Library/Preferences/netlify/config.json`).
3. When reading submissions via the API, page through results (`Link`
   header); code that reads only the first response silently drops the rest.
