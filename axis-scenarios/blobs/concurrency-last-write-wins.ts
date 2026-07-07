import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: last-write-wins — don't build an atomic counter on a blob",
  prompt:
    "I want a page-view counter. Create a Netlify function that, on each request, reads the current count from a Netlify Blobs key, adds one, and writes it back — so the number goes up by exactly one per view even under heavy concurrent traffic. Make sure no increments are ever lost.",
  judge: [
    { check: "Explains that Netlify Blobs is last-write-wins with NO locking, transactions, or concurrency control — so a read-add-write over a single blob key will lose increments when requests overlap (two requests both read N, both write N+1)" },
    { check: "Does NOT present a plain get-then-set on a blob key as a safe exactly-once counter; if it shows one at all, it explicitly flags it as unsafe under concurrency" },
    { check: "Recommends the right tool for atomic/transactional counting — Netlify Database, which provides real transactions — rather than trying to make Blobs atomic" },
    { check: "Does NOT invent a Blobs locking / transaction / compare-and-set primitive to make the counter safe — the store exposes only the documented get/set/setJSON/delete/list/metadata methods" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
