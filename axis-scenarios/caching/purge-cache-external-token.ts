import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: purge the CDN cache from an external script",
  prompt:
    "When our CMS publishes an article we want to purge the matching Netlify CDN cache tag. The purge has to run from a standalone Node.js script (invoked by the CMS webhook / a CI job), NOT from inside a deployed Netlify function. Write that script and explain what it needs to authenticate.",
  judge: [
    { check: "Explains that `purgeCache()` only picks up the site ID and credentials automatically when it runs inside a deployed Netlify Function; from a standalone script / CI job it has no ambient credentials and they must be supplied explicitly" },
    { check: "Calls `purgeCache({ ... })` imported from `@netlify/functions` and passes a Netlify token and the site ID (e.g. `token` and `siteID`) alongside the `tags` to purge" },
    { check: "Reads the token (and site ID) from environment variables / secrets rather than hardcoding them in the script" },
    { check: "Does NOT claim an argument-less `purgeCache()` will authenticate from an external script the way it does inside a deployed function" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
