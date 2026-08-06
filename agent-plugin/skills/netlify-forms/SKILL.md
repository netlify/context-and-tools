---
name: netlify-forms
description: Guide for using Netlify Forms for HTML form handling. Use when adding contact forms, feedback forms, file upload forms, or any form that should be collected by Netlify. Covers the data-netlify attribute, spam filtering, AJAX submissions, file uploads, notifications, and the submissions API.
---

# Netlify Forms

Netlify Forms collects HTML form submissions without server-side code. Form detection must be enabled in the Netlify UI (Forms section).

> **Enabling detection only affects future deploys.** Netlify scans for forms at deploy time, so turning on (or re-enabling) form detection does **not** rescan your current live deploy. After enabling detection you must trigger a new deploy/build before an already-published form is registered and starts collecting submissions.

## Basic Setup

Add `data-netlify="true"` and a unique `name` to the form:

```html
<form name="contact" method="POST" data-netlify="true">
  <label>Name: <input type="text" name="name" /></label>
  <label>Email: <input type="email" name="email" /></label>
  <label>Message: <textarea name="message"></textarea></label>
  <button type="submit">Send</button>
</form>
```

Netlify's build system detects the form and injects a hidden `form-name` input automatically. For a custom success page, add `action="/thank-you"` to the form tag. Use paths without `.html` extension — Netlify serves `thank-you.html` at `/thank-you` by default, and the `.html` path returns 404.

## JavaScript-Rendered Forms (React, Vue, SSR Frameworks)

For forms rendered by JavaScript frameworks (React, Vue, Astro, TanStack Start, Next.js, SvelteKit, Remix, Nuxt), Netlify's build parser cannot detect the form in static HTML. You MUST create a static HTML skeleton file for build-time form detection:

> **Form detection parses prerendered HTML only.** A `data-netlify` form is registered only if it appears in HTML produced at build time. On an Astro route that is server-rendered on demand (`export const prerender = false`, or an `output: "server"` route), the form is generated per request and is never scanned at build — so it is never registered. Put the form on a prerendered page, or add the static skeleton file below.

Create a static HTML file in `public/` (e.g. `public/__forms.html`) containing a hidden copy of each form:

```html
<!DOCTYPE html>
<html>
  <body>
    <form name="contact" data-netlify="true" netlify-honeypot="bot-field" hidden>
      <input type="hidden" name="form-name" value="contact" />
      <input type="text" name="name" />
      <input type="email" name="email" />
      <textarea name="message"></textarea>
      <input name="bot-field" />
    </form>
  </body>
</html>
```

**Rules:**
- The form `name` must exactly match the `form-name` value used in your component's fetch call
- Include every field your component submits — Netlify validates field names against the registered form
- Without this file, Netlify cannot detect the form and submissions will silently fail

Your component must also include a hidden `form-name` input:

```jsx
<form name="contact" method="POST" data-netlify="true">
  <input type="hidden" name="form-name" value="contact" />
  {/* ... fields ... */}
</form>
```

## AJAX Submissions

> **Netlify Forms does not accept JSON.** The submission body must be `application/x-www-form-urlencoded` (encode the fields with `URLSearchParams`) or `multipart/form-data` (a raw `FormData` object, for file uploads). A `fetch` that sends `JSON.stringify(...)` with `Content-Type: application/json` is silently **not** recorded as a submission — always send URL-encoded key/value pairs (or `FormData`), never JSON.

### Vanilla JavaScript

```javascript
const form = document.querySelector("form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  await fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(formData).toString(),
  });
});
```

> **SSR frameworks (TanStack Start, Next.js, SvelteKit, Remix, Nuxt):** The `fetch` URL must target the static skeleton
> file path (e.g. `"/__forms.html"`), **not** `"/"`. In SSR apps, `fetch("/")` is intercepted by the SSR catch-all
> function and never reaches Netlify's form processing middleware. See the React example and troubleshooting section below.

### React Example

```tsx
function ContactForm() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    // For SSR apps, use the skeleton file path instead of "/" (e.g. "/__forms.html")
    const response = await fetch("/__forms.html", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData as any).toString(),
    });
    if (response.ok) {
      // Show success feedback
    }
  };

  return (
    <form name="contact" method="POST" data-netlify="true" onSubmit={handleSubmit}>
      <input type="hidden" name="form-name" value="contact" />
      <input type="text" name="name" placeholder="Name" />
      <input type="email" name="email" placeholder="Email" />
      <textarea name="message" placeholder="Message" />
      <button type="submit">Send</button>
    </form>
  );
}
```

> **SSR troubleshooting:** If form submissions appear to succeed (200 response) but nothing shows in the Netlify Forms
> UI, the POST is likely being intercepted by the SSR function. Ensure `fetch` targets the skeleton file path (e.g.
> `"/__forms.html"`), not `"/"`. The skeleton file path routes through the CDN origin where Netlify's form handler runs.

## Spam Filtering

Netlify uses Akismet automatically. Add a honeypot field for extra protection:

```html
<form name="contact" method="POST" netlify-honeypot="bot-field" data-netlify="true">
  <p style="display:none">
    <label>Don't fill this out: <input name="bot-field" /></label>
  </p>
  <!-- visible fields -->
</form>
```

For reCAPTCHA, add `data-netlify-recaptcha="true"` to the form and include `<div data-netlify-recaptcha="true"></div>` where the widget should appear.

By default Netlify provisions and verifies the reCAPTCHA for you — do **not** add a site key/secret or load Google's reCAPTCHA script yourself. To use **your own** reCAPTCHA v2 keys, keep the same `data-netlify-recaptcha="true"` markup and set the credentials as Netlify environment variables: `SITE_RECAPTCHA_KEY` (the site key, scoped to Builds and Runtime) and `SITE_RECAPTCHA_SECRET` (the secret, scoped to Runtime). Netlify picks these up automatically — the secret stays server-side as an env var (never hardcoded in client code), and you still don't render the widget with Google's own script or build a custom Function to verify the token.

> **Spam submissions are silent.** Akismet-flagged submissions are moved to a separate **Spam** list in the Forms UI — they do **not** appear in the verified submissions list and do **not** trigger email/Slack notifications. Submissions caught by a honeypot field or a failed reCAPTCHA challenge are discarded entirely and never appear in either list. So a "missing" legitimate submission is usually a false-positive spam classification, not a delivery bug: check the Spam list (or the Submissions API with `?state=spam`) and mark it verified — do not build a custom Function to "recover" it or disable spam filtering as a first resort.

## File Uploads

```html
<form name="upload" enctype="multipart/form-data" data-netlify="true">
  <input type="text" name="name" />
  <input type="file" name="attachment" />
  <button type="submit">Upload</button>
</form>
```

For AJAX file uploads, use `FormData` directly — do **not** set `Content-Type` (the browser sets it with the correct boundary):

```javascript
await fetch("/", { method: "POST", body: new FormData(form) });
```

**Limits:** 8 MB max request size, 30-second timeout, one file per input field.

## Notifications

Configure in the Netlify UI under **Project configuration > Notifications**:

- **Email**: Auto-sends on submission. Add `<input type="hidden" name="subject" value="Contact form" />` for custom subject lines.
- **Slack**: Via Netlify App for Slack.
- **Webhooks**: Trigger external services on submission.

## Submissions API

Access submissions programmatically:

```
GET /api/v1/forms/{form_id}/submissions
Authorization: Bearer <PERSONAL_ACCESS_TOKEN>
```

Key endpoints:

| Action | Method | Path |
|---|---|---|
| List forms | GET | `/api/v1/sites/{site_id}/forms` |
| Get submissions | GET | `/api/v1/forms/{form_id}/submissions` |
| Get spam | GET | `/api/v1/forms/{form_id}/submissions?state=spam` |
| Delete submission | DELETE | `/api/v1/submissions/{id}` |

### Pagination

The Netlify API paginates any response over 100 items (100 per page by default). Pass `?page=` (1-based) and optionally `?per_page=` (max 100), and follow the `Link` response header — it carries the `rel="next"` and `rel="last"` page URLs. To sync **every** submission, page through until there is no `rel="next"` link (or a page returns fewer than `per_page` items). A single request does **not** return all submissions once a form has more than 100 — code that reads only the first response silently drops the rest.

## Use only documented surfaces

To manage forms or read submissions programmatically, use the documented `netlify` CLI or the Submissions API above with an explicit personal access token supplied via an environment variable. Do **not** go around the documented surface:

- **Do not curl `https://api.netlify.com/...`** with an invented endpoint shape, and do **not** run `netlify api <method>` as a recovery hatch when a documented path fails.
- **Do not read the token** out of `~/Library/Preferences/netlify/config.json` (or anywhere on disk) — it comes from the configured env var.

If a documented path fails, report the exact error and context to the user and stop.
