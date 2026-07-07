import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: guarantee execution order of two functions on one path",
  prompt:
    "Set up two Netlify edge functions that both run on `/members/*`. One is `netlify/edge-functions/banner-inject.ts`, which rewrites the response HTML to add a members banner. The other is `netlify/edge-functions/session-gate.ts`, which redirects visitors without a `session` cookie to /login. The session gate MUST run BEFORE the banner injector on every /members/* request — we don't want to rewrite HTML for a visitor who's about to be bounced to login. Wire them up so that order is guaranteed.",
  judge: [
    { check: "Creates both functions under netlify/edge-functions/ (banner-inject and session-gate) using the modern default-export (req, context) signature" },
    { check: "Recognizes that inline `export const config` declarations on the same path execute in alphabetical order by filename, which for these files would run banner-inject before session-gate — the wrong order for the requirement" },
    { check: "Guarantees session-gate runs first by declaring the two functions in netlify.toml with `[[edge_functions]]` entries, listing session-gate before banner-inject — netlify.toml-declared functions run in top-to-bottom file order and run before inline-declared ones" },
    { check: "Does NOT rely on inline-config alphabetical ordering, nor invent a `priority`/`order` config field, to enforce the required execution order" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
