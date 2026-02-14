/**
 * Firebase Cloud Functions
 *
 * This file exports all Cloud Functions for the application.
 * Functions are organized by feature/trigger type.
 */

import { initializeApp } from "firebase-admin/app";

// Initialize the default Firebase Admin app so getFirestore(), getAuth(), etc. work in triggers.
initializeApp();

// Firestore triggers for Algolia sync
export { onGroupChange } from "./triggers/groups";
export { onProfileChange } from "./triggers/profiles";

// Firestore triggers for push notifications
export {
	onProfileLikeCreated,
	onGroupLikeCreated,
	onMatchCreated,
	onMessageCreated,
} from "./triggers/notifications";

