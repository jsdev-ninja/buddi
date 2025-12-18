/**
 * Firebase Cloud Functions
 * 
 * This file exports all Cloud Functions for the application.
 * Functions are organized by feature/trigger type.
 */

// Firestore triggers for Algolia sync
export { onGroupChange } from "./triggers/groups";
export { onProfileChange } from "./triggers/profiles";

