import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// The positive "how do I run gateway calls locally" path (the linked-project
// scenario tests the failure/diagnosis side). With `netlify dev` (or the vite
// plugin) in a LINKED directory whose site has already been deployed to
// production once, the gateway env vars are injected into the local process.
export default {
  name: "AI Gateway: run and test gateway calls locally the right way",
  prompt:
    "My Netlify function calls the AI Gateway with the OpenAI SDK and it works on the deployed production site. Now I want to develop and test it locally on my laptop so the gateway calls actually succeed in local dev. Walk me through how to set that up.",
  judge: [
    {
      check:
        "Says to run the app with `netlify dev` (or the `@netlify/vite-plugin`), which injects the gateway env vars into the local process — a bare framework dev server started outside `netlify dev` / `@netlify/vite-plugin` gets NO gateway env vars.",
    },
    {
      check:
        "Says the working directory must be LINKED to the Netlify site — run `netlify link` (or `netlify init`) — so `netlify dev` can pull the gateway base URL and placeholder key from the linked site's environment.",
    },
    {
      check:
        "Notes local gateway access still requires the site to have had at least one PRODUCTION deploy already; a brand-new local-only project has no gateway access until it is deployed to production once.",
    },
    {
      check:
        "Does NOT tell the user to set their own provider `OPENAI_API_KEY` (or hardcode a real key) to make local dev work — a user-set key disables the gateway; the fix is `netlify dev` in a linked, already-deployed project.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
