import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Image CDN: position, quality, and blurhash transforms",
  prompt:
    "I'm serving product photos through Netlify's Image CDN from a local image at `/products/widget.jpg`. Give me the correct `/.netlify/images` URL for each of these three things:\n" +
    "1. A 600×600 cover crop anchored to the TOP of the source image.\n" +
    "2. The same 600×600 cover crop, but compressed harder at quality 50.\n" +
    "3. A blurhash placeholder string for the same image, to show while the real image loads.",
  judge: [
    { check: "Case 1 uses `fit=cover` together with `position=top` (plus `w=600&h=600`) to anchor the crop to the top" },
    { check: "Case 2 sets `q=50` for the harder compression (along with the same `w=600&h=600&fit=cover` crop)" },
    { check: "Case 3 requests `fm=blurhash` to produce the blurhash placeholder output" },
    { check: "Every URL goes through `/.netlify/images?url=/products/widget.jpg&...` with the transform params as literal, unencoded query separators" },
    { check: "Uses only documented Image CDN params for these — `position`, `q`, and `fm=blurhash` — and does NOT invent params like `gravity`, `quality`, or `blur` for them" },
    { check: "For the two non-blurhash crops (cases 1 and 2), does NOT force an output format with `fm` (e.g. `fm=webp`/`fm=avif`) — leaving `fm` unset lets Netlify auto-negotiate; only the placeholder case uses `fm=blurhash`" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
