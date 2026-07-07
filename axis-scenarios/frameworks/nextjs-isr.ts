import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Frameworks: add ISR and on-demand revalidation to the Next.js blog",
  prompt:
    "This Next.js blog currently lists posts and renders each post page. Refactor it so the post listing and each /posts/[slug] page are statically generated but revalidated every 10 minutes. Also add a Route Handler at /api/revalidate that accepts POST { slug: string } and triggers on-demand revalidation for that specific post page, so editors don't have to wait for the timer.",
  judge: [
    { check: "Uses Next.js App Router conventions (route handlers, `revalidate`, etc.) — does NOT mix in pages-router `getStaticProps` / `getStaticPaths` boilerplate" },
    { check: "Adds time-based revalidation by exporting `export const revalidate = 600` (10 minutes) from the relevant page files (or fetch-level `next.revalidate`)" },
    { check: "The on-demand handler imports `revalidatePath` (or `revalidateTag`) from 'next/cache' and calls it for the specific `/posts/<slug>` path — NOT `revalidate()` from a deprecated module" },
    { check: "Route handler reads the slug via `await request.json()` and validates that it is present before calling revalidatePath" },
    { check: "Does NOT instruct the user to manually wire a Netlify Function in `netlify/functions/` to back the route — the Netlify Next.js runtime handles the route handler automatically" },
    { check: "Does NOT replace the existing `lib/posts.ts` source-of-truth with a different data layer — the request is about caching, not a rewrite" },
    { check: "Does NOT hardcode any secret in added code — reads it from an env var (`process.env` is valid and idiomatic in a Next.js Route Handler); passes vacuously if no env vars are introduced" },
  ],
  setup: copyFixture("nextjs-blog"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
