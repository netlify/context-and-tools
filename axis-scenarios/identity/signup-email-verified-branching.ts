import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Identity: branch on emailVerified after signup",
  prompt:
    "Add an email/password signup form using Netlify Identity. After a user signs up, I want to show the right message depending on whether they're logged in immediately or still need to confirm their email first. How do I know which case I'm in, and what should each branch show?",
  judge: [
    {
      check:
        "Uses `@netlify/identity` — NOT the deprecated `netlify-identity-widget` or `gotrue-js`.",
    },
    {
      check:
        "Creates the account with `signup(email, password, { ... })` — the function name comes from the SDK, not invented.",
    },
    {
      check:
        "Branches on the returned user's `emailVerified` field (e.g. `user.emailVerified`) to decide which case happened — auto-confirmed (Autoconfirm ON) vs. must confirm by email (Autoconfirm OFF).",
    },
    {
      check:
        "When `emailVerified` is truthy, treats the user as logged in immediately (a success message); when falsy, tells the user to check their email to confirm before they can log in.",
    },
    {
      check:
        "Catches the SDK's `AuthError` (or a generic catch) and surfaces a user-visible message on failed signup.",
    },
    {
      check:
        "Does NOT hardcode an Identity / GoTrue endpoint URL or admin token in the client code.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
