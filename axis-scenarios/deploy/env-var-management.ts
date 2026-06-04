import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Deploy: managing environment variables across contexts",
  prompt:
    "We have a Netlify site already linked locally. We need to set `STRIPE_SECRET_KEY` (different value for production vs deploy previews), and a public `NEXT_PUBLIC_ANALYTICS_ID` (same value for both). The Stripe key is sensitive. Tell me the exact `netlify` CLI commands to set these correctly, and explain how a Netlify function would read the Stripe key at runtime.",
  judge: [
    { check: "Uses `netlify env:set STRIPE_SECRET_KEY <value> --context production` and a separate `--context deploy-preview` invocation to give them different values" },
    { check: "Marks the Stripe key as secret via the `--secret` flag (or equivalent CLI option) so it's not exposed in build logs" },
    { check: "Does NOT instruct the user to put `STRIPE_SECRET_KEY` in netlify.toml or commit it to .env in the repo" },
    { check: "Sets `NEXT_PUBLIC_ANALYTICS_ID` without `--secret` — values prefixed with `NEXT_PUBLIC_` end up in the client bundle and cannot be secret" },
    { check: "Function code reads the Stripe key via `Netlify.env.get('STRIPE_SECRET_KEY')` — NOT `process.env.STRIPE_SECRET_KEY`" },
    { check: "Does NOT recommend `VITE_` or `PUBLIC_` prefixing for any secret value" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
