# Scorrd — Mobile App (scorrd)

## IMPORTANT — READ BEFORE ANYTHING ELSE
- Read ONLY files explicitly named in the prompt
- Do NOT explore the file tree
- Do NOT read adjacent files or follow imports
- Do NOT read node_modules, package.json, or config files unless asked
- Ask before opening any file not listed in the prompt
- Make SURGICAL edits only — never rewrite entire files
- Show only the changed block, not the full file
- Confirm each step before proceeding to the next
- Never output a full file unless explicitly asked

## BEFORE EVERY CHANGE — NON-NEGOTIABLE
Before writing any code:
- Read every file you plan to change — no assumptions
- Check if a shared component already exists before building new
- Confirm all imports resolve before using them
- State your plan in one sentence before starting

After writing any code:
- Run `npx tsc --noEmit` immediately — fix ALL errors before proceeding
- No 'any' types introduced
- No hardcoded hex colors — Colors constants only
- No inline styles — StyleSheet.create only
- No direct fetch() calls — services/api.ts only

Before declaring done:
- Confirm change matches request — nothing more, nothing less
- State every file modified and what changed in each
- Confirm no unrelated files were touched
- Confirm no console.log left in code

## Project
AI social media intelligence platform for real estate agents.
Domain: scorrd.app | Spec: Scorrd_Spec_v2.3.docx

## Subscription Tiers — EXACT STRINGS
- 'agent'   — $29/mo
- 'pro'     — $99/mo
- 'broker'  — $149/mo
- 'agency'  — $249/mo (NOT YET BUILT on frontend)

NEVER use 'team', 'basic', 'starter', 'enterprise'.

## Stack
- React Native + Expo SDK 51, TypeScript
- Expo Router (file-based routing)
- Zustand — auth/global state
- React Query (TanStack) — server state
- Axios — all API calls via services/api.ts only

## File Structure
```
app/
  _layout.tsx
  index.tsx
  onboarding.tsx
  (auth)/        login.tsx | register.tsx | _layout.tsx
  (tabs)/        analyze.tsx | generate.tsx | trends.tsx | calendar.tsx | dashboard.tsx | leads.tsx | settings.tsx | _layout.tsx
  analysis/      [id].tsx | month-calendar.tsx | carousel/[id].tsx
  billing/       plans.tsx | success.tsx | cancel.tsx
components/
  InfoCallout | ImageUpload | ListingPriceSelector | BuyerTypeSelector | ScoreRing | PlatformPill
  leads/         LeadCard | LeadDetailSheet | AddLeadModal | PipelineColumn | CapturePageCard | QRModal
  settings/      ProfileSection | SubscriptionSection | NotificationsSection
constants/       colors.ts | typography.ts | config.ts
services/        api.ts | analytics.ts
store/           authStore | formDraftStore | preFillStore
types/           index.ts
```

## Design System — NEVER deviate
- Navy: #1C2B3A — app bars, headings, primary buttons
- Teal: #0EA5A0 — CTAs, active states, score highlights
- Teal Dark: #0D7A76 — pressed states
- Off-white: #F7F5F2 — ALL screen backgrounds
- Surface: #FFFFFF — cards, inputs
- Border: #E2E8F0
- Text Primary: #1C2B3A
- Text Secondary: #64748B
- Score Green: #16A34A (7.0–10.0)
- Score Amber: #D97706 (4.0–6.9)
- Score Red: #DC2626 (0.0–3.9)
- Mismatch Banner: bg #FEE2E2 / text+border #DC2626
- Typography: DM Serif Display (scores) | DM Sans (UI) | JetBrains Mono (data)
- Border radius: 8px pills/inputs | 12px cards | 16px sheets | 24px primary buttons
- Scores: circular SVG rings ONLY — never bar charts
- Loaders: skeleton only — never ActivityIndicator on content
- Haptics: on every primary action

## Shared Components — REUSE, never rebuild
- ImageUpload — photo upload + camera roll. Used on analyze AND generate.
- ListingPriceSelector — horizontal scroll pill selector. 6 pills: Any price(null) / Under $300k / $300k–$600k / $600k–$900k / $900k–$1.5M / $1.5M+. Single select. ALWAYS pills — NEVER a slider.
- BuyerTypeSelector — multi-select pills: First-Time Buyer / Move-Up Buyer / Luxury Buyer / Investor / Downsizer / Relocating
- ScoreRing — circular SVG, accepts `score`, `size` (default 140), `strokeWidth` (default 12). Color is derived internally via `scoreColor(score)` — no color prop.
- InfoCallout — teal left border, 10px uppercase teal label, 13px body, off-white bg
- SkeletonLoader — animated skeleton for all async content

## What Is Built

### Onboarding (app/onboarding.tsx)
- Shows ONCE on first login/registration — never again
- Persisted via SecureStore key `scorrd.onboarding.v1.seen`
- Content: Scorrd logo (72px), "AI that grades your posts." headline, subhead, real `ScoreRing` (score=8.4, size=160, strokeWidth=14) + COMPOSITE SCORE / INSTAGRAM · NEW LISTING labels, 2×2 `ScoreCard` grid with static scores (Virality 9.1 / Follower Attraction 8.2 / Lead Capture 7.8 / Trust 8.6), CTA button, Skip link
- CTA "Score my first post →": sets flag + pre-fills Score tab textarea with sample realtor post via `preFillStore.set()`, navigates to `/(tabs)/analyze`
- Skip: sets flag, navigates to `/(tabs)/analyze` empty
- **AuthGate trigger logic** (`_layout.tsx`):
  - Dedicated `useEffect([hydrated])` fires once on hydration: if token exists at that moment = existing user → sets flag silently (they never see onboarding)
  - Routing `useEffect`: `accessToken && inAuthGroup` (fresh login/register) → async SecureStore check → if flag unset + no expiredPath/returnPath → `router.replace('/onboarding')`
  - Session-expired users (have expiredPath) always skip onboarding and restore their destination
- **Testing**: SecureStore persists across reinstalls on iOS. To force-show onboarding, call `SecureStore.deleteItemAsync('scorrd.onboarding.v1.seen')` in login's success block temporarily

### Navigation
- 5-tab layout: **Score** | Generate | Trends | Calendar | Settings (Score is first, tab route is still `analyze`)
- Tab label "Score", icon `speedometer-outline`. Route path unchanged (`/(tabs)/analyze`) — no deep link breakage.
- Leads and Dashboard are NOT in the tab bar (`href: null`) — routable via `router.push` only
- AuthGate, TokenGuard, PushSetup, NotificationBanner, Analytics, ScreenTracker all in `_layout.tsx`
- **Auth screens**: both login.tsx and register.tsx show Scorrd logo (140px, borderRadius 28, drop shadow). Register has confirm password field with match validation.

### Score Tab / Analyze Screen (analyze.tsx)
- Permanent header: "Paste a post. Get graded in 13 seconds." (teal, DM Serif Display) / "Score across 4 dimensions. Know exactly what to fix." (secondary)
- Mode toggle: Single Post | Carousel
- Single: platform selector, content type, textarea with char counter, ImageUpload, listing context
- Carousel: 2-column grid, max 10 slides, Hook/CTA labels, min 2 to analyze
- Both modes: ListingPriceSelector + BuyerTypeSelector optional context

### Trends Tab (trends.tsx)
- Platform pills: Instagram | Facebook | LinkedIn | **X** (label "X", key `twitter`) | TikTok
- Per-platform: platform insight callout, trending formats, hot topics, hashtag strategy (broad/mid/niche), what to avoid, "Create content around these trends" CTA → Generate tab
- Skeleton loader (3 sections) while loading; error state with retry
- Refresh button: `POST /trends/:platform/refresh` — also called on initial load for `twitter` platform (workaround for bad cached data returning LinkedIn content; revert to GET when backend cache bug is fixed)
- `api.trends.get(platform)` — GET, `api.trends.refresh(platform)` — POST

### Generate Tab (generate.tsx)
- Mode toggle: Post | Reel
- Photo upload: extract + score in parallel, badge, verdict, fix
- URL extraction: POST /generate/extract-url
- Listing details, tone, platform multi-select, Target Audience section
- Post mode: 5 platforms, tabbed results, photo recommendations InfoCallout, schedule modal
- Reel mode: Instagram/Facebook/TikTok only, scene cards, TikTok repurpose hook
- History: last 5, expandable, deep-link from Calendar tab

### Analysis Result Screen (analysis/[id].tsx)
- Composite ScoreRing, "Why can't I score a 10?" collapsible
- 4 dimension ScoreCards (Virality/Follower Attraction/Lead Capture/Trust)
- AudienceMatchCard (5th card): verdict, mismatch banner below 5.0, InfoCallout WHY THIS MATTERS
- PlatformFitSection: 5 platform cards, Native badge, expandable what_to_change
- What to Fix (top 3), Optimized Rewrites tabbed by platform with copy
- Lead Magnet Idea, Hashtag Strategy, Best Times to Post
- 30-Day Calendar button: broker-gated, navigates to month-calendar.tsx

### Carousel Result Screen (analysis/carousel/[id].tsx)
- Composite ScoreRing, 5 dimension cards (Hook/Sequence/Consistency/Swipe/CTA)
- Slide strip with thumbnails + score badges, tap for detail modal
- Reorder suggestion (dismissible), CAROUSEL STORY ARC InfoCallout
- Top 3 fixes, caption rewrite with copy button

### Calendar Tab (calendar.tsx)
- Month grid with platform dots, day tap filter
- Edit modal: time presets, status pills, note, PATCH
- FAB add modal, swipe-to-delete, PostHog tracking

### Leads Tab (leads.tsx)
- List/Pipeline toggle, CapturePageCard with QR modal
- LeadCard, LeadDetailSheet, AddLeadModal, PipelineColumn

### Settings Tab (settings.tsx)
- Fetches fresh user data via `api.me.get()` on every mount — subscription/plan always current
- ProfileSection, capture page headline, SubscriptionSection (usage bars, Stripe portal), NotificationsSection, Lead Pipeline preview (top 3), danger zone delete
- billing/plans.tsx: agent/pro/broker cards — Agency NOT YET ADDED
- billing/success.tsx: waits 2s for Stripe webhook, calls `GET /me`, updates store, navigates to Generate
- billing/cancel.tsx: redirects to `/billing/plans`

### Services
- api.ts: auth, me, billing, analyses, carousel, generate (all endpoints), stats, leads, calendar
- analytics.ts: PostHog events for all major actions
- 402 interceptor: plan_upgrade_required → alert + /billing/plans

## What Is NOT Built Yet (Frontend)
- **Shareable Score Card** — BLOCKED on backend `POST /analyses/:id/share-card`
  - Button: "Share Score" below composite ring on `app/analysis/[id].tsx`
  - Flow: tap → call endpoint → get image URL → `Share.share()` with pre-filled text "I scored [X.X] on Scorrd — the AI that grades realtor posts. Try it: scorrd.app"
  - Add `api.analyses.shareCard(id)` to `services/api.ts`
  - Backend returns single image URL; user picks destination (Stories vs feed) after share sheet opens
- Agency tier on billing/plans.tsx — 4th plan card needed
- Agent Settings section (Phase 6 — enable/disable agent, config)
- app/agent/chat.tsx — Saturday intake chat screen
- app/agent/review.tsx — Review and Post screen
- app/listings/ — Listing Library screens
- Voice Profile onboarding + Settings section
- Branded card preview on Review screen
- Conditional rewrite display (score >= 7.5 → preservation note)
- Video analyzer (Phase 5)

## Conventions — ALWAYS follow
- Never suggest Zustand alternatives or different navigation libraries
- Never use inline styles — StyleSheet.create only
- All API calls through services/api.ts only
- Types in /types/index.ts — must match DB schema
- ListingPriceSelector = pills ALWAYS, never slider
- Surgical edits only — never rewrite full files
- Ask before reading unlisted files
- Confirm each step before proceeding
