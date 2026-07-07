import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// A bearer/signing token hardcoded into source (or any file the build
// publishes) trips Netlify's secrets scanning and fails the deploy AFTER an
// otherwise-green build. Fix: move it to a secret env var read via
// Netlify.env.get, and rotate the leaked token -- don't disable the scanner.
// Grounded in netlify-mcp-servers/SKILL.md + netlify-deploy/SKILL.md.
export default {
  name: "MCP Servers: hardcoded bearer token fails the deploy via secrets scanning",
  prompt:
    "I hardcoded my MCP bearer token as a string in netlify/functions/mcp.ts just to test quickly. The build succeeds but the deploy then fails with 'Secrets scanning found secrets'. Why does it fail after a green build, and what's the correct fix?",
  judge: [
    {
      check:
        "Explains that Netlify's secrets scanning runs AFTER the build succeeds and fails the deploy when it finds a secret value (the token) in source or published output -- so an otherwise-green build can still fail here; it's not a build bug",
    },
    {
      check:
        "Correct fix: remove the hardcoded token and store it as a Netlify SECRET env var (e.g. `netlify env:set MCP_BEARER_TOKEN <value> --secret`), reading it at runtime with `Netlify.env.get(...)` -- never hardcoded in source",
    },
    {
      check:
        "Because the token was committed to the repo it is leaked -- rotates/regenerates it (e.g. a fresh `openssl rand -hex 32`) rather than reusing the exposed value",
    },
    {
      check:
        "Does NOT resolve it by disabling the scanner (`SECRETS_SCAN_ENABLED=false`) or broadly omitting the key to silence what is a real secret -- that just ships the leak",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
