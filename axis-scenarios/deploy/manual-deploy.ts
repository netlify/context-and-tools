import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Deploy: manual preview-then-prod for an existing Next.js project",
  prompt:
    "This Next.js blog has no Netlify site yet and we don't want to wire up Git CI/CD. Walk me through the exact terminal commands to (1) authenticate with the Netlify CLI, (2) create a brand-new Netlify site for this project without setting up Git deploys, (3) ship a draft/preview deploy I can share for review, and (4) promote that to production once it's approved. Don't write any code — just give the command sequence.",
  judge: [
    { check: "Authenticates with `netlify login` (or notes the `NETLIFY_AUTH_TOKEN` env var alternative for CI) before any deploy step" },
    { check: "Creates the Netlify site without configuring Git CI/CD via `netlify init --manual`. Plain `netlify init` (which prompts for a Git remote) is NOT acceptable here." },
    { check: "Issues a draft/preview deploy with `netlify deploy` (no `--prod` flag) before promoting" },
    { check: "Promotes to production with `netlify deploy --prod` only after the preview step. Does NOT promote by restoring a previous deploy (e.g. via `netlify api restoreSiteDeploy`) — that ships the old build, not the new one." },
    { check: "Mentions ensuring the publish directory matches Next.js (.next) or relies on auto-detection — does not hardcode `dist` or `build`" },
    { check: "Does NOT instruct the user to push to a Git remote or hook up a GitHub/GitLab repo as a required step (the prompt said no Git CI/CD)" },
    { check: "Recommends adding `.netlify` to `.gitignore` (since `netlify init` creates `.netlify/state.json`) — passes vacuously if the agent notes the file shouldn't be committed in any equivalent phrasing" },
  ],
  setup: copyFixture("nextjs-blog"),
  variants: withSkillVariants(),
} satisfies ScenarioInput;
