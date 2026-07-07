import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: use strong consistency selectively, not everywhere",
  prompt:
    "To be safe against any stale reads, I'm thinking of setting `consistency: 'strong'` on my Netlify Blobs store so every single read across the whole app always gets the latest value. Most of my reads just serve rarely-changing assets; only one endpoint does an immediate read right after a write. Is 'make everything strong' the right call?",
  judge: [
    { check: "Explains that strong-consistency reads are SLOWER than eventual reads, so forcing every read to be strong needlessly adds latency — strong should be reserved for reads that genuinely need read-your-writes" },
    { check: "Notes that consistency can be requested per operation — e.g. `store.get(key, { consistency: 'strong' })` on the one read-after-write endpoint — instead of setting strong on the whole store" },
    { check: "Recommends leaving the rarely-changing asset reads on the default (eventual) consistency, which is faster and the right choice for read-heavy, stable data" },
    { check: "Imports `getStore` from '@netlify/blobs' and does NOT paper over consistency with sleeps/retries or an external cache" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
