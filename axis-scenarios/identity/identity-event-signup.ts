import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// Identity event functions have a legacy form (named `handler` export,
// statusCode response, snake_case app_metadata parsed from event.body) that
// still works, and a modern recommended form (object default export with a
// `userSignup` handler, typed event, camelCase appMetadata, return { user }).
// Baseline accepts either real mechanism; with-skill expects the modern form.
const shared = [
  { check: "File is placed under netlify/functions/" },
  {
    check:
      "Assigns the role on the server-controlled app metadata (app_metadata / appMetadata) — NOT on user metadata (user_metadata / userMetadata), which is user-editable and unsafe to authorize against.",
  },
  {
    check:
      "Spreads the user's existing app metadata (e.g. ...event.user.appMetadata or ...user.app_metadata) so unrelated metadata fields are preserved. Setting roles to ['member'] is acceptable — preserving a prior roles array is NOT required for a new signup.",
  },
];

export default {
  name: "Identity: assign a default role on signup",
  prompt:
    "Create a Netlify Identity event function that runs when a new user signs up and assigns them a default `member` role. Place it under netlify/functions/.",
  // Baseline (no-context): either the legacy handler/statusCode form or the
  // modern handler form is acceptable, as long as it uses a real Netlify
  // Identity signup-trigger mechanism and assigns the role on app metadata.
  judge: [
    ...shared,
    {
      check:
        "Uses a real Netlify Identity signup trigger — either the legacy named `handler` export returning a body that replaces app_metadata, or the modern `userSignup` handler returning { user } — and does NOT invent a non-existent mechanism.",
    },
  ],
  // with-skill: expect the modern typed handler form.
  variants: withSkillVariantsStrict([
    ...shared,
    {
      check:
        "The default export is an OBJECT with a `userSignup` named handler (the modern typed event-handler form) — NOT the legacy named `handler` export with statusCode / JSON.parse(event.body).",
    },
    {
      check:
        "Returns { user: ... } to mutate the user, adding 'member' to appMetadata.roles using camelCase `appMetadata` (not snake_case app_metadata).",
    },
    {
      check:
        "Imports the typed event (e.g. UserSignupEvent) from @netlify/functions.",
    },
  ]),
} satisfies ScenarioInput;
