import type { ScenarioInput } from "@netlify/axis";

type SetupAction = NonNullable<ScenarioInput["setup"]>[number];

// Stage a fixture directory (from ./axis-fixtures/<name>) into the workspace
// root. Scenarios that ask the agent to modify an existing project pair this
// setup with a prompt that references files the fixture provides.
export function copyFixture(name: string): SetupAction[] {
  return [
    {
      action: "copy",
      match: `./axis-fixtures/${name}/**/*`,
      destination: "./",
    },
  ];
}
