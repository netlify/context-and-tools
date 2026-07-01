import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Edge Functions: Deno URL import via import map",
  prompt:
    "Create a Netlify edge function on `/*` that rewrites the HTML of the origin response using the `html-rewriter` module published at https://ghuc.cc/worker-tools/html-rewriter/index.ts. Wire up a Deno import map so the edge function can import it by a clean bare specifier instead of the raw URL, and register the import map with Netlify.",
  judge: [
    { check: "File lives under netlify/edge-functions/" },
    { check: "Creates an import_map.json that maps a bare specifier (e.g. 'html-rewriter') to the https://ghuc.cc/worker-tools/html-rewriter/index.ts URL" },
    { check: "Registers the import map in netlify.toml under [functions] with deno_import_map = './import_map.json'" },
    { check: "The edge function imports the module by its mapped bare specifier (or, acceptably, directly from the URL) — and does NOT try to `npm install` this Deno URL module" },
    { check: "Calls await context.next() to obtain the downstream response and transforms its HTML, returning the modified response" },
    { check: "Uses the modern edge-function default-export (req, context) signature with config.path set" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
