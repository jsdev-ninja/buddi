import * as logger from "firebase-functions/logger";
import { DocumentSnapshot } from "firebase-functions/v2/firestore";

/**
 * Extract data from Firestore document snapshot
 * @param snapshot - Firestore document snapshot
 * @returns Document data with ID
 */
export function extractDocumentData(snapshot: DocumentSnapshot): {
	id: string;
	data: Record<string, any>;
} {
	const data = snapshot.data();
	if (!data) {
		throw new Error("Document data is undefined");
	}

	return {
		id: snapshot.id,
		data: {
			...data,
			// Convert Firestore Timestamps to numbers if needed
			createdAt: data.createdAt?.toMillis?.() || data.createdAt || null,
			updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || null,
			startDate: data.startDate?.toMillis?.() || data.startDate || null,
			endDate: data.endDate?.toMillis?.() || data.endDate || null,
		},
	};
}

/**
 * Check if document should be synced to Algolia
 * Only sync public profiles/groups or if privacy field is not set (defaults to public)
 * @param data - Document data
 * @returns boolean indicating if document should be synced
 */
export function shouldSyncToAlgolia(data: Record<string, any>): boolean {
	// For profiles: sync all (profiles don't have privacy field in the schema)
	// For groups: only sync public groups
	if (data.type === "group") {
		return data.privacy === "public" || !data.privacy;
	}
	// Profiles are always synced (they're discoverable)
	return true;
}

/**
 * Log sync operation
 * @param operation - Operation type (create, update, delete)
 * @param type - Document type (profile or group)
 * @param objectID - Document ID
 */
export function logSyncOperation(
	operation: "create" | "update" | "delete",
	type: "profile" | "group",
	objectID: string
): void {
	logger.info(`Algolia sync: ${operation} ${type}`, { objectID, operation, type });
}
