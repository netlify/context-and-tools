import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Image CDN: allowlist a remote source",
  prompt:
    "Our marketing team's images live on an external CDN at https://cdn.example.com/marketing/<path>. Configure Netlify so we can transform and serve those images through Netlify's Image CDN (e.g. resizing, format conversion). Show me the netlify.toml change and the resulting URL shape I'd put in an <img> tag.",
  judge: [
    { check: "Adds an `[images]` block in netlify.toml with `remote_images = [ ... ]` containing a regex that matches `https://cdn.example.com/marketing/...`" },
    { check: "Regex correctly escapes the `.` in the hostname (e.g. `https://cdn\\\\.example\\\\.com/marketing/.*`) so it doesn't act as the regex wildcard" },
    { check: "Regex is scoped to the marketing path — does NOT use an overly broad pattern like `https://.*` or the bare hostname without a path" },
    { check: "Sample `<img>` URL points to `/.netlify/images?url=https://cdn.example.com/marketing/<path>&...` and passes transform query params (e.g. `w`, `fm`, `q`). The marketing path shown has no reserved characters, so percent-encoding the source URL is optional here — accept it raw or encoded. HTML-escaping `&` to `&amp;` is NOT required" },
    { check: "Does NOT instruct the user to download and re-upload the marketing images into the Netlify site — the whole point of remote_images is to transform them in place" },
    { check: "Does NOT involve writing a Netlify Function to proxy/fetch the images — Image CDN handles the remote fetch once allow-listed" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
