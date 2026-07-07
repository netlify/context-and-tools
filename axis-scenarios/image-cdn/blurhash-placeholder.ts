import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Image CDN: blurhash placeholder is a string, not an <img src>",
  prompt:
    "I want a blurry low-quality placeholder to show while my hero image at `/hero.jpg` loads, using Netlify Image CDN's blurhash support. I'm building the UI in React. Show me how to wire up the placeholder and then swap in the real image.",
  judge: [
    { check: "Explains that `fm=blurhash` returns a BlurHash text string, NOT image bytes" },
    { check: "Does NOT point an `<img src>` (or CSS `background-image`) directly at a `/.netlify/images?...&fm=blurhash` URL as if it renders a picture — that would load text, not an image" },
    { check: "Obtains the blurhash string as data — fetched at runtime or generated ahead of time (build step / data loader / server) — rather than assuming an `<img>` or the browser can render the blurhash URL directly" },
    { check: "Decodes the blurhash string into a rendered placeholder using a BlurHash decoder (e.g. a blurhash library rendering to a canvas or data-URI); it is not usable raw" },
    { check: "The real, displayable hero image is a SEPARATE `/.netlify/images?url=/hero.jpg&...` request WITHOUT `fm=blurhash`" },
    { check: "Uses the documented `fm=blurhash` param and does NOT invent a param like `blur`, `placeholder`, or `lqip` to produce the blur effect" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
