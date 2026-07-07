import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: [context.dev] deploy context vs [dev] server block",
  prompt:
    "In netlify.toml I want two things for the `dev` context. (1) Set `NODE_ENV = development` and `DEBUG = true` as environment variables for the dev context. (2) Configure the local dev server so `netlify dev` serves on `port = 8888` and proxies to my app on `targetPort = 3000`. I was going to put everything inside one `[dev]` block — is that right?",
  judge: [
    { check: "Treats `[dev]` and `[context.dev]` as two distinct tables: `[dev]` configures the local `netlify dev` server, while `[context.dev]` is a deploy context that can set `environment`" },
    { check: "Places the environment variables (`NODE_ENV`, `DEBUG`) under the `[context.dev]` context — e.g. `[context.dev.environment]` or `environment = { NODE_ENV = 'development', DEBUG = 'true' }` — not inside the `[dev]` block" },
    { check: "Configures the dev server keys `port = 8888` and `targetPort = 3000` inside the `[dev]` block" },
    { check: "Does NOT put environment variables inside `[dev]`, and does NOT put dev-server keys (`port`/`targetPort`) under `[context.dev]`" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
