import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariantsStrict } from "../helpers/variants";

// Platform event handlers (object default export with named handler
// properties) are a new capability. Without the skill an agent likely doesn't
// know functions can subscribe to deploy events — the baseline here is judged
// on NOT producing something incorrect or broken, while the with-skill run is
// held to the exact recommended object-handler shape. This scenario also
// stands in for verifying the object-form default export syntax is correct
// (no separate `{ fetch }` scenario needed).
const shared = [{ check: "File is placed under netlify/functions/" }];

export default {
  name: "Functions: deploy event handler",
  prompt:
    "Create a Netlify function under netlify/functions/ that runs automatically whenever a deploy succeeds and logs the id of the deploy. It is not an HTTP endpoint — it should run in response to the platform's deploy-succeeded event.",
  // Baseline (no-context): the priority is that it does not get this wrong. It
  // must not invent a fake subscription API, fake config, or wire it up as a
  // normal HTTP function pretending to catch deploy events. Correctly using the
  // event-handler pattern OR clearly stating this needs a platform event
  // mechanism it can't express are both acceptable; a confidently-wrong,
  // broken implementation is not.
  judge: [
    ...shared,
    {
      check:
        "Does NOT produce a broken or incorrect implementation: it must not invent a non-existent Netlify event-subscription API or config, and must not implement this as an ordinary HTTP request/response function pretending to receive deploy events. Acceptable outcomes are (a) correctly using the deploy-event handler pattern, or (b) clearly stating this requires a platform deploy-event subscription that a plain function cannot provide on its own.",
    },
  ],
  // with-skill: expect the object default export with a named deploySucceeded
  // handler, the typed event, and the deploy id read off the event.
  variants: withSkillVariantsStrict([
    ...shared,
    {
      check:
        "The default export is an OBJECT with a `deploySucceeded` named handler method — NOT a bare function and NOT a `fetch` HTTP handler.",
    },
    {
      check:
        "The handler reads the deploy id from its event argument (e.g. event.deploy.id) and logs it.",
    },
    {
      check:
        "Imports the typed event (e.g. DeploySucceededEvent) from @netlify/functions.",
    },
    {
      check:
        "Does NOT expose this as an HTTP route (no config.path / it is not treated as a request/response endpoint).",
    },
  ]),
} satisfies ScenarioInput;
