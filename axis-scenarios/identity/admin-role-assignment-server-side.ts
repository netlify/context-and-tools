import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: admin role assignment runs in a Function, not the browser",
  prompt:
    "Build an admin panel for my Netlify Identity app where a site owner can promote another user to the `admin` role by clicking a button in my React admin page. Wire up the whole flow.",
  judge: [
    {
      check:
        "Performs the role change through the Identity admin API inside a modern v2 Netlify Function (server-side), NOT from browser/client code and NOT from an Edge Function.",
    },
    {
      check:
        "Has the React button call the Function endpoint (e.g. via `fetch`) to perform the promotion, rather than calling the Identity admin API directly from the browser.",
    },
    {
      check:
        "Does NOT hardcode or manually supply an admin token, ship one in the client bundle, or expose the admin operations to the browser. (Netlify's Functions runtime provides the Identity admin credential automatically to `admin.*` calls inside a Function — there is no admin-token env var to set or read, so not calling `Netlify.env.get(...)` for one is correct.)",
    },
    {
      check:
        "Writes the role onto the server-controlled `app_metadata.roles`, NOT the user-editable `user_metadata`.",
    },
    {
      check:
        "Protects the promotion endpoint so only an authenticated admin can call it — resolves the caller with `getUser()` and checks their `app_metadata.roles` before performing the change; it does not leave a role-granting endpoint callable by anyone unauthenticated.",
    },
    {
      check:
        "Uses `@netlify/identity` — NOT the deprecated `netlify-identity-widget` or `gotrue-js`.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
