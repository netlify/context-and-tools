import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Image CDN: /.netlify/images 404s under a bare framework dev server",
  prompt:
    'I added `<img src="/.netlify/images?url=/hero.jpg&w=800&fm=webp" />` to my Astro site. It works fine once deployed to Netlify, but when I run my local dev server with `astro dev` the image 404s and no transformation happens. Why, and how do I preview the image transformations locally?',
  judge: [
    { check: "Identifies the cause: `/.netlify/images` is a Netlify platform endpoint that a bare framework dev server (`astro dev`) does not provide, which is why it 404s locally" },
    { check: "Tells the user to run `netlify dev` to emulate the Image CDN endpoint locally" },
    { check: "Confirms the `<img>` URL / `/.netlify/images?...` syntax itself is correct — the problem is the dev server, not the markup — and does NOT tell the user to rewrite the working URL" },
    { check: "Does NOT invent a workaround such as writing a custom Function/middleware to serve `/.netlify/images` locally, or a proxy/plugin to fake the endpoint" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
