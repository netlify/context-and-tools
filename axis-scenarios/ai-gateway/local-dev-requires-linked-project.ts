import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// The gateway env vars are injected locally only when the working directory is
// LINKED to the Netlify site — `netlify dev` pulls them from the linked site's
// environment. The site here is already deployed to production (so AI is enabled
// and the gateway is active), which isolates the cause to an unlinked local dir.
export default {
  name: "AI Gateway: local calls fail because the project isn't linked",
  prompt:
    "My Netlify function calls the AI Gateway with the OpenAI SDK. It works fine on the deployed site — the site has already been deployed to production and AI is enabled — but when I run it locally with `netlify dev` the SDK throws `OPENAI_API_KEY missing`. I'm using `new OpenAI()` with no key on purpose. Why does it fail locally and how do I fix it?",
  judge: [
    {
      check:
        "Diagnoses that the local working directory must be LINKED to the Netlify site for `netlify dev` to inject the gateway env vars — an unlinked directory has no site context, so nothing is injected and the call fails locally even though the site is deployed to production.",
    },
    {
      check:
        "Tells the user to link the project — run `netlify link` (or `netlify init`) in the directory — and then run `netlify dev`.",
    },
    {
      check:
        "Confirms the bare `new OpenAI()` construction is correct; the placeholder key and base URL are auto-injected, so the fix is linking, not adding a constructor argument.",
    },
    {
      check:
        "Does NOT tell the user to set their own `OPENAI_API_KEY` (or hardcode any provider key) to make local dev work — a user-set key disables the gateway.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
