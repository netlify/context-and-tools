import type { ScenarioInput } from "@netlify/axis";

type Variant = NonNullable<ScenarioInput["variants"]>[number];

// The full Netlify skill bundle. Loading the whole set in the `with-skill`
// variant mirrors how users actually run agents — they don't cherry-pick which
// skill is relevant, they make the bundle available and let the agent decide.
export const ALL_NTL_SKILLS = [
  "./skills/netlify-access-control",
  "./skills/netlify-agent-runner",
  "./skills/netlify-ai-gateway",
  "./skills/netlify-blobs",
  "./skills/netlify-caching",
  "./skills/netlify-config",
  "./skills/netlify-database",
  "./skills/netlify-deploy",
  "./skills/netlify-edge-functions",
  "./skills/netlify-forms",
  "./skills/netlify-frameworks",
  "./skills/netlify-functions",
  "./skills/netlify-identity",
  "./skills/netlify-image-cdn",
  "./skills/netlify-mcp-servers",
];

// Standard variant pair every scenario runs: a baseline with no extra context,
// and a variant with skills loaded. Defaults to ALL_NTL_SKILLS — pass explicit
// skill paths only when you specifically want to scope the test.
export function withSkillVariants(...skills: string[]): Variant[] {
  return [
    { name: "no-context" },
    { name: "with-skill", skills: skills.length > 0 ? skills : ALL_NTL_SKILLS },
  ];
}

// Same variant pair, but the `with-skill` run is judged against a stricter
// rubric. Use this when a capability has both a "still works" form and a
// narrower *recommended* form: the scenario's base `judge` (inherited by
// no-context) accepts either, while `strictJudge` here demands the recommended
// path that loading the skill should produce. A variant's `judge` REPLACES the
// base judge rather than merging, so `strictJudge` must list every check the
// with-skill run should be held to — typically the shared checks plus the
// stricter ones.
export function withSkillVariantsStrict(
  strictJudge: Variant["judge"],
  ...skills: string[]
): Variant[] {
  return [
    { name: "no-context" },
    {
      name: "with-skill",
      skills: skills.length > 0 ? skills : ALL_NTL_SKILLS,
      judge: strictJudge,
    },
  ];
}
