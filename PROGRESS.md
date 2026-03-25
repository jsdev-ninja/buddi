# Buddia – Feature Progress

> Cross-referenced against UI spec (`Buddia_ממשק ui (1).pptx`)

---

## ✅ Done

### Authentication
- [x] Google Sign-In with Firebase Auth
- [x] Redirect to onboarding if no profile
- [x] Redirect to tabs if profile exists
- [x] Loading state during sign-in

### Onboarding (4 steps)
- [x] Step 0 – Name, birthday, gender with age 18+ validation
- [x] Step 1 – Profile photo upload to Firebase Storage
- [x] Step 2 – Bio, location, country, extra photos (up to 6), interests (up to 5)
- [x] Step 3 – Personality questions (with skip option)
- [x] Step 4 – Adventure plan (destination, activity type, difficulty, budget, dates)
- [x] Progress indicator (dots)
- [x] Form validation with error messages
- [x] Auto-redirect to tabs on completion

### Layout / Navigation
- [x] Bottom tab bar (Profile, Adventures, Discover, Messages, Matches)
- [x] Special styling for center Discover tab
- [x] Orange notification badges on Messages and Matches
- [x] Profile check on mount → redirect to onboarding if missing
- [x] Header with logo, settings, logout

### Discover (Swipe)
- [x] Swipeable cards (Traveler profiles + Adventure groups)
- [x] Right swipe = Like, Left swipe = Pass
- [x] Haptic feedback on swipe
- [x] Undo button (go back one card)
- [x] Refresh button
- [x] Filter modal (gender, age range, activity type, verified-only)
- [x] Tap card → navigate to full profile / group detail
- [x] "You've seen everyone" empty state
- [x] Loading state
- [x] Group card: cover image, activity/difficulty tags, destination, members, dates
- [x] Traveler card: photo, name/age/location, bio, interests

### Matches
- [x] "Likes You" tab – profiles who liked current user
- [x] "Matches" tab – mutual matches
- [x] Like back / Pass actions
- [x] Tap match → open chat
- [x] 2-column card grid
- [x] Empty states with "Discover People" CTA

### Messages
- [x] Conversation list (1-on-1 + groups)
- [x] New match shown as "tap to say hi"
- [x] Timestamp and last message preview
- [x] Create Group button → modal
- [x] Open conversation → chat screen

### Chat
- [x] Real-time messages via Firestore subscription
- [x] Send text messages
- [x] Day separators
- [x] Header: back, name, member count, online dot
- [x] Unmatch option (1-on-1 only)
- [x] Suppress notifications while chat is open
- [x] Group chat support (basic)

### Profile (My Profile)
- [x] Display name, age, location, bio, interests
- [x] Photos grid
- [x] Edit profile modal (name, age, location, country, bio, interests, photos)
- [x] Upload/manage photos (up to 6)
- [x] Verified badge UI
- [x] Navigate to Premium screen
- [x] Loading and error states

### View Profile (Other Users)
- [x] Full profile view (photo, name, age, location, bio, interests, photos)
- [x] Like / Pass buttons
- [x] Message button (if matched)
- [x] Unmatch button (if matched)
- [x] Prevents viewing own profile (redirects)
- [x] Match status checking

### Adventures
- [x] Tabs: Adventure (trending), My Groups, Completed
- [x] Create Group modal (3-step: info → details → participants)
- [x] My Groups: active groups from Firestore
- [x] Completed: finished adventures
- [x] Tap group → Group detail screen
- [x] Discover CTA button

### Group Detail
- [x] Hero image, title, destination, member count/max
- [x] Tags, activity type, description, dates
- [x] "Group Likes" section (who liked the group) – creator only
- [x] Add participant from likers – creator only
- [x] Mark as Completed – creator only
- [x] Edit group – creator only
- [x] Join button (if conditions met)

### Settings
- [x] Account info (email, name – read only)
- [x] Push notifications toggle
- [x] Location sharing toggle
- [x] Private profile toggle
- [x] Language selector
- [x] Save to AsyncStorage
- [x] Logout (clears auth, redirects to sign-in)

### Premium Screen
- [x] Feature comparison (Free vs Premium)
- [x] Benefits list (Unlimited Likes, Profile Boosts, See Who Liked You)
- [x] Price card ($9.99/month)
- [x] "You're Premium!" state UI

---

## ❌ Missing / Incomplete

### Authentication
- [ ] Apple Sign-In (spec requires it)
- [ ] Phone number sign-in (spec requires it)
- [ ] Facebook sign-in (spec mentions optionally)
- [ ] "Log In" button on sign-in screen is broken (duplicate, does nothing different)

### Onboarding
- [ ] Personality questions (Step 3) not saving to Firestore – only local state

### Discover
- [ ] Daily like limits for free users (`DailyLimits` / `LimitReachedModal`)
- [ ] "You matched!" Toast notification on mutual match
- [ ] `LimitReached → Premium` redirect flow
- [ ] Distance filter (km slider) – UI exists but unclear if connected to real geo data

### Chat
- [ ] Image/video sending
- [ ] Voice message recording and playback
- [ ] Group management from chat (manage members, roles, leave group, change background)
- [ ] Group options menu ("coming soon" placeholder)
- [ ] Custom chat background per conversation

### Profile (My Profile)
- [ ] "My Answers" section – always shows empty placeholder
- [ ] "Completed Adventures" section – always empty (not fetched)
- [ ] "Edit Adventure Plan" button – no handler attached
- [ ] User level / reputation system (UI only, hardcoded as 'beginner')
- [ ] Star rating (UI only, hardcoded as 0)

### View Profile
- [ ] Report user (ReportModal – placeholder only)
- [ ] Completed Adventures section
- [ ] Personality answers display (spec shows Q&A section)

### Group Detail
- [ ] Chat button to open group conversation directly from group page

### Adventures
- [ ] `CompleteAdventureModal` with review/rating on completion
- [ ] Toast notification after marking adventure complete
- [ ] `AdventureDetailModal` (tap on card opens modal, not implemented)

### Messages / Chat
- [ ] Unread message count badge per conversation
- [ ] "No conversations" empty state CTA

### Premium
- [ ] Actual payment integration (Stripe, RevenueCat, or similar)
- [ ] `UserPremium` Firestore record creation on purchase
- [ ] `isPremium` is hardcoded `false` – no real check

### Settings
- [ ] Preferences not synced to Firestore (only AsyncStorage – lost on reinstall)
- [ ] Push notification preferences not wired to Expo notification permissions
- [ ] Location sharing not implemented beyond toggle

### Notifications (Cloud Functions)
- [ ] Like notification (Cloud Function trigger exists but needs verification)
- [ ] Match notification
- [ ] Message notification
- [ ] Group invite notification

### General / Cross-cutting
- [ ] User verification flow (badge exists but no process to get verified)
- [ ] Pagination / infinite scroll (all data loaded at once)
- [ ] Offline support
- [ ] Search for users or groups
- [ ] Report / block user (UI placeholder only)

---

## Summary

| Area | Status |
|------|--------|
| Auth (Google) | ✅ Done |
| Auth (Apple / Phone / Facebook) | ❌ Missing |
| Onboarding | ✅ Done |
| Discover (swipe) | ✅ Done |
| Daily limits | ❌ Missing |
| Matches | ✅ Done |
| Messages list | ✅ Done |
| Chat (text) | ✅ Done |
| Chat (media / voice) | ❌ Missing |
| Group management in chat | ❌ Missing |
| Profile | ✅ Done (partial) |
| Profile answers / completed adventures | ❌ Missing |
| View Profile | ✅ Done |
| Report / block | ❌ Missing |
| Adventures / Groups | ✅ Done |
| Group detail | ✅ Done |
| Settings | ✅ Done (partial) |
| Premium UI | ✅ Done |
| Premium payments | ❌ Missing |
| Push notifications | ⚠️ Partial (Cloud Functions exist) |
| Verification flow | ❌ Missing |
