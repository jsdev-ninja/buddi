import * as logger from "firebase-functions/logger";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { deleteFromAlgolia, syncToAlgolia } from "../services/algolia";
import { extractDocumentData, logSyncOperation, shouldSyncToAlgolia } from "../services/algolia/helpers";

/**
 * Firestore trigger for profile documents
 * Syncs profiles to Algolia when created or updated
 */
export const onProfileChange = onDocumentWritten(
	"profiles/{profileId}",
	async (event) => {
		const { data } = event;
		const profileId = event.params.profileId;

		try {
			// Handle document deletion
			if (!data?.after.exists) {
				logSyncOperation("delete", "profile", profileId);
				await deleteFromAlgolia(profileId, "profile");
				return;
			}

			// Handle document creation or update
			const { data: profileData } = extractDocumentData(data.after);

			// Check if profile should be synced (all profiles are synced)
			if (!shouldSyncToAlgolia(profileData)) {
				logger.info("Profile skipped Algolia sync (privacy check)", { profileId });
				return;
			}

			// Determine operation type
			const operation = !data.before?.exists ? "create" : "update";
			logSyncOperation(operation, "profile", profileId);

			// Sync to Algolia
			await syncToAlgolia(profileId, profileData, "profile");
		} catch (error) {
			logger.error("Error in onProfileChange trigger", {
				profileId,
				error: error instanceof Error ? error.message : String(error),
			});
			// Don't throw - we don't want to fail the Firestore operation
		}
	}
);
