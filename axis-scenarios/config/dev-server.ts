import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Config: [dev] port vs targetPort",
  prompt:
    "My app's own dev server runs on port 3000. I want `netlify dev` to serve the full Netlify environment (functions, redirects) at http://localhost:8888 and proxy through to my app. Configure the [dev] block in netlify.toml. I always mix up port and targetPort, so get this right.",
  judge: [
    { check: "Adds a `[dev]` block to netlify.toml" },
    { check: "Sets `targetPort = 3000` — the port the app's own framework dev server listens on" },
    { check: "Sets `port = 8888` — the port Netlify Dev itself serves on (the proxy/edge layer)" },
    { check: "Does NOT swap the two: `port` must be the Netlify Dev port and `targetPort` the underlying app's port, not the reverse" },
    { check: "If it explains the keys, it correctly describes `targetPort` as the framework dev server and `port` as the Netlify Dev proxy — passes vacuously if it just sets them correctly without explaining" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
