import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Image CDN: non-allowlisted remote URL 404s (add remote_images)",
  prompt:
    'In production, `<img src="/.netlify/images?url=https://assets.partner.com/logo.png&w=200" />` returns a 404. But if I open https://assets.partner.com/logo.png directly in my browser it loads fine, and my local same-site images go through the Image CDN without issue. Why is only this one 404ing, and how do I fix it?',
  judge: [
    { check: "Diagnoses that the remote host `assets.partner.com` is not in the `remote_images` allowlist, so Netlify rejects the transform with a 404 rather than fetching/proxying it" },
    { check: "Explains that Image CDN does NOT proxy arbitrary external hosts — remote sources must be explicitly allow-listed (it's a strict allowlist, not a fallback)" },
    { check: "Fix: add an `[images]` block in netlify.toml with `remote_images` containing a regex that matches the partner host (e.g. `https://assets\\\\.partner\\\\.com/.*`)" },
    { check: "The regex escapes the `.` in the hostname so it isn't treated as the regex wildcard" },
    { check: "Regex is reasonably scoped to the host/path — NOT an overly broad pattern like `https://.*`" },
    { check: "Does NOT suggest the fix is to download/re-host the image into the site or to write a proxy Function — allowlisting via `remote_images` is the intended path" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
