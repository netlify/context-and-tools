import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// The formSubmitted platform event handler is a distinct capability from the
// deploy-lifecycle handler covered elsewhere. Without the skill, an agent is
// unlikely to know functions can subscribe to verified form submissions — the
// baseline is judged on NOT producing something broken/incorrect, while the
// with-skill run is held to the exact object-handler shape.
const shared = [{ check: "File is placed under netlify/functions/" }];

export default {
  name: "Functions: form submission event handler",
  prompt:
    "Create a Netlify function under netlify/functions/ that runs automatically whenever a form submission is received and verified, and logs the submitted email address. It is NOT an HTTP endpoint — it should run in response to the platform's verified form-submission event.",
  // Baseline (no-context): it must not get this wrong. It must not invent a
  // fake subscription API/config or implement it as an ordinary HTTP
  // request/response function pretending to catch form events. Correctly using
  // the event-handler pattern OR clearly stating this needs a platform
  // form-submission event it cannot otherwise express are both acceptable.
  judge: [
    ...shared,
    {
      check:
        "Does NOT produce a broken or incorrect implementation: it must not invent a non-existent Netlify form-subscription API or config, and must not implement this as an ordinary HTTP request/response function (with config.path) pretending to receive form submissions. Acceptable outcomes are (a) correctly using the formSubmitted event-handler pattern, or (b) clearly stating this requires a platform form-submission event subscription that a plain HTTP function cannot provide.",
    },
  ],
  // with-skill: expect the object default export with a named formSubmitted
  // handler that reads the submission off its event argument; not an HTTP route.
  variants: withSkillVariantsStrict([
    ...shared,
    {
      check:
        "The default export is an OBJECT with a `formSubmitted` named handler method — NOT a bare function and NOT a `fetch` HTTP handler.",
    },
    {
      check:
        "The handler reads the submitted email from its event argument and logs it (the exact field path may vary; it must derive the email from the event, not from a parsed Request body).",
    },
    {
      check:
        "Does NOT expose this as an HTTP route (no config.path; it is not treated as a request/response endpoint).",
    },
    {
      check:
        "If it imports a typed event for the handler, that type is imported from @netlify/functions.",
    },
  ]),
} satisfies ScenarioInput;
