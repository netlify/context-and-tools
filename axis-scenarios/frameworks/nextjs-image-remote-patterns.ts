import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";
import { copyFixture } from "../helpers/setup";

export default {
  name: "Frameworks: allow a remote image host for next/image on Netlify",
  prompt:
    "My Next.js app on Netlify uses next/image to render product photos served from https://cdn.shopify.com. They currently fail to load because the hostname isn't allowed. Fix it so the images load and are optimized through Netlify's Image CDN.",
  setup: copyFixture("nextjs-blog"),
  judge: [
    { check: "Adds the host to `images.remotePatterns` in `next.config.js` (e.g. `{ protocol: 'https', hostname: 'cdn.shopify.com' }`)" },
    { check: "Uses `remotePatterns` rather than the deprecated `images.domains` array" },
    { check: "Does NOT hand-write an `[images]` block with `remote_images = [...]` in netlify.toml — the Next.js runtime maps `next.config.js` remotePatterns to Netlify Image CDN automatically" },
    { check: "Does NOT install a third-party image loader or configure a custom `images.loader` — the Netlify runtime provides optimization" },
    { check: "Keeps using `next/image` — does NOT switch the component to a plain `<img>` to dodge the host restriction" },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
