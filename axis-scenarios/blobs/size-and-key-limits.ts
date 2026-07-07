import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: object, store-name, and key size limits",
  prompt:
    "I'm about to design a Netlify Blobs store for large user-uploaded video files. Before I commit to the design, tell me the hard size limits I need to build around: how big can a single object be, how long can the store name be, and how long can a blob key be? I'm planning to use each upload's original full file path as its key, so I especially need to know the key limit.",
  judge: [
    { check: "States the maximum object (blob value) size is 5 GB" },
    { check: "States the store name maximum length is 64 bytes" },
    { check: "States the blob key maximum length is 600 bytes" },
    { check: "Applies the 600-byte key limit to the user's plan — flags that a full-file-path key must stay within 600 bytes, so very long paths could exceed the limit" },
    { check: "Does NOT invent different limit values, and does NOT claim these limits can be raised or worked around" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
