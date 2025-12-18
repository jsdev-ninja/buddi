import * as logger from "firebase-functions/logger";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { deleteFromAlgolia, syncToAlgolia } from "../services/algolia";
import { extractDocumentData, logSyncOperation, shouldSyncToAlgolia } from "../services/algolia/helpers";

/**
 * Firestore trigger for group documents
 * Syncs groups to Algolia when created or updated
 */
export const onGroupChange = onDocumentWritten(
	"groups/{groupId}",
	async (event) => {
		const { data } = event;
		const groupId = event.params.groupId;

		try {
			// Handle document deletion
			if (!data?.after.exists) {
				logSyncOperation("delete", "group", groupId);
				await deleteFromAlgolia(groupId, "group");
				return;
			}

			// Handle document creation or update
			const { data: groupData } = extractDocumentData(data.after);

			// Check if group should be synced (only public groups)
			if (!shouldSyncToAlgolia(groupData)) {
				logger.info("Group skipped Algolia sync (private group)", { groupId });
				return;
			}

			// Determine operation type
			const operation = !data.before?.exists ? "create" : "update";
			logSyncOperation(operation, "group", groupId);

			// Sync to Algolia
			await syncToAlgolia(groupId, groupData, "group");
		} catch (error) {
			logger.error("Error in onGroupChange trigger", {
				groupId,
				error: error instanceof Error ? error.message : String(error),
			});
			// Don't throw - we don't want to fail the Firestore operation
		}
	}
);
