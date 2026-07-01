import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Blobs: fix the local-dev 'environment has not been configured' error",
  prompt:
    "I added Netlify Blobs to my app, but when I run it locally my blob calls throw: \"The environment has not been configured to use Netlify Blobs.\" My app is a Vite project. How do I fix this so Blobs works in local development?",
  judge: [
    { check: "Explains that local Blobs access has to run through Netlify's dev environment: either run the app via `netlify dev`, or — for this Vite project — install/enable the `@netlify/vite-plugin` so the Vite dev server provides the Blobs environment" },
    { check: "Does NOT recommend manually passing a siteID/token (or other credentials) into `getStore(...)` as the fix — that is not the documented local-dev path" },
    { check: "Does NOT recommend calling the Netlify API directly or reading auth tokens off disk to make local Blobs work" },
    { check: "Correctly frames the error as a local-environment configuration issue, not a bug in the Blobs API usage itself" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
