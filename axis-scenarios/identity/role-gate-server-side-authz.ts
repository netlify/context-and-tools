import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: SPA role gate needs server-side authorization",
  prompt:
    "I'm building a React single-page app with Netlify Identity. I gate the /admin route with a netlify.toml redirect that has `conditions = { Role = [\"admin\"] }`, and I hide the admin dashboard component in the UI unless the logged-in user has the admin role. Is that enough to keep non-admins out of the admin data?",
  judge: [
    {
      check:
        "Says this is NOT enough — the redirect plus hidden component is a coarse page-level perimeter / UX affordance, not real authorization for the data.",
    },
    {
      check:
        "Explains that `Role` redirect conditions are enforced by the CDN only on document (navigation) requests, so client-side SPA navigation to /admin bypasses them and the route renders regardless of role.",
    },
    {
      check:
        "Explains that any admin content or data bundled into the client JavaScript ships to every visitor who can load the page and stays downloadable regardless of role — hiding a component client-side does not protect the data inside it.",
    },
    {
      check:
        "Recommends enforcing authorization server-side on every request — a Netlify Function (or the API it calls) that resolves the user with `getUser()` and checks the role before returning sensitive data.",
    },
    {
      check:
        "Checks the role against the server-controlled `app_metadata.roles`, NOT the user-editable `user_metadata`. Passes vacuously if the metadata field isn't named.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
