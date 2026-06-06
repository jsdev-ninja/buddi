---
name: buddia-security-posture
description: Buddia (buddi repo) Firebase/Expo security posture — open Firestore rules, where Zod validation actually runs, profile write-path IDOR safety
metadata:
  type: project
---

Buddia is an Expo Router + React Native + Firebase (Auth/Firestore/Storage/Functions) app in `/Users/philbro/workspace/buddi`. Recurring security context for audits:

**Firestore rules are fully open** (`allow read, write: if true`). Explicitly out of scope to harden per phase plans (see `docs/plans/phase-1-couple-profile.md` §8). Consequence: ALL client-side validation is defense-in-depth only — any authenticated client can write arbitrary field values directly via the SDK. When auditing, treat client-side Zod/inline guards as "plan-approved best effort," not a security boundary. Do not flag a bypassable client check as CRITICAL/HIGH on its own — the open-rules posture is the accepted root risk, owned by product, deferred by plan.

**Where Zod validation actually runs (non-obvious):** `firebaseApi.profiles.create` and `firebaseApi.profiles.update` in `src/services/firebase/index.ts` do NOT call `profileInputSchema.parse()` — they only `cleanObject()` (strip undefined) and write. Validation lives at CALL SITES instead:
- `EditProfileModal.tsx` DOES call `profileInputSchema.parse(dataToValidate)` before `onSubmit` → full schema validation on the edit path.
- `onboarding/index.tsx` does NOT parse — it relies on inline guards (`canNextStep1`, `coupleFieldsValid`). These guards are weaker than the schema (e.g. enforce `partnerAge >= 18` but NOT the schema's `max(120)` / strict-integer). Known gap, accepted given open rules.
So "is this field validated?" depends on which UI writes it, not on the service layer.

**Profile write-path is IDOR-safe by construction:** `profiles.create` writes to `doc(db, "profiles", auth.currentUser.uid)` — a user can only create/overwrite their OWN profile doc; the document ID is the authenticated UID, never a caller-supplied id. `profiles.update` takes a `profileId` arg but the open rules are the (non-)gate there.

**Read path:** `firebaseApi.profiles.getProfile(userId)` is the single Firestore read for any profile. Features that surface a new field of an *already-fetched* profile (e.g. `partnerKind`, `kind` copied off the object `getProfile` returned) add NO new data-exposure surface — same read, same doc, fields already client-readable under open rules.

**i18n `t()` is injection-safe:** `src/lib/i18n/strings.ts` `t(path)` does a recursive dotted lookup against a static `strings.en` object; missing key returns the literal path string. No eval, no dynamic key execution. Safe even if path were user-controlled (it never is — always string literals or values from static consts like `PROFILE_KIND_OPTIONS`).
