<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Scorrd React Native (Expo) app. The existing `posthog-react-native` SDK and `react-native-svg` peer dependency were already installed. Four files were modified and two new configurations added:

- **`services/analytics.ts`** — Fixed host to use `EXPO_PUBLIC_POSTHOG_HOST` env var, added `captureAppLifecycleEvents`, `debug` (dev only), and batching config (`flushAt`, `flushInterval`).
- **`app/_layout.tsx`** — Added `PostHogProvider` wrapper with touch autocapture enabled and screens autocapture disabled. Added a `ScreenTracker` component that calls `posthog.screen(pathname, params)` on every route change via `usePathname` + `useGlobalSearchParams`.
- **`app/(auth)/register.tsx`** — Added `user_registered` event and `posthog.identify()` call on successful registration.
- **`app/billing/plans.tsx`** — Added `billing_checkout_started` event with `plan` and `current_plan` properties when a user taps a plan.
- **`app/(tabs)/generate.tsx`** — Added `post_saved` event in `handleSave` and `post_copied` event in the copy button handler.
- **`.env`** — Added `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_HOST` environment variables (already in `.gitignore`).

Pre-existing events that were verified and left unchanged: `analysis_submitted`, `analysis_completed`, `post_generated`, `lead_captured`, `upgrade_prompt_shown`, `upgrade_prompt_tapped`, `calendar_item_scheduled`.

| Event | Description | File |
|-------|-------------|------|
| `user_registered` | New user successfully creates an account — top of conversion funnel | `app/(auth)/register.tsx` |
| `billing_checkout_started` | User taps to select a paid plan and checkout begins | `app/billing/plans.tsx` |
| `post_saved` | User saves a generated post to their library | `app/(tabs)/generate.tsx` |
| `post_copied` | User copies a generated post to clipboard | `app/(tabs)/generate.tsx` |
| `analysis_submitted` | User submits a post for analysis (pre-existing) | `app/(tabs)/analyze.tsx` |
| `analysis_completed` | Analysis results loaded on screen (pre-existing) | `app/analysis/[id].tsx` |
| `post_generated` | AI post generation succeeded (pre-existing) | `app/(tabs)/generate.tsx` |
| `lead_captured` | New lead manually added via FAB (pre-existing) | `app/(tabs)/leads.tsx` |
| `upgrade_prompt_shown` | 402 plan/subscription gate triggered (pre-existing) | `services/api.ts` |
| `upgrade_prompt_tapped` | User taps Upgrade/Start Trial in gate alert (pre-existing) | `services/api.ts` |
| `calendar_item_scheduled` | Calendar post item successfully saved (pre-existing) | `app/(tabs)/calendar.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/400548/dashboard/1518072
- **Registration → Analysis Funnel**: https://us.posthog.com/project/400548/insights/JZwP3npB
- **Upgrade Prompt Conversion Funnel**: https://us.posthog.com/project/400548/insights/9crZLe3U
- **Post Generation & Analysis Volume**: https://us.posthog.com/project/400548/insights/bnqLbVAb
- **Lead Capture Trend**: https://us.posthog.com/project/400548/insights/6NtzenRG
- **Content Engagement (Saved & Copied)**: https://us.posthog.com/project/400548/insights/0vLuaHRX

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
