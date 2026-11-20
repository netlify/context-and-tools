---
name: netlify-forms
description: Use this skill whenever a developer wants to add a contact form, signup form, file upload form, or any HTML form to a Netlify site without a backend, or asks why form submissions are missing, going to spam, or returning 404. It covers data-netlify form markup, AJAX/fetch submission, React/Vue/Next.js/Nuxt/SvelteKit/Astro JS-rendered or SSR forms that need a static skeleton, custom thank-you pages, honeypot or reCAPTCHA spam protection, email/Slack/webhook notifications and subject lines, reading or exporting submissions through the Netlify API, and triggering functions on form submission.
---

# Netlify Forms

## Use this / not that

```html
<!-- ✅ Reach for this -->
<form name="contact" method="POST" data-netlify="true"> … </form>
```
```js
// ✅ URL-encoded body built from FormData
fetch(target, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(new FormData(form)).toString(),
});

// ❌ JSON is NOT supported. Submissions are lost.
fetch(target, { method: "POST", body: JSON.stringify(data) });
```

- `netlify` (bare attribute) works the same as `data-netlify="true"`.
- `data-remove-prefix` only applies to legacy forms created before May 5, 2023. Don't add it to new forms.

> ⚠️ **Prerequisite:** enable **Forms > Enable form detection** in the UI (https://app.netlify.com/projects/{site_name}/forms), then **redeploy**. Without detection, new or changed forms accept no submissions. Enabling has no effect until the next deploy.

## How detection works

- At deploy time, Netlify parses the **static HTML output** and finds `<form>` tags with `data-netlify="true"` or `netlify`.
- It strips that attribute (and `netlify-honeypot`) and injects `<input type="hidden" name="form-name" value="<name>">`.
- The form `name` is the form's identity in the UI. It must be unique per site.
- Fields are identified by their `name` attributes. Multi-selects can use `name="role[]"`.
- Forms rendered only by client-side JS or SSR are invisible to the build. They need a static HTML counterpart.

## Static HTML form (complete)

```html
<form name="contact" method="POST" data-netlify="true" action="/thank-you">
  <input type="hidden" name="subject" value="New lead from %{formName} (%{submissionId})" />
  <label>Name <input type="text" name="name" /></label>
  <label>Email <input type="email" name="email" /></label>
  <label>Role
    <select name="role[]" multiple>
      <option value="leader">Leader</option>
      <option value="follower">Follower</option>
    </select>
  </label>
  <label>Message <textarea name="message"></textarea></label>
  <button type="submit">Send</button>
</form>
```

- **`action`:** optional custom success page. It must start with `/` (site-root relative). Without it, visitors see a generic Netlify success page.
- **`email` field:** sets `Reply-to` on notification emails. Otherwise replies go to `formresponses@netlify.com`.
- **`subject` hidden input:** sets the notification subject (details below).

### AJAX for a static page

```js
document.querySelector("form").addEventListener("submit", (event) => {
  event.preventDefault();
  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(new FormData(event.target)).toString(),
  })
    .then(() => alert("Thank you for your submission"))
    .catch((error) => alert(error));
});
```

`form-name` must be in the body. `FormData` picks up the injected hidden input automatically.

## JS-rendered / SSR forms (React, Vue, Gatsby, Next.js, Nuxt, SvelteKit, Astro)

Two parts are required: a detectable static skeleton, plus a component that sends `form-name`.

**1. `public/__forms.html`** — a hidden static copy of every form. Each input `name` must exactly match what the component submits.

```html
<!DOCTYPE html>
<html>
  <body>
    <form name="pizzaOrder" data-netlify="true" netlify-honeypot="bot-field" hidden>
      <input type="hidden" name="form-name" value="pizzaOrder" />
      <input name="bot-field" />
      <input name="order" type="text" />
      <input name="email" type="email" />
    </form>
  </body>
</html>
```

If the form uses Netlify-provided reCAPTCHA, also include `<div data-netlify-recaptcha="true"></div>` in the skeleton.

**2. Component** — includes the hidden `form-name` input (or put `form-name` in the POST body) and submits via AJAX.

```jsx
export default function PizzaForm() {
  const [status, setStatus] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const body = new URLSearchParams(new FormData(event.target)).toString();
    try {
      const res = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form name="pizzaOrder" method="POST" onSubmit={handleSubmit}>
      <input type="hidden" name="form-name" value="pizzaOrder" />
      <p hidden><input name="bot-field" /></p>
      <input name="order" type="text" />
      <input name="email" type="email" />
      <button type="submit">Order</button>
      {status === "ok" && <p>Thanks!</p>}
    </form>
  );
}
```

- **Next.js Runtime v5 (Next.js 13.5+):** form definitions must live in a dedicated static HTML file, and submission must be AJAX, not full-page navigation. See https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview#v5-breaking-changes
- **After AJAX success:** handle it in JS, for example `navigate("/thank-you/")` in Gatsby, or set state as above.

## File uploads

```html
<form name="fileForm" method="POST" enctype="multipart/form-data" data-netlify="true">
  <input name="name" type="text" />
  <input name="file" type="file" />
  <button>Submit</button>
</form>
```
```js
document.forms.fileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  fetch("/", { method: "POST", body: new FormData(event.target) }); // NO Content-Type header
});
```

> ⚠️ **Do not set `Content-Type` when uploading files.** Pass `FormData` directly and let the browser set the multipart boundary.

- One file per `<input type="file">`. Use multiple fields for multiple files.
- The request is capped at **8 MB** total.
- Uploads time out after **30 s**.
- For uploads containing PII, add extra security (the docs suggest Very Good Security: https://www.netlify.com/integrations/very-good-security/).
- File links are available in the API, the UI, notification emails, and CSV exports.

## Spam protection

Akismet filters every submission automatically. Flagged submissions go to **Spam submissions**, not the default list.

> ⚠️ **Honeypot and reCAPTCHA failures are rejected outright.** They never appear in the spam list, so there is nothing to recover.

**Honeypot:**
```html
<form name="contact" method="POST" netlify-honeypot="bot-field" data-netlify="true">
  <p class="hidden"><label>Don't fill this out: <input name="bot-field" /></label></p>
  …
</form>
```
- The field must be hidden via CSS or JS.
- Any value in the field causes a quiet rejection.
- AJAX bodies must include the honeypot field. `FormData` does this.

**Netlify-provided reCAPTCHA 2:**
- Add `data-netlify-recaptcha="true"` on `<form>`.
- Add `<div data-netlify-recaptcha="true"></div>` where the widget should render.
- Only **one per page** is allowed. Use custom reCAPTCHA for more.
- On failure, the visitor is redirected back to the same page.

**Custom reCAPTCHA 2:**
1. Add your own Google widget and script.
2. Add `data-netlify-recaptcha="true"` on `<form>`.
3. Set these env vars:

| Var | Value | Scopes |
|---|---|---|
| `SITE_RECAPTCHA_KEY` | site key | **Builds + Runtime** |
| `SITE_RECAPTCHA_SECRET` | secret key | **Runtime** |

The body must include a valid `g-recaptcha-response` (`FormData` includes it).

**Test submissions "missing":** they are probably in Akismet spam. Avoid this with a real email (not `test@test.com`), real sentences in textareas, and spaced-out submissions from the same IP.

## Notifications

Configure in **Forms > Submission notifications** (https://app.netlify.com/projects/{site_name}/forms?tab=notifications).

- **Destinations:** email, webhook (HTTP POST), or Slack (via https://docs.netlify.com/extend/install-and-use/setup-guides/netlify-app-for-slack).
- **Integrations:** Zapier and n8n.
- **Firing:** only on **verified** submissions, either per form or for all forms.

**Email recipients** must be active team members or confirmed outside addresses:
- An outside address stays **pending confirmation**. Nothing is sent until the owner clicks **Confirm** in the single confirmation email.
- Confirmation is rolling out gradually. If unavailable, saving a non-team address fails validation. Invite the person to the team first.

**Subject line:**
- Use a hidden `<input type="hidden" name="subject" value="…">`.
- Variables: `%{formName}`, `%{siteName}`, `%{submissionId}`.
- **The HTML subject overrides the UI subject.** To use the UI subject, remove the HTML input.
- Legacy forms created before May 5, 2023 get a `[Netlify]` prefix. Drop it either with `data-remove-prefix` on the `subject` input or by setting the subject in the UI.

## Submissions & API

**API** (https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api#forms):
- Supports listing verified and spam submissions, plus deleting submissions or forms.
- Endpoint: `listFormSubmissions` (https://open-api.netlify.com/#tag/submission/operation/listFormSubmissions).
- The API retains data from renamed or removed fields. The UI shows only fields from the latest deployed form version.

**Function on submission:** a function can run when a submission is verified. See https://docs.netlify.com/build/functions/trigger-on-events

**UI** (**Forms** tab, under **Active forms**):
- **CSV export:** **Download as CSV** exports verified submissions.
- **State changes:** **Mark as spam** / **Mark as verified**.
- **Deletion:** deleting submissions is permanent.

**Submission summary** (shown for each item in the UI list):
- Title: the first visible, non-email text `<input>`. If none exists, a field named `title` or `subject` is used.
- Body: the first `<textarea>`.
- If neither exists, the first field with data is shown.
- Field order in your HTML matters.

**Sanitization:** content is sanitized automatically. `<script>` is stored as `&lt;script&gt;`. For PII, export and delete submissions regularly.

## Gotchas

> ⚠️ **Deleting a form is irreversible.** It deletes all submissions, and future POSTs return `404`. Export CSV first. Uploaded files stay reachable by direct URL for 24 h after deletion.

> ⚠️ **Renaming or retyping a field hides old data in the UI.** Mark the old field `hidden` instead of removing it. Old data remains in the API.

- **Disabling form detection** (**Forms > Form detection**) is only for sites not using Forms:
  - Existing, unchanged forms keep working.
  - New or updated forms stop accepting submissions.
  - Re-enabling requires a redeploy.
- **Custom success page 404s:** put a test link with the exact `action` path on the form page and verify it resolves.
- **Extra spam prevention:** the form detail page shows whether **Extra spam prevention** (honeypot or reCAPTCHA) is active.
- **Debugging guide:** https://answers.netlify.com/t/common-issue-how-to-debug-your-form/92

<!-- gaps: webhook payload/signing format and default email subject text are undocumented in sources; unclear whether %{formName}/%{siteName}/%{submissionId} is the full variable list. -->

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
4. For JS-rendered and SSR forms, always create the static skeleton file
   `public/__forms.html`: a hidden copy of each form with
   `data-netlify="true"`, a hidden `form-name` input, and every field the
   component submits — names matching exactly (Netlify validates field names
   against the registered form). Without this file, submissions silently fail.
5. Astro routes rendered on demand (`export const prerender = false`, or
   `output: "server"` routes) are never scanned at build time, so their forms
   are never registered. Put the form on a prerendered page or rely on the
   static skeleton file.
6. A "missing" legitimate submission is usually an Akismet false positive:
   check the Spam list (or the API with `?state=spam`) and mark it verified.
   Do not build a custom recovery function or disable spam filtering as a
   first resort.
7. For custom success pages, use extensionless `action` paths (`/thank-you`,
   not `/thank-you.html`) — Netlify serves `thank-you.html` at `/thank-you`
   and the `.html` path returns 404.
