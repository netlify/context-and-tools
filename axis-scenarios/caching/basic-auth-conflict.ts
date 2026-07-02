import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Caching: basic auth vs site-wide CDN caching conflict",
  prompt:
    "Set up site-wide HTTP basic auth so our whole staging site is password-protected, and at the same time keep relying on Netlify's CDN caching for fast page loads. Configure both.",
  judge: [
    { check: "Surfaces the conflict: turning on site-wide HTTP basic auth disables Netlify's CDN caching for the entire site — the two requirements as stated cannot both hold" },
    { check: "Does NOT silently configure basic auth and caching together while implying caching still works behind the password" },
    { check: "Offers a path forward — e.g. flags the tradeoff for the user to decide, or proposes an alternative (scoped/app-level auth on only the routes that need protection instead of site-wide) so caching can remain on the rest" },
    { check: "Does NOT invent a Netlify config option that keeps CDN caching enabled underneath site-wide basic auth" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
