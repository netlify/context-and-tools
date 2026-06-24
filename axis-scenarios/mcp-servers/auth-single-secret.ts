import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "MCP Servers: secure a personal single-user server with a shared secret",
  prompt:
    "I've got an MCP server on Netlify that's just for me. How do I lock it down so only I can call it? Keep it as simple as possible.",
  judge: [
    { check: "Recommends a SINGLE SHARED SECRET (one bearer token in an env var) as the right fit for a personal / single-user server — does not over-engineer it with OAuth or per-user accounts for a one-person use case" },
    { check: "Checks `Authorization: Bearer <token>` on every request and returns 401 when it is missing or wrong" },
    { check: "Compares the token in CONSTANT TIME (e.g. `crypto.timingSafeEqual`) rather than `===` / `==`, to avoid a timing side-channel" },
    { check: "Has the user generate a high-entropy token (e.g. `openssl rand -hex 32`) rather than a guessable string" },
    { check: "Stores the token as a Netlify SECRET env var (e.g. `netlify env:set MCP_BEARER_TOKEN <value> --secret`) and reads it with `Netlify.env.get(...)` — never hardcoded in source" },
    { check: "Notes that rotating/revoking means setting a new value and updating the client. Passes vacuously if not raised — it is a minor point" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
