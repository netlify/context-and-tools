import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

// Footgun: adapter-generated functions only bundle traced module deps. A file read
// from disk at runtime works under `npm run dev` but ENOENTs in production unless it
// is declared. Grounded in netlify-frameworks/SKILL.md ("Runtime File Reads in
// Adapter-Generated Functions") — Next.js `outputFileTracingIncludes`.
export default {
  name: "Frameworks: bundle a runtime-read file into a Next.js function",
  prompt:
    "Add a Route Handler at /api/changelog to this Next.js blog that reads a local file `content/CHANGELOG.md` from disk at request time (using fs.readFile) and returns its contents as text. It works locally with `npm run dev`, but I want it to keep working once deployed to Netlify. Set it up correctly.",
  judge: [
    {
      check:
        "Creates the App Router Route Handler at `app/api/changelog/route.ts` that reads the file with `fs`/`fs.readFile` (or similar) at request time and returns its contents as asked.",
    },
    {
      check:
        "Recognizes that files read from disk at runtime are NOT bundled into the adapter-generated Netlify Function by default, so the read works in `npm run dev` but throws ENOENT in production.",
    },
    {
      check:
        "Declares the file so it ships with the deployed function — e.g. sets `outputFileTracingIncludes` in `next.config` to include `content/CHANGELOG.md` (or an equivalent mechanism to bundle the file with the function).",
    },
    {
      check:
        "Does NOT claim the file will simply be present at runtime with no extra configuration.",
    },
  ],
  setup: copyFixture("nextjs-blog"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
