# Phase 1 — Couple Profile Type

**Status:** Draft · **Date:** 2026-06-02 · **Stack:** Expo Router + React Native + Firebase (Auth/Firestore/Storage/Functions) · **Author:** software-architect

---

## 1. Summary

Add an optional couple "kind" to user profiles so a single Firebase user can present themselves as a couple. The change is additive: three new fields on the profile (`kind`, `partnerName`, `partnerAge`), an onboarding fork, a centralized display-name helper, a couple pill on Discover/Profile/Group rows, and a one-member-counts-as-couple rule in groups. No new collections, no migration, no security-rules changes, no partner accounts.

---

## 2. Data model changes

All new fields live on the existing `profiles/{profileId}` document. Schema is in `src/entities/profile/profile.ts` (Zod). All are **optional** — existing documents continue to behave exactly as today.

| Field | Type | Default behavior when missing | Notes |
|---|---|---|---|
| `kind` | `z.enum(["solo", "couple"]).optional()` | Treated as `"solo"` everywhere | New discriminator |
| `partnerName` | `z.string().max(100).optional()` | Hidden in UI | Only meaningful when `kind === "couple"` |
| `partnerAge` | `z.number().int().min(18).max(120).optional()` | Hidden in UI | Only meaningful when `kind === "couple"`; 18+ same as primary user |

**Defaults at write time:** Onboarding will write `kind: "solo"` or `kind: "couple"` explicitly. Edit Profile will write the chosen value. We deliberately do not backfill existing documents. Read code must treat `undefined` as `"solo"`.

**`bio` field:** Reused as "About Us" when `kind === "couple"`. The stored field key stays `bio`. Only the label changes.

**Firestore Security Rules:** `firestore.rules` is currently `allow read, write: if true` (fully open). No rule change needed for the new fields. *(Out of scope to harden in this phase.)*

**Firestore Indexes:** None of the new fields are queried independently. `firestore.indexes.json` does not need to change.

---

## 3. File-by-file change list

### Types & helpers (new / changed)

| File | Change |
|---|---|
| `src/entities/profile/profile.ts` | Add `kind`, `partnerName`, `partnerAge` to `profileSchema`. `profileInputSchema` inherits the additions automatically (no `.omit` change needed). |
| `src/lib/data/mockData.ts` | Add `kind?: "solo" \| "couple"`, `partnerName?: string`, `partnerAge?: number` to `TravelerProfile`. Add 2 couple example profiles to any in-file seed/sample arrays if present. *(Currently this file only declares types — no seed data lives here. If seed data is added, include couples.)* |
| `src/lib/profile/displayName.ts` *(NEW)* | The single source of truth for "Name & Partner" formatting. ~30 lines. Pure function, no React/Firebase imports. See §4. |
| `src/lib/profile/index.ts` *(NEW)* | Barrel re-export of `displayName`. |
| `src/constants/onboarding.ts` | Add `PROFILE_KIND_OPTIONS = [{ value: "solo", label: "Solo Traveler", … }, { value: "couple", label: "Couple", … }]`. |
| `src/lib/i18n/strings.ts` *(NEW)* | Object map of every new English string this phase introduces, keyed by stable IDs. Importers reference `t("onboarding.profileKind.solo")` etc. Functions as a flat lookup today; Hebrew can be added later. See §11. |

### Screens & components

| File | Change |
|---|---|
| `src/app/onboarding/index.tsx` | Add a new **Step 0** profile-type selector (Solo / Couple). When Couple, render partner name + partner age inputs alongside the existing name/birthday/gender block in Step 1. `TOTAL_STEPS` stays at 4 for solo, 4 for couple (the new selector is rendered above the step indicator and does not increment it — see §5). On finish, write `kind`, `partnerName`, `partnerAge`. Change bio prompt label to "About Us" / "Tell us about you both…" when `kind === "couple"`. |
| `src/components/EditProfileModal.tsx` | Add a Profile Type segmented control (Solo / Couple). When Couple, show partner name + partner age inputs and re-label "Bio" → "About Us". On submit, include `kind`, `partnerName`, `partnerAge` in `ProfileInput`. Switching Couple → Solo keeps partner fields stored (not cleared) but hides the inputs — forward-compatible. See §6. |
| `src/app/(tabs)/profile.tsx` | Display combined name via `getDisplayName(profile)`. Show couple pill (Heart + Users icon) near the name. Change About-Me title to "About Us" when `kind === "couple"`. If `partnerAge` set, show "26 & 28" instead of just "26" in the age slot. |
| `src/app/view-profile/[id].tsx` | Same as own profile: combined name in title, couple pill, About-Us label, partner age in age slot. |
| `src/app/(tabs)/index.tsx` (Discover) | `convertedProfiles` mapper passes `kind`, `partnerName`, `partnerAge` from `Profile` → `TravelerProfile`. Card overlay header uses `getDisplayName`. Add couple pill near the name (overlay and detail sheet). Detail "About me" section renamed to "About Us" when couple; "Partner" mini-row visible (Partner name · age) within the detail section. |
| `src/app/(tabs)/matches.tsx` | `ProfileCard` uses `getDisplayName(profile)`. Couple pill shown next to name. |
| `src/app/(tabs)/messages.tsx` | Conversation `name` already comes from `firebaseApi.chat.getConversations`. That helper must use `getDisplayName` (see services change below). Couple conversations get a small couple icon in the row's name area. |
| `src/app/chat.tsx` | `chatName` shown in header uses the combined name as returned by `getConversation` / `getConversations`. Add the couple pill next to the header name when the conversation partner is a couple. **No change to message bubble rendering.** |
| `src/app/group/[id].tsx` | "Who liked this group" rows: replace `liker.name` with combined name via helper. Member-count math: see §7. Couple pill next to liker rows that represent couples. |
| `src/components/CreateGroupModal.tsx` | Participants list shows combined name + couple pill for couple matches. Selecting a couple still counts as **one** in the participants array (a single user ID). |
| `src/components/SwipeableCard.tsx` | No code change required — it renders children. Couple-specific UI lives in `(tabs)/index.tsx`. |
| `src/components/CouplePill.tsx` *(NEW)* | Small ~25-line presentational component: Heart + Users icon + "Couple" label. Variants: `compact` (icon only, ~16px) and `full` (icon + label). Used everywhere a couple is rendered. |

### Backend / services

| File | Change |
|---|---|
| `src/services/firebase/index.ts` — `chat.getConversations` (~line 1095) | Where it does `name = otherProfile?.name \|\| "Unknown"`, replace with `name = getDisplayName(otherProfile)`. |
| `src/services/firebase/index.ts` — `chat.getConversation` (~line 1140) | Same substitution. |
| `src/services/firebase/index.ts` — `chat.createConversation` | No change. Conversation participants are still `userId`s; nothing about a couple changes the 1-on-1 conversation ID generation. |

**Cloud Functions:** No code changes required for Phase 1. The notification trigger (if/when it lands) will pull the name via `getDisplayName` from the profile doc.

---

## 4. Display name helper

### Signature

```ts
// src/lib/profile/displayName.ts

type DisplayNameInput = {
  name?: string | null;
  kind?: "solo" | "couple" | null;
  partnerName?: string | null;
};

/** Single source of truth for how a profile's name renders. */
export function getDisplayName(profile: DisplayNameInput | null | undefined): string {
  const primary = profile?.name?.trim() || "Unknown";
  const isCouple = profile?.kind === "couple";
  const partner = profile?.partnerName?.trim();
  if (!isCouple || !partner) return primary;
  return `${primary} & ${partner}`;
}

/** True when this profile should render couple-specific UI (pill, About Us label, etc.). */
export function isCoupleProfile(profile: { kind?: "solo" | "couple" | null } | null | undefined): boolean {
  return profile?.kind === "couple";
}
```

### Examples

| Profile | Output |
|---|---|
| `{ name: "Maya", kind: "solo" }` | `Maya` |
| `{ name: "Maya" }` (kind missing) | `Maya` |
| `{ name: "Maya", kind: "couple", partnerName: "Yoav" }` | `Maya & Yoav` |
| `{ name: "Maya", kind: "couple", partnerName: "" }` | `Maya` (couple-but-incomplete → degrade) |
| `{ name: "Maya", kind: "couple" }` (no partnerName) | `Maya` |
| `{}` | `Unknown` |
| `null` | `Unknown` |

### Where it's called

1. `src/app/(tabs)/profile.tsx` — own profile name
2. `src/app/view-profile/[id].tsx` — other user's profile name
3. `src/app/(tabs)/index.tsx` — Discover card overlay + detail
4. `src/app/(tabs)/matches.tsx` — match card grid
5. `src/app/(tabs)/messages.tsx` — conversation row (via `chat.getConversations`)
6. `src/app/chat.tsx` — chat header (via `chat.getConversation`)
7. `src/app/group/[id].tsx` — Group Likes liker rows
8. `src/components/CreateGroupModal.tsx` — participant picker rows
9. `src/components/EditProfileModal.tsx` — title bar ("Edit Profile — Maya & Yoav")
10. `src/services/firebase/index.ts` — `chat.getConversations` and `chat.getConversation` (so all consumers receive the already-formatted name)

If a coder finds a 10th+ display site that wasn't listed, they must route through the helper.

---

## 5. Onboarding fork

### Decision: where the selector goes

Place the Solo / Couple selector as a **new pre-Step-1 page** inside the existing step machinery, rendered before any other field. Rationale:

- The current Step 1 already mixes 3 fields (name / birthday / gender). Adding 3 more (kind + partnerName + partnerAge) makes it a 6-field wall and breaks the visual rhythm of "one card per step".
- The dots indicator at the bottom (`TOTAL_STEPS = 4`) is built around the existing 4 cards. We do not increment `TOTAL_STEPS`. The selector card sets `step = 0` and renders with the dots all empty (gives the user a "step 0" feel) — once they tap Continue, the existing Step 1 paints with dot 1 active. This is a tiny visual deviation that's clearer than mixing the question into Step 1.

Alternative (rejected): adding it as a checkbox inline at the top of Step 1. Reasoning to reject: a binary that *changes the rest of the form* should be a deliberate choice on its own screen, not a checkbox the user can miss.

### Step-level diagram

```
Step 0 (new)        Step 1                  Step 2          Step 3                          Step 4
┌──────────────┐    ┌───────────────────┐   ┌──────────┐    ┌────────────────────────────┐  ┌──────────────┐
│ Solo  ☐      │    │ Name              │   │ Main     │    │ Photos                     │  │ Interests    │
│ Couple ☐     │ →  │ Birthday          │ → │ photo    │ →  │ Bio  (label = "About Us"   │→ │              │
│              │    │ Gender            │   │          │    │       when kind=couple)    │  │ [Finish]     │
│ [Continue]   │    │ ── if couple: ──  │   │          │    │ Location                   │  │              │
│              │    │   Partner name    │   │          │    │ Adventure plan             │  │              │
│              │    │   Partner age     │   │          │    │ Country                    │  │              │
└──────────────┘    └───────────────────┘   └──────────┘    └────────────────────────────┘  └──────────────┘
   dots: ····          dots: ●···              dots: ●●··        dots: ●●●·                     dots: ●●●●
```

### New / changed fields in onboarding

- Step 0 (new): `kind` (default `"solo"`)
- Step 1 conditional: `partnerName` (required if couple), `partnerAge` (required if couple, ≥18)
- Step 3: Bio label flips to "About Us" / placeholder flips to "Tell us about you both…" when couple
- `canNextStep1` becomes: name + birthday + gender + age 18+ + (if couple: partnerName non-empty AND partnerAge ≥ 18)
- `handleFinish` writes `kind`, `partnerName?`, `partnerAge?` to the profile create payload

### Existing-user impact

Existing solo users (no `kind` field) finished onboarding under the old flow. They never see Step 0 again. Their `kind` stays `undefined` → treated as `"solo"` everywhere via the helper.

---

## 6. UI details

### Couple pill

- Component: `src/components/CouplePill.tsx`
- Visual: Heart icon + Users icon in a small pill, label "Couple". Background: `buddiColors.primaryMuted`. Foreground: `buddiColors.primary`.
- Two variants:
  - `compact`: icon-only, height ~18px, used in dense rows (conversation list, group liker rows, matches grid card overlay).
  - `full`: icon + "Couple" text, height ~22px, used on the Discover detail header, View Profile header, and own Profile header.
- Placement: immediately to the right of the rendered display name, with `gap: 6`.

### Discover card

- Overlay header: `Maya & Yoav, 28 & 30` (combined name + ages, both ages shown if both present)
  - Age rendering rule: if `partnerAge` is set → render `${age} & ${partnerAge}`; else just `${age}`.
- Just below the name row: `CouplePill` (full variant).
- Detail sheet (scrollable section under the photo):
  - "About Us" section instead of "About me".
  - New "Partners" mini-row directly under the name overlay: avatar-less, just `Maya · 28   /   Yoav · 30` styled small. *(Phase 1 has no partner photo — that's Phase 4+ territory. Out of scope.)*

### Edit Profile modal

- New segmented control at the top of the form, above Name: `[ Solo ] [ Couple ]`.
- When Couple is selected, two new fields appear directly under Name:
  - "Partner's Name" (text)
  - "Partner's Age" (numeric, 18–120)
- "Bio" field's label switches to "About Us" / placeholder updates to "Tell everyone about you both…".
- Title bar reads `Edit Profile · Maya & Yoav` (via helper).
- **Switch behavior (couple → solo):** partner fields hide; stored values are **kept** in `formData` and **kept** in Firestore on save (forward-compatible — if the user toggles back, their old values are still there). Recommended UX: a small inline note "Switching to Solo will hide partner details. They'll be restored if you switch back." Decision rationale: keep+hide is reversible; clear is destructive and there's no engineering reason to clear.

### Own Profile screen

- `nameRow`: render `getDisplayName(profile)`. Age line shows `28 & 30` when partner age is set; otherwise just `28`.
- New `CouplePill` (full) next to the name when couple.
- "About Me" → "About Us" when couple.

### Conversation list (Messages)

- Row name: combined name from `getConversationName(name)` (which already pulls from `chat.getConversations` using the helper).
- `CouplePill` (compact) inline, right of name, before the Group pill if both apply (couples in groups are still individuals, so this likely won't happen except in the "matched with a couple, then they created a group" edge — see §9).

### Chat header

- Title: combined name.
- `CouplePill` (compact) inline to the right of the name; the `members` count stays as-is.

### Group Detail — Group Likes list

- Each liker row shows `getDisplayName(profile)` and `CouplePill` (compact) when the liker is a couple.
- "Add to group" / "In group" / "Full" actions unchanged.

---

## 7. Group joining behavior

### Rule

**A couple counts as one member in `currentMembers` / `maxMembers`.** This is the *only* group-counting rule that changes. The data model already supports it because `participants: string[]` is a flat list of `userId`s — a couple is a single `userId`.

### Consequences (already true by virtue of the existing model — confirming)

- `firebaseApi.likes.likeGroup(groupId)` — when a couple's user document calls this, exactly one entry lands in `groupLikes` for that group. ✓
- `firebaseApi.groups.addParticipant(groupId, userId)` — adds one entry to `participants[]`. ✓
- `firebaseApi.groups.getGroup(groupId).participants.length + 1` (the `+1` is the creator) — naturally counts a couple as 1. ✓
- "Members 4/8" math is preserved without modification.

### What changes in UI

- The Group Likes liker row shows the combined name. The action ("Add to group") still adds one userId.
- The Discover group card's member-count badge does not need changes — it already reads from `participants.length + 1`.
- **Edge case:** the spec's "4–7 second simulated auto-approve" was explicitly rejected by the user. The real creator-approve flow (already implemented in `src/app/group/[id].tsx`) stays unchanged. **Do not touch this flow.**

### What does NOT change

- Group creator authority — still the single user who created the group, regardless of their `kind`.
- Group chat conversation participants — still a flat list of userIds.
- Anything about the group document schema in `src/entities/group/index.ts` — no fields added.

---

## 8. Migration / backwards compatibility

### Existing solo profiles

- Have no `kind`, `partnerName`, or `partnerAge`.
- Every read site routes the profile through `getDisplayName` / `isCoupleProfile`, both of which treat `undefined` as `"solo"`. No display difference.
- No script-driven backfill. No data migration.

### Edit Profile for an existing solo user

- Modal opens with the segmented control defaulting to Solo (since `kind === undefined → "solo"`).
- If user switches to Couple and saves, the document gains the three new fields. Other clients that haven't shipped Phase 1 yet will simply ignore the unknown fields (Zod `.optional()` + `getDisplayName` returns `name` when kind is unknown to them too).

### Firestore Security Rules

- Currently fully open (`allow read, write: if true`). Adding fields requires no rule update.
- Note: this is a known security gap, but hardening rules is **out of scope for Phase 1**.

### Firestore Indexes

- No change needed. New fields aren't queried.

### Cloud Functions

- No deployment changes for Phase 1.

---

## 9. Edge cases

| # | Edge case | Required behavior |
|---|---|---|
| 1 | `kind` is missing on the document | Behaves as solo. `getDisplayName` returns `name`. No couple pill. |
| 2 | `kind === "couple"` but `partnerName` is empty/missing | `getDisplayName` returns just `name`. Couple pill **still shows** (the user said they're a couple even if partner name not entered yet). EditProfile flags Partner Name as required when Couple is selected. Onboarding requires it. |
| 3 | `partnerAge` missing | Age line shows just `${age}` instead of `${age} & ${partnerAge}`. |
| 4 | `partnerAge < 18` | Edit Profile and Onboarding both block save with inline error: "Partner must be 18+". |
| 5 | Switching Couple → Solo mid-onboarding | Step 0 is the only place this can happen pre-finish. Partner fields are removed from the in-memory form state (cleared) since nothing's saved yet. |
| 6 | Switching Couple → Solo in Edit Profile | Partner fields are hidden but `formData.partnerName` / `formData.partnerAge` are kept. On save, both old values persist in Firestore. If the user re-toggles, they reappear. Inline note explains this. |
| 7 | Very long combined name in chat header (e.g. "Maximiliano & Christopher-James") | Apply `numberOfLines={1}` and `ellipsizeMode="tail"` to the `chatName` Text in `src/app/chat.tsx`. Same treatment on Discover overlay, Matches card, Conversation row, Group liker row, Group detail. The compact CouplePill always renders **after** the name so it stays visible when the name truncates. |
| 8 | Couple primary user is in a group | Counts as 1 member. UI shows combined name in member-related rows (likers, etc.). No special handling. |
| 9 | Search/filter in Discover — couple counts as a person card | A couple appears in the profile-card pool (lookingFor != 'group'). Filtering by `gender` still uses the primary user's gender; partner gender is **not** tracked in this phase. Note in Out of Scope. |
| 10 | Existing profile prompts ("My Answers") on a couple | Stay attached to the couple's single profile. Phase 3 work, not Phase 1. |
| 11 | Couple sends an unmatch / leaves a chat | Same as solo — single user action. No partner-account semantics. |
| 12 | Partner age = primary age | Render `28 & 28` — no special case. |
| 13 | Bio empty for a couple | Renders the empty placeholder "No bio yet." with title "About Us". |
| 14 | Group creator is a couple | They still solo-control the group (single creator userId). UI labels unchanged. |

---

## 10. Test plan

The repo has no test runner configured. Two paths:

**Option A (recommended for Phase 1):** add `jest` + `jest-expo` + a single test file just for the display-name helper, since it's a pure function with high fan-out value. Add a `"test": "jest"` script. ~15 minutes of coder time. The lint step already exists; this slots in cleanly.

**Option B:** no automated tests; rely on manual QA. Acceptable but less safe given the helper is called from 10 sites.

### Unit tests — `src/lib/profile/__tests__/displayName.test.ts` *(if Option A)*

```
getDisplayName
  ✓ returns "Unknown" for null
  ✓ returns "Unknown" for empty profile
  ✓ returns "Unknown" when name is empty string
  ✓ returns name alone when kind is undefined
  ✓ returns name alone when kind is "solo"
  ✓ returns name alone when kind is "couple" but partnerName missing
  ✓ returns name alone when kind is "couple" but partnerName is empty/whitespace
  ✓ returns "Name & Partner" when kind is "couple" and partnerName is set
  ✓ trims whitespace from both names

isCoupleProfile
  ✓ false when kind is undefined
  ✓ false when kind is "solo"
  ✓ true when kind is "couple"
  ✓ false when profile is null/undefined
```

### Manual QA checklist

Create two test users on `buddia-dev`: a solo and a couple. Run through every surface.

1. **Onboarding (couple):** Step 0 → pick Couple → Step 1 shows partner fields → enter partner age 17 → save blocked → enter 25 → progress through to finish → Firestore doc has `kind: "couple"`, `partnerName`, `partnerAge`.
2. **Onboarding (solo):** Step 0 → pick Solo → no partner fields in Step 1 → finish → Firestore doc has `kind: "solo"`, no partner fields.
3. **Existing user (no kind field):** open Edit Profile → segmented control defaults to Solo → no partner fields → save → no new fields written. Open My Profile → renders exactly as before. Open Discover → renders exactly as before.
4. **Edit: solo → couple:** flip control → enter partner → save → reload → see combined name everywhere.
5. **Edit: couple → solo:** flip control → save → see solo name, no couple pill. Reopen modal → partner fields still populated under the hood (re-flip to Couple shows them). *(Not testable without manual Firestore inspection — confirm via Firestore console.)*
6. **Discover (own user is couple, sees another couple):** card overlay shows "Maya & Yoav, 28 & 30" + couple pill. Detail sheet says "About Us".
7. **Matches grid:** couple card shows combined name + compact pill.
8. **Conversation list:** couple match row shows combined name + compact pill.
9. **Chat header:** combined name + compact pill. Very long name truncates with ellipsis.
10. **Group create:** participant picker shows combined name + pill for couple matches. Selecting a couple adds **one** entry to `participants[]`.
11. **Group join (couple likes a group):** Group Likes (creator view) shows combined name + pill. "Add to group" adds one userId. Member count goes from X/N to X+1/N (not X+2/N).
12. **Group full edge:** with 7/8 members, adding one couple → 8/8 (not 9/8).

### Out of scope for tests

- Push-notification copy (no notification code paths touched in this phase).
- Cloud Functions (no functions touched).
- Firestore rules (rules unchanged).
- Partner photos / partner gender / partner bio — not in this phase.

---

## 11. i18n-readiness

No translation library is wired in. The `language` setting in `src/app/settings.tsx` is a label saved to AsyncStorage; nothing reads it yet.

### What this phase does

1. Create `src/lib/i18n/strings.ts` with the structure:
   ```ts
   // src/lib/i18n/strings.ts
   export const strings = {
     en: {
       onboarding: {
         profileKind: { solo: "Solo Traveler", couple: "Couple" },
         partnerName: "Partner's Name",
         partnerAge: "Partner's Age",
         partnerAgeError: "Partner must be 18+",
       },
       profile: {
         aboutMe: "About Me",
         aboutUs: "About Us",
         aboutMePlaceholder: "Tell us about yourself…",
         aboutUsPlaceholder: "Tell us about you both…",
         couplePillLabel: "Couple",
       },
       edit: {
         title: (name: string) => `Edit Profile · ${name}`,
         switchToSoloNote: "Switching to Solo will hide partner details. They'll be restored if you switch back.",
       },
       common: { unknown: "Unknown" },
     },
     // he: {} — backfilled later
   };

   export function t(path: string): string { /* simple dotted lookup against strings.en */ }
   ```
2. **All new strings introduced in Phase 1 must go through `t("path.to.key")`.** Existing strings (everywhere else) are left alone — refactoring 70% of the app's strings is a separate effort and explicitly out of scope.
3. When Hebrew is added later (Phase 4 / language toggle), a `he:` block is added to `strings`, `t` learns to pick by `currentLanguage`, and the existing `language` toggle in settings becomes the source of `currentLanguage`. No call sites change.

### Do NOT in this phase

- Do **not** install `i18next` / `react-i18next` / `expo-localization`. The user said "do not introduce a translation library in this phase if there isn't already one."
- Do **not** refactor existing English strings into `t(…)`. New strings only.

---

## 12. Phase 2 + 3 roadmap (one page)

### Phase 2 — Chat media (voice + images)

**Status finding:** `src/app/chat.tsx` already implements `pickImage`, `startRecording`, `stopRecording`, `AudioMessage`, and `firebaseApi.storage.uploadChatMedia` + `firebaseApi.chat.sendMessage(id, '', { image | audio })`. **Phase 2 is ~80% done already.** Phase 2 is mostly QA, polishing, and filling gaps.

**Scope:**
- Voice messages: confirm playback works on iOS + Android, confirm permissions prompt copy, ensure `expo-av` `Audio.requestPermissionsAsync` is wired (it is). Add waveform-during-recording UI (currently the waveform is post-send static).
- Image messages: confirm aspect-ratio handling in `renderMessageImage`, add a full-screen lightbox on tap (currently `onPress={() => {}}`).
- Add upload progress UX (currently a generic "Sending…" spinner).
- Add max-duration limit for voice messages (e.g. 2 min) with auto-stop + visible timer.
- Block sending while the previous media is still uploading (currently `isSendingMedia` guards the button but not the recorder).

**Firestore message schema additions** (already present, just confirming the shape):
```
conversations/{convId}/messages/{messageId}
  - userId: string
  - text: string ("" when media-only)
  - createdAt: number
  - image?: string  (download URL)
  - audio?: string  (download URL)
```
No new fields needed unless adding `mediaType: "image" | "audio" | "text"` for cleaner discrimination — recommend adding for forward-compat.

**Storage paths** (already in code at `src/services/firebase/index.ts` line ~699):
```
chat/{conversationId}/{image|audio}_{Date.now()}.{ext}
```
No change required.

**Recording permissions** (already in code): `Audio.requestPermissionsAsync()`. Verify the `Info.plist` `NSMicrophoneUsageDescription` and `NSPhotoLibraryUsageDescription` strings in `app.json` / iOS config.

**Rough file list:** `src/app/chat.tsx` (lightbox, timer, polish), `src/services/firebase/index.ts` (optional `mediaType` field), `app.json` (verify permission strings), Firestore Storage rules (currently `storage.rules` exists — confirm it allows `chat/**` writes from authenticated users).

**Out of scope for Phase 2:** video messages, reactions, message editing, message deletion (these are explicit gaps in PROGRESS.md but separate).

### Phase 3 — Stub wire-ups

Three discrete sub-tasks, each independently shippable.

**3a. Personality answers display + save**
- Already partially built: `EditAnswersModal` exists and `firebaseApi.profiles.update(id, { prompts })` is wired. `Profile.prompts` is in the schema. Discover card and Own Profile already render prompts.
- Gap: **onboarding Step 3 (personality questions)** mentioned in PROGRESS.md doesn't exist as a step — the current onboarding doesn't capture prompts at all.
- Plan: add a new onboarding step (between current Step 3 and Step 4) with the personality question set and Skip button. Save `prompts` array to the profile doc on finish.
- Files: `src/app/onboarding/index.tsx` (new step), `src/constants/onboarding.ts` (add PERSONALITY_QUESTIONS list), nothing else.

**3b. Completed adventures save/display**
- Already partially built: `EditCompletedAdventuresModal` exists; `firebaseApi.profiles.update(id, { completedAdventures })` works; Own Profile and Discover both render the list.
- Gap: the "Mark as Completed" button on a group does not currently push the completed adventure into the user's profile.completedAdventures.
- Plan: in `firebaseApi.groups.markCompleted(groupId)` (already exists at ~line 700-something in firebase/index.ts — verify), additionally write a `completedAdventures` entry to each participant's profile.
- Files: `src/services/firebase/index.ts`, `src/app/group/[id].tsx` (to refresh the profile after marking complete).

**3c. Mark-as-completed dialog with date + photo**
- Currently: `handleMarkCompleted` in `src/app/group/[id].tsx` calls `markCompleted` immediately with no confirmation/photo/review.
- Plan: open a new `CompleteAdventureModal` that asks for completion date (default today) and an optional photo upload. On submit, call `markCompleted` AND attach the photo+date to each participant's `completedAdventures` entry.
- Files: `src/components/CompleteAdventureModal.tsx` *(NEW)*, `src/app/group/[id].tsx`, `src/services/firebase/index.ts` (extend `markCompleted` to accept `{ photo, completedAt }`).

**Rough file list (Phase 3):** `src/components/CompleteAdventureModal.tsx`, `src/app/onboarding/index.tsx`, `src/app/group/[id].tsx`, `src/services/firebase/index.ts`, `src/constants/onboarding.ts`.

**Out of scope for Phase 3:** review/rating UI (spec mentions it, but explicitly out per the user's Phase 3 scope), reputation system, daily-like limits, premium payments.

---

## 13. Risks & open questions

| Severity | Item |
|---|---|
| Medium | The display-name helper is called from 10+ sites. Any new screen that renders a name and forgets to use it will silently revert to "primary name only" for couples. Mitigation: a code-review checklist item; also the firebase service layer (`chat.getConversations` / `getConversation`) bakes the helper in so most downstream consumers don't need to call it themselves. |
| Medium | The `bio` field doubles as "About Us". If a user toggles couple ↔ solo, the text they wrote in one context shows up in the other. Acceptable for Phase 1 (the user said reuse the field), but worth surfacing in the EditProfile inline note: "Your bio text is shared between solo and couple modes." |
| Low | `partnerAge` is stored as a number alongside `age`. They drift independently — a couple won't get a birthday reminder for the partner. Phase 1 doesn't have birthday reminders so this is moot; flag for any future birthday/age-aware feature. |
| Low | Firestore rules are fully open. The new fields inherit that posture. Not a Phase 1 concern but worth noting. |
| Open | Should couples appear in the Discover **group** track? Currently couples are profile cards (not group cards). The spec hints at couple-specific Discover filters (out of scope). Confirmed by user. |
| Open | If the couple's primary user changes their `kind` from couple to solo, do we also want to send a soft notification to anyone they've matched with? User decision deferred — flagged for product. Default: silent. |
| Open | The recommended onboarding pattern (Step 0 with empty dots) is slightly novel for this app. If the visual feels wrong in QA, the fallback is inlining the selector at the top of Step 1 (see §5 alternative). Decide during the build, not now. |

---

## 14. Dependencies & sequencing

- **Run first:** new `src/lib/profile/displayName.ts` + `src/components/CouplePill.tsx` + schema additions in `src/entities/profile/profile.ts` + `src/lib/i18n/strings.ts`. These are pure modules with no dependents inside the phase.
- **Parallel after that:** Onboarding fork (`onboarding/index.tsx`), Edit Profile (`EditProfileModal.tsx`), and all read-only display sites (`profile.tsx`, `view-profile/[id].tsx`, `(tabs)/index.tsx`, `(tabs)/matches.tsx`, `chat.tsx`, `group/[id].tsx`, `CreateGroupModal.tsx`) can all be done in parallel by separate coder sessions, since they each just consume the helper.
- **Blocked until:** `services/firebase/index.ts` changes (substituting `getDisplayName` in `chat.getConversations` / `getConversation`) — must land before `messages.tsx` and `chat.tsx` are QA'd, otherwise conversation names stay solo even for couples.

**Suggested first coder session:** "Add the contract" — schema + helper + pill + strings. Single coder, single PR. Once that lands, fan out the consumer work in parallel.

---

## 15. Security invariants

- **No new external services** introduced in this phase.
- **No new secrets** needed.
- **No new auth checks** required — the new fields ride on the existing profile document, which already follows the existing (open) read/write rules.
- **Input validation:** `partnerAge` must be 18–120 (matches existing `age` constraint). `partnerName` `.max(100)` (matches existing `name`). Both validated client-side via Zod (`profileInputSchema`).
- **Data exposure:** Couple profile is fully public to anyone who can read profiles today (same as solo profiles). No new PII is exposed beyond what the user opts into entering.
- **Trust escalation:** None. The `kind` field is a self-declared display preference; it grants no privileges, no extra storage, no extra messaging capability.

---

*End of plan.*
