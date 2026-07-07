import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: list a large store without hand-rolled pagination",
  prompt:
    "My Netlify Blobs store has hundreds of thousands of keys. Create a Netlify function that walks the entire store to build a report, processing keys as it goes. I'm worried about loading every key into memory at once. How should I list them?",
  judge: [
    { check: "Explains that `store.list()` auto-paginates — a plain `await store.list()` transparently fetches every page and returns the full `blobs` array; the agent does NOT hand-roll page cursors or offsets" },
    { check: "For the memory concern, uses the paginated form `store.list({ paginate: true })` with `for await (...)` to stream results a page at a time instead of buffering all keys at once" },
    { check: "Does NOT enumerate keys by fetching blob values, shelling out, or keeping a side index — listing is done through the built-in `store.list` API" },
    { check: "Imports `getStore` from '@netlify/blobs' and uses documented methods" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
