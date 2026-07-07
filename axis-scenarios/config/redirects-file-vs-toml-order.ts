import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: _redirects file vs netlify.toml processing order",
  prompt:
    "My project has both a `_redirects` file in the publish directory and `[[redirects]]` rules in netlify.toml. Both define a rule for `/blog/*`. Which one takes effect, and in what order are the two sources processed? How should I avoid this ambiguity?",
  judge: [
    { check: "States that rules in the `_redirects` file are processed FIRST, before the `netlify.toml` `[[redirects]]` rules" },
    { check: "States the first matching rule wins (top to bottom), so the `_redirects` `/blog/*` rule takes effect and shadows the netlify.toml one" },
    { check: "Does NOT claim netlify.toml redirects are processed before the `_redirects` file, or that netlify.toml redirects override the `_redirects` file for the same path" },
    { check: "Recommends consolidating the overlapping rules into a single source to remove the shadowing ambiguity" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
