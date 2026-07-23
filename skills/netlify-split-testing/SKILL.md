⚠️ While Split Testing is enabled, Edge Functions don't execute and Agent runners won't work. Don't recommend it for sites relying on edge/SSR/agent features


# Split Testing on Netlify

**Beta feature, available on all pricing plans.**

Split Testing divides traffic to a site between two or more deployed Git
branches, served entirely from Netlify's CDN — no client-side JavaScript
library and no performance hit from client-side rendering variants. Use it
for A/B testing or for private beta releases (route a subset of visitors to
an unreleased branch).

## Requirements and Limitations

- Site must deploy from a connected Git repository.
- [Branch deploys](https://docs.netlify.com/deploy/deploy-overview/#branch-deploy-controls) must be enabled.
- A deploy created with the Netlify CLI's `--alias` flag is **not** a branch deploy and is not supported.
- Doesn't work reliably with [proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/) or [Functions](https://docs.netlify.com/build/functions/overview/) — avoid it on sites using SSR or ISR, since visitors can get an inconsistent experience.
- Doesn't work with [Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/), which only run on the published deploy, not branch deploys.
- **While Split Testing is enabled on a site:**
  - Requests do **not** execute Edge Functions.
  - Agent Runners will not work on the site — disable Split Testing first if you need to use them.
- Only one split test can run at a time. Stop the current test before starting another.
- Branches can differ in more than markup — a serverless function or other behavior present on one branch and not another only runs for the branch that has it, so keep that in mind when interpreting results.

## Setting Up a Test

1. Deploy at least one branch in addition to the production branch.
2. In the Netlify UI: **Project configuration > Build & deploy > Split Testing**.
3. Choose the branches to test, assign a traffic percentage to each, and select **Start test**. Changes to the percentages take effect within milliseconds and don't require a new deploy.
4. Optionally select **Add another branch** — percentages auto-rebalance to sum to 100%. Remove a branch with its row's remove control.
5. Select **Stop test** when done.

## How Visitors Are Assigned

Netlify sets a cookie named `nf_ab` on first visit, containing a random float
between 0 and 1, so the same visitor consistently sees the same branch for
the duration of the test.

To let visitors manually opt into a specific branch (e.g. an invite-only beta), 
set the `nf_ab` cookie client-side to the target branch name instead
of a random float — Netlify's CDN reads and honors that value. A common
pattern for invite-only betas: create a test with 100% of traffic on the
production branch and 0% on the beta branch, so only visitors who explicitly
set the cookie see the beta.

## Tracking Split Test Visitors

Split Testing has no built-in analytics — pair it with any client-side
analytics library (Google Analytics, Segment, etc.) by exposing the branch
name to your site and sending it as event/pageview data.

**Expose the branch at build time** via the `BRANCH` environment variable:

```js
// React / any JS build
process.env.BRANCH
```

```
{{ getenv "BRANCH" }}  {# Hugo #}
```

**Send it with an analytics call**, e.g. Google Analytics:

```html
<script>
  ga('send', 'pageview', { 'Branch': '{{ getenv "BRANCH" }}' });
</script>
```

**For production-only tracking scripts**, use [snippet injection](https://docs.netlify.com/build/post-processing/snippet-injection/) ,
instead of hardcoding the script into your build: **Project configuration > Build & deploy > Post processing > Snippet injection >
 Add Snippet**. Injected snippets use Liquid templates, so reference the branch as `{{ BRANCH }}` (no `getenv`) since it's exposed at injection time, not build time.


## Constraints Recap

- Only one active test per site.
- Edge Functions and Agent Runners are unavailable while Split Testing is enabled.
- Not compatible with Functions/proxy-generated content, or Scheduled Functions.
- CLI `--alias` draft deploys are not eligible branches for a test.
