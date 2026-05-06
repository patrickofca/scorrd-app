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

## Project
AI social media intelligence platform for real estate agents.
Domain: scorrd.app | Spec: Scorrd_Spec_v1.7.docx

## Build Summary
Full-stack mobile app for real estate agents to score, generate, and schedule social media content using Claude AI.

**Frontend (this repo):** 5-tab Expo Router app — Analyze, Generate, Calendar, Leads, Settings. Auth (email/Google/Apple), Zustand session, React Query server state, Axios via api.ts, PostHog analytics, Stripe billing via WebView portal.

**Backend (scorrd-api):** Express + Prisma + Supabase Postgres. Two-pass Claude scoring (vision → text), structured JSON validation, Audience Match + Platform Fit on every analysis. Stripe subscriptions + metered overage. R2 image storage.

**Current state:** Core loop fully built (analyze → score → generate → schedule → leads). Calendar tab live. Stripe billing verified end-to-end (sandbox). Dashboard hidden from tab bar (routable via direct push only). Reel script generation live (Instagram / Facebook / TikTok) with full Post | Reel mode toggle on Generate tab. 30-Day Calendar generation live (Brokerage plan, gated). Video analyzer not yet built.

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
  (auth)/        login.tsx | register.tsx | _layout.tsx
  (tabs)/        analyze.tsx | generate.tsx | calendar.tsx | dashboard.tsx | leads.tsx | settings.tsx | _layout.tsx
  analysis/      [id].tsx | month-calendar.tsx | carousel/[id].tsx
  billing/       plans.tsx
components/      InfoCallout | ImageUpload | ListingPriceSelector | BuyerTypeSelector | ScoreRing | PlatformPill
                 leads/ LeadCard | LeadDetailSheet | AddLeadModal | PipelineColumn | CapturePageCard | QRModal
                 settings/ ProfileSection | SubscriptionSection | NotificationsSection
constants/       colors.ts | typography.ts | config.ts
services/        api.ts | analytics.ts
store/           authStore | formDraftStore | preFillStore
types/           index.ts
```

## Design System — NEVER deviate from these
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
- Loaders: skeleton only — never ActivityIndicator spinners on content
- Haptics: on every primary action

## Shared Components — REUSE, never rebuild
- ImageUpload — photo upload + camera roll. Used on analyze AND generate.
- ListingPriceSelector — horizontal scroll pill selector. 6 pills: Any price(null) / Under $300k / $300k–$600k / $600k–$900k / $900k–$1.5M / $1.5M+. Single select. ALWAYS pills — NEVER a slider.
- BuyerTypeSelector — multi-select pills: First-Time Buyer / Move-Up Buyer / Luxury Buyer / Investor / Downsizer / Relocating
- ScoreRing — circular SVG, accepts score + color
- InfoCallout — teal left border, 10px uppercase teal label, 13px body, off-white bg
- SkeletonLoader — animated skeleton for all async content

## What Is Built

### Navigation
- Expo Router 5-tab layout: Analyze, Generate, Calendar, Leads, Settings
- `dashboard.tsx` exists and is routable via direct push only — hidden from tab bar via `href: null` in `(tabs)/_layout.tsx`
- `app/index.tsx` root redirect prevents splash screen hang on cold start
- **AuthGate** (`_layout.tsx`) — subscribes to `accessToken`; redirects to `/(auth)/login` when null, restores `expiredPath` or `returnPath` after re-login
- **TokenGuard** (`_layout.tsx`) — `AppState` listener; calls `api.me.get()` on every foreground transition to proactively detect expired tokens. 401 fires the global `expireSession()` chain → `AuthGate` redirects. Covers screens showing cached data with no in-flight request.
- **PushSetup** (`_layout.tsx`) — requests push permissions on auth confirm, calls `Notifications.getExpoPushTokenAsync()`, PATCHes `/me` with `push_token`
- **NotificationBanner** (`_layout.tsx`) — animated slide-down banner for foreground `new_lead` push notifications; 4s auto-dismiss
- **Analytics** (`_layout.tsx`) — `posthog.identify()` on login, `posthog.reset()` on logout
- **ScreenTracker** (`_layout.tsx`) — PostHog screen event on every route change

### Analyze Tab
- **Mode toggle** (Single Post | Carousel): pill segmented control, navy active bg. `mode` state ('single'|'carousel'), default Single Post. Switching does not reset form fields.
- **Single mode**: Platform selector (single), content type pills, post draft textarea with platform-aware char counter (Instagram/TikTok 2200, LinkedIn 3000, Facebook 5000, Twitter 280). `ImageUpload` zone — camera roll + camera. Analyze button → POST /analyses → `/analysis/:id`.
- **Carousel mode**: Image zone hidden. 2-column carousel grid (max 10 slots). Each empty slot: dashed teal border, camera icon, slide number label. Each filled slot: thumbnail, bottom-left label overlay ("Slide 1 — Hook" / "Slide N — CTA" in teal for first/last), top-right remove X. Tap empty slot → ImagePicker (quality 0.75, square crop, base64). Min 2 slides to enable button. Analyze button label: "Analyze Carousel" → `handleCarouselAnalyze` → POST /analyses/carousel → `/analysis/carousel/:id`.
- Optional listing context: `ListingPriceSelector` (6 pills, single select) + `BuyerTypeSelector` (multi-select) — visible in both modes
- Recent analyses list with tap-to-open

### Generate Tab
- **Mode toggle** (Post | Reel): pill segmented control, navy active bg. `mode` state ('post'|'reel'), default Post. Switching resets results/reelResult; Reel mode filters platforms to `REEL_PLATFORMS = ['instagram','facebook','tiktok']`.
- Photo upload: dashed teal border zone; on pick runs `runPhotoExtract` + `runPhotoScore` in parallel. Extract appends to details + 3s teal confirmation. Score badge on thumbnail (color-coded); verdict + fix with `build-outline` (amber, score < 7.0) or `checkmark-circle-outline` (teal, ≥ 7.0).
- 800ms debounce re-score on platform change
- Collapsible "Photo guidance" toggle — `PLATFORM_PHOTO_TIPS Record<string, { tips: string[]; avoid: string[] }>`, platform-specific real-estate tips
- Listing details textarea (max 2000), tone selector, platform multi-select
- Target Audience: `ListingPriceSelector` + `BuyerTypeSelector`
- **Post mode**: all 5 platforms. Generate → tabbed results per platform. "Best Times to Post" card (`PLATFORM_OPTIMAL_TIMES`). Copy + Schedule buttons per tab.
- **Reel mode**: filtered to Instagram / Facebook / TikTok. Calls `api.generate.createReel()` → POST /generate/reel-script. Results: hook block (DM Serif Display + delivery note), numbered scene cards (tap to expand delivery note), Close CTA (teal left border), Caption + copy, Hashtags row (tap copies all), TikTok repurpose hook (Instagram/Facebook only), `REEL_POSTING_STRATEGY` card (times pills + frequency + cadence).
- `REEL_POSTING_STRATEGY`: instagram (3–5/week), facebook (2–4/week), tiktok (1–3/day)
- Schedule modal (shared Post + Reel): 14-day date pills + hourly presets (7 AM–8 PM), optional note → POST /calendar with `generated_post_id`
- **History**: last 5, expandable. Platform label: "Instagram — Reel" / "Facebook — Post" (`isReelScript`). Reel preview parses `hook_line` from JSON; Post shows `generatedCopy`. Expanded card shows: full copy, hashtag pills, **Copy** button + **Add to Calendar** button (side-by-side, right-aligned — opens schedule modal for that history item).
- `historyHelper` text below "Recent Generations" label explains preview truncation
- Deep-link: accepts `postId` param from Calendar tab → auto-expands matching history card. Screen does NOT scroll on generate or deep-link.
- PostHog: `reel_script_generated` (platform, tone, has_audience_target), `post_generated` (platform, tone, has_audience_target, extracted_from_image), `post_copied` (platform)

### Carousel Result Screen
- `app/analysis/carousel/[id].tsx` — fetched via React Query `useQuery(['carousel', id])` → GET /analyses/carousel/:id
- Header: back button, "Carousel Analysis" title (DM Serif Display), "[N] slides analyzed" subtitle
- Composite `ScoreRing` (160px, strokeWidth 14), color-coded, "Carousel Score" label
- 5 dimension cards horizontal scroll: Hook / Sequence / Consistency / Swipe Momentum / CTA — each has 60px ScoreRing + label + score-based verdict
- Slide strip: horizontal ScrollView of 80×80px thumbnails, color-coded score badge bottom-right. Tap thumbnail → modal with full-size image, composition/lighting/content scores, verdict, one_fix
- Reorder suggestion (conditional, dismissible): InfoCallout "SLIDE ORDER SUGGESTION" — "Recommended order: 1 → 3 → 2 — [rationale]". Hidden when `recommendedSlideOrder` is null or dismissed.
- InfoCallout "CAROUSEL STORY ARC" — `sequenceVerdict`
- Top 3 fixes: numbered navy badge rows
- Caption rewrite (conditional): InfoCallout-style copyBox when `captionRewrites.instagram` is not null. Copy button + 2s "Copied!" feedback + haptic.
- Skeleton loaders (pulsing Animated) while loading; error state with retry button

### Analysis Result Screen
- `app/analysis/[id].tsx` — fetched via React Query `useQuery(['analysis', id])`
- Composite `ScoreRing` (160px, strokeWidth 14)
- Collapsible "Why can't I score a 10?" panel (teal left border, 5-paragraph explanation)
- 4 dimension `ScoreCard`s in 2×2 grid: Virality (25%) / Follower Attraction (20%) / Lead Capture (35%) / Trust & Authority (20%)
- Mismatch banner (`#FEE2E2` bg, `#DC2626` border/text) shown when `audienceMatchScore < 5.0`
- `AudienceMatchCard` (5th card): dynamic verdict title, teal border, red banner below 5.0, `InfoCallout` "WHY THIS MATTERS" in expandable, signals + gap analysis + 3 rewrites
- `PlatformFitSection`: 5 platform cards, Native badge, expandable `what_to_change`
- What to Fix (top 3 recommendations with numbered badges)
- Optimized Rewrites: tabbed by platform (Instagram / Facebook / LinkedIn / Twitter / TikTok), copy button — copies full rewrite to clipboard via `expo-clipboard` (`Clipboard.setStringAsync`). Uses `copyActions` + `actionButton` style pattern matching generate.tsx. `rewriteBox` does NOT use `overflow: 'hidden'` (removed — was blocking touch events on iOS).
- Lead Magnet Idea card (teal border)
- Hashtag Strategy: top / niche / brand tier groups
- Best Times to Post: platform rows with flex-wrap time pills
- **30-Day Calendar button** — navy card at bottom, teal "Brokerage" badge when not on brokerage plan. Non-brokerage users: Alert with upgrade CTA → `/billing/plans`. Brokerage users: navigates to `app/analysis/month-calendar.tsx` with `analysisId` param.
- `app/analysis/month-calendar.tsx` — **30-Day Content Calendar screen**:
  - Calls `api.calendar.generateMonth(analysisId)` → POST /calendar/generate-month on mount
  - Animated pulsing skeleton cards (6×, `SkeletonCard` component) while loading
  - Error state with retry button
  - 30 day cards: teal day-number badge (turns green + checkmark when scheduled), date (formatted), platform pill (navy), content type label, hook text (2 lines), topic (italic, 1 line), calendar-icon schedule button
  - Schedule modal per card: 14-day date pills defaulting to item's `suggested_time`, hourly presets, optional note → POST /calendar
  - Tracks scheduled days in local `Set<number>` state — scheduled cards dim + show green checkmark, button disabled
  - Footer: "X of 30 days scheduled" counter
  - PostHog: `calendar_month_generated` (analysis_id, suggestion_count)

### Calendar Tab
- `calendar.tsx` — month grid: 7-column flex grid, colored platform dots per day, today + selected day ring highlights
- Month navigation (prev/next arrows), tap day to filter items list
- Scheduled items list: platform-accented left border cards with date/time, status badge, note, linked post preview
- Tap card → edit modal: time presets, status pills (Scheduled / Published / Skipped), note, PATCH /calendar/:id
- "Take me to this post" in edit modal (shown when `generatedPost` linked) → pushes Generate tab with `postId` param
- FAB → add modal: platform pills, time presets (7 AM–8 PM), optional note, POST /calendar
- Swipe-to-delete (Alert confirm) → DELETE /calendar/:id
- PostHog: `calendar_item_scheduled` on successful POST /calendar
- No external date picker library — date from grid tap, time from preset pills

### Dashboard Tab
- `dashboard.tsx` — not in tab nav, routable via `router.push` only
- Score trend chart, platform breakdown, dimension radar
- Content pattern insights, quick stats, calendar strip

### Leads Tab
- `leads.tsx` — List / Pipeline toggle (FlatList vs kanban)
- `CapturePageCard` — teal card with monospace capture URL, copy to clipboard + 2s confirmation, QR Code button
- `QRModal` — 220px QR code (react-native-qrcode-svg), Share button (RN Share API)
- Pipeline kanban: New / Contacted / Qualified / Closed columns (`PipelineColumn`)
- `LeadCard` — swipeable card with status badge
- `LeadDetailSheet` — slide-up bottom sheet: contact info, status picker, notes, save → PATCH /leads/:id
- `AddLeadModal` — centered modal: name, email, phone, interest, message, platform → POST /leads
- Swipe-to-delete on list and pipeline cards
- PostHog: `lead_captured` (source: 'manual')

### Settings Tab
- `settings.tsx` — sectioned scroll layout
- `ProfileSection` — agent name, market location, brokerage name, avatar (`ImageUpload`), save → PATCH /me
- Capture page headline — custom text input, save → PATCH /me
- `SubscriptionSection` — plan badge, status, trial end date, usage progress bars (analyses + generations, amber at >80%), "Manage Billing" → POST /billing/portal → `Linking.openURL`, "Upgrade Plan" → `/billing/plans`
- `NotificationsSection` — 3 toggles (new lead, weekly digest, usage warnings), save → PATCH /me with `notification_prefs`
- Danger zone — "Delete Account" with confirmation Alert → DELETE /me
- `billing/plans.tsx` — 3 plan cards: solo / team / brokerage. Feature lists with checkmarks, `isCurrent` teal border. Checkout → POST /billing/checkout → `Linking.openURL`. Stripe sandbox verified end-to-end ✓

### Services & Integrations

**services/api.ts**
- Single `request<T>()` function — attaches Bearer token, handles 204, 401 (→ `expireSession()`), 402 (upgrade alert + PostHog), generic errors
- Global 401 → `AuthExpiredError` thrown; `expireSession()` clears Zustand + SecureStore synchronously
- Global 402 interceptor: `plan_upgrade_required` or `subscription_required` → Alert + navigate `/billing/plans`
- `api.auth` — login, register, logout
- `api.me` — get, update (PATCH), delete
- `api.billing` — portal (POST), checkout (POST)
- `api.analyses` — submit, list, get, delete
- `api.carousel` — analyze (POST /analyses/carousel), get (GET /analyses/carousel/:id)
- `api.generate` — create (POST), history, save, delete, createReel (POST /generate/reel-script), extractImage, photoScore, extractUrl
- `api.stats` — dashboard
- `api.leads` — log, list, remove, create, update
- `api.calendar` — list, create, update, remove, **generateMonth(analysisId)** → POST /calendar/generate-month returns `GenerateMonthResponse`

**services/analytics.ts — PostHog events**
- `posthog` singleton — importable in non-React files
- `posthog.identify(id, { plan_tier, market })` on login
- `posthog.reset()` on logout
- `analysis_submitted` — platform, content_type, has_image, has_audience_context
- `analysis_completed` — composite_score, has_audience_match, best_platform_fit
- `post_generated` — platform, tone, has_audience_target, extracted_from_image
- `post_copied` — platform
- `reel_script_generated` — platform, tone, has_audience_target
- `lead_captured` — source ('manual'; add 'capture_page' when web capture fires)
- `upgrade_prompt_shown` — feature, current_plan
- `upgrade_prompt_tapped` — feature, current_plan
- `calendar_item_scheduled` — platform
- `calendar_month_generated` — analysis_id, suggestion_count

**types/index.ts**
- `User`, `Session`, `Post`, `Analysis`, `ScoreBreakdown`
- `GeneratedPost`, `ReelScene`, `ReelScriptResult`, `GenerateReelResponse`, `GenerateResponse`
- `ExtractUrlResponse`, `GenerateHistoryResponse`
- `Lead`, `LeadsResponse`, `DashboardStats`
- `CalendarItem`
- `AnalysisListResponse`, `SubmitAnalysisResponse`
- **`CalendarDaySuggestion`** — day, date, platform, content_type, topic, hook, tone, suggested_time
- **`GenerateMonthResponse`** — { suggestions: CalendarDaySuggestion[] }
- **`SlideScore`** — slide_number, composition_score, lighting_score, content_score, individual_score, verdict, one_fix
- **`CarouselAnalysis`** — id, slideCount, slideImageUrls, perSlideScores, hookScore, ctaScore, sequenceScore, consistencyScore, swipeMomentumScore, carouselCompositeScore, sequenceVerdict, top3Fixes, recommendedSlideOrder, reorderRationale, captionRewrites, createdAt

### Database
- Supabase Postgres via Prisma on scorrd-api (separate repo)
- No schema changes applied from this frontend repo

## What Is NOT Built Yet
- Conditional rewrite logic (score >= 7.5 → preservation_note, no rewrites)
- Video analyzer (Phase 5)

## Conventions — ALWAYS follow
- Never suggest Zustand alternatives
- Never suggest different navigation libraries
- Never use inline styles — StyleSheet.create only
- All API calls through services/api.ts only
- Types in /types/index.ts — must match DB schema
- ListingPriceSelector = pills ALWAYS, never slider
- Surgical edits only — never rewrite full files
- Ask before reading unlisted files
- Confirm each step before proceeding
