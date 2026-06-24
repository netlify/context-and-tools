import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// Denying an Identity action has a legacy form (returning a non-2xx statusCode
// from a named `handler`) and a modern recommended form (event.deny() from a
// typed handler, which yields a 401 without an observability error). Baseline
// accepts either real denial mechanism; with-skill expects event.deny().
const shared = [
  { check: "File is placed under netlify/functions/" },
  {
    check:
      "Derives the email to check from the Identity event payload (the user object on the event / parsed event body) — not from an arbitrary request input.",
  },
  {
    check:
      "Only rejects addresses that are not on the @example.com domain; allows @example.com signups through.",
  },
];

export default {
  name: "Identity: deny signups outside an allowed domain",
  prompt:
    "Create a Netlify Identity event function that blocks signups from any email address that is not on the @example.com domain. Place it under netlify/functions/.",
  // Baseline (no-context): either real denial mechanism is acceptable — the
  // legacy non-2xx statusCode response or event.deny() — as long as it does not
  // invent a non-existent API.
  judge: [
    ...shared,
    {
      check:
        "Rejects disallowed emails via a real Netlify Identity denial mechanism — either returning a non-2xx response (legacy handler form) or calling event.deny() — and does NOT invent a non-existent mechanism.",
    },
  ],
  // with-skill: expect the modern typed handler denying via event.deny().
  variants: withSkillVariantsStrict([
    ...shared,
    {
      check:
        "The default export is an OBJECT with a `userValidate` or `userSignup` named handler (the modern typed event-handler form) — NOT the legacy named `handler` export.",
    },
    {
      check:
        "Rejects disallowed emails by calling event.deny() — NOT by throwing, and NOT by returning a non-2xx statusCode object.",
    },
    {
      check:
        "Imports the typed event (e.g. UserValidateEvent or UserSignupEvent) from @netlify/functions.",
    },
  ]),
} satisfies ScenarioInput;
