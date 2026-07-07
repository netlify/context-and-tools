import type { ScenarioInput } from "@netlify/axis";
import { withSkillVariants } from "../helpers/variants";

// Handing an image back to the model as image content
// (`{ type: "image", data: <base64>, mimeType }`) is fine for the occasional
// read, but streaming large or many files back inline is the wrong approach --
// for anything substantial, return a URL the user/agent can open instead.
// Grounded in netlify-mcp-servers/references/file-uploads.md.
export default {
  name: "MCP Servers: returning images to the agent -- inline vs a URL",
  prompt:
    "My MCP server has tools that hand images back to the agent. One returns a single preview thumbnail; another, `export_gallery`, could return dozens of full-resolution photos at once. Should I just base64-encode the bytes and return them as image content in every case?",
  judge: [
    {
      check:
        "For the occasional single image (the thumbnail), confirms returning it inline as image content is fine -- e.g. `{ type: \"image\", data: <base64>, mimeType }`",
    },
    {
      check:
        "Does NOT inline dozens of full-resolution photos as base64 image content -- warns that streaming large or many files back this way is the wrong approach",
    },
    {
      check:
        "For the substantial case (the gallery / large or many files), returns a URL the user or agent can open instead of embedding the raw bytes",
    },
    {
      check:
        "Frames the choice as a size/volume decision -- inline image content for the occasional read, a URL for anything substantial",
    },
  ],
  variants: withSkillVariants(),
} satisfies ScenarioInput;
