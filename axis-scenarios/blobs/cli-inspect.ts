import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: inspect and edit a store from the CLI",
  prompt:
    "A production bug seems tied to one bad value in my Netlify Blobs 'config' store under the key 'feature-flags'. From my terminal, without writing and deploying a throwaway function, how can I look at that value and, if needed, overwrite it? I have the Netlify CLI installed.",
  judge: [
    { check: "Uses the documented Netlify CLI blobs commands — `netlify blobs:get <store> <key>` to read the value and `netlify blobs:set <store> <key> <value>` to overwrite it (and mentions `netlify blobs:list` / `netlify blobs:delete` as the sibling commands)" },
    { check: "Notes the CLI operates on the linked site's store, so the project must be linked first (`netlify link`)" },
    { check: "Does NOT claim you must write and deploy a function to inspect a blob value, and does NOT reach for the raw Netlify API or read tokens off disk to read/write the value" },
    { check: "Stays on documented surfaces — the CLI `blobs:*` subcommands — rather than inventing an endpoint or store method" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
