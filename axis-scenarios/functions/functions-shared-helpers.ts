import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Functions: shared non-function helper modules",
  prompt:
    "Create two Netlify functions — netlify/functions/orders.ts (mounted at /api/orders) and netlify/functions/customers.ts (mounted at /api/customers). Both need the same database-client helper and the same auth helper — put that shared code somewhere under netlify/functions/ so it is NOT deployed as its own function endpoint, and import it into both.",
  judge: [
    { check: "Shared helpers live in an underscore-prefixed location under netlify/functions/ (e.g. netlify/functions/_shared/db.ts and _shared/auth.ts) so Netlify does NOT treat them as deployable functions" },
    { check: "Both orders.ts and customers.ts import the helpers from that shared module (relative import), rather than duplicating the code" },
    { check: "The shared helper files do NOT export a function handler or a config.path — they are plain modules, not functions" },
    { check: "orders.ts and customers.ts each use the modern default-export handler signature with config.path set to '/api/orders' and '/api/customers' respectively" },
    { check: "Does NOT place the shared code in a non-underscore sibling file directly under netlify/functions/ (e.g. netlify/functions/db.ts), which would be deployed as a function" },
    { check: "Imports Config and/or Context types from @netlify/functions in the two functions" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
