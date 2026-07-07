import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Footgun: a leftover SPA `/* -> /index.html 200` catch-all shadows SSR/server
// routes after adopting an adapter, because user-defined redirects take precedence
// over adapter-generated routes. Grounded in netlify-frameworks/SKILL.md
// (Client-Side Routing note: "Remove this catch-all when you adopt an SSR adapter").
export default {
  name: "Frameworks: leftover SPA catch-all shadows SSR routes",
  prompt:
    "I migrated my Vite + React SPA to server-side rendering using a Netlify framework adapter. Now every request — including my new SSR pages and API routes — just returns the static index.html shell instead of running server-side. My netlify.toml still contains:\n\n[[redirects]]\nfrom = \"/*\"\nto = \"/index.html\"\nstatus = 200\n\nWhy is this happening and how do I fix it?",
  judge: [
    {
      check:
        "Identifies the leftover SPA catch-all (`/* -> /index.html` with status 200) as the cause — it intercepts every request, including the SSR/server routes, and serves the static shell.",
    },
    {
      check:
        "Explains that user-defined redirects in netlify.toml/_redirects take precedence over the routes a framework adapter generates, which is why the catch-all wins over the SSR routes.",
    },
    {
      check:
        "Fix is to remove/delete the `/* -> /index.html` catch-all redirect — does NOT add more redirect rules on top of it to try to work around it.",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
