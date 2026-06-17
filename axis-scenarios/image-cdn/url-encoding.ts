import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

export default {
  name: "Image CDN: encode source URLs only when needed",
  prompt:
    "I'm building `<img>` tags that go through Netlify's Image CDN (`/.netlify/images`). Give me the correct `src` for each of these four sources, every one resized to width 600:\n" +
    "1. A local image at `/photos/headshot.jpg`.\n" +
    "2. A local upload stored at `/uploads/q&a summary.png` (the filename really does contain an ampersand and a space).\n" +
    "3. A remote image at `https://cdn.example.com/marketing/banner.jpg` (already allow-listed).\n" +
    "4. A remote image at `https://cdn.example.com/marketing/promo.jpg?v=2&size=lg` (already allow-listed).\n" +
    "Only encode what actually needs encoding so the source can't collide with the Image CDN's own query params.",
  judge: [
    { check: "Case 1 (simple local path) is passed through WITHOUT gratuitous encoding — `url=/photos/headshot.jpg&w=600`; the `/` separators are NOT turned into `%2F` and the basic filename is left readable" },
    { check: "Case 2 encodes the reserved characters in the filename: the `&` becomes `%26` (mandatory — otherwise it splits the query string) and the space becomes `%20` or `+`, e.g. `url=/uploads/q%26a%20summary.png&w=600`" },
    { check: "Case 3 (simple remote URL) references the allow-listed URL — `url=https://cdn.example.com/marketing/banner.jpg&w=600`; encoding the `:`/`/` is optional, accept raw or encoded since none of them conflict with Image CDN params" },
    { check: "Case 4 percent-encodes the remote URL's OWN query string so it attaches to the source rather than to Image CDN: the `?`, `&`, and `=` inside `promo.jpg?v=2&size=lg` become `%3F`, `%26`, `%3D` (e.g. `url=https%3A%2F%2Fcdn.example.com%2Fmarketing%2Fpromo.jpg%3Fv%3D2%26size%3Dlg&w=600`)" },
    { check: "In every case the Image CDN transform param (`&w=600`) stays a literal, unencoded `&...` separator — only the source value is encoded, not the whole src string" },
    { check: "Does NOT blanket-encode every source identically — recognizes that cases 1 and 3 need little/no encoding while cases 2 and 4 require it" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
