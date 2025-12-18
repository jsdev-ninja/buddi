import { algoliasearch } from "algoliasearch";
import * as logger from "firebase-functions/logger";

// Algolia configuration
const ALGOLIA_APP_ID = "OW82QSS9SB";
const ALGOLIA_WRITE_API_KEY = "9ee2c558a85f12666e1aa68de98c8213";
const ALGOLIA_INDEX_NAME = "profile-and-groups";

// Initialize Algolia client (v5 API)
const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_API_KEY);

/**
 * Sync a document to Algolia index
 * @param objectID - Unique identifier for the document (usually Firestore document ID)
 * @param data - Document data to sync
 * @param type - Type of document ('profile' or 'group')
 */
export async function syncToAlgolia(
	objectID: string,
	data: Record<string, any>,
	type: "profile" | "group"
): Promise<void> {
	try {
		// Prepare data for Algolia
		const algoliaData: Record<string, any> = {
			objectID,
			type,
			...data,
			// Ensure timestamps are numbers for proper sorting
			createdAt: data.createdAt || null,
			updatedAt: data.updatedAt || null,
		};

		// Remove undefined values
		Object.keys(algoliaData).forEach((key) => {
			if (algoliaData[key] === undefined) {
				delete algoliaData[key];
			}
		});

		await algoliaClient.saveObject({
			indexName: ALGOLIA_INDEX_NAME,
			body: algoliaData,
		});
		logger.info(`Successfully synced ${type} to Algolia`, { objectID, type });
	} catch (error) {
		logger.error(`Error syncing ${type} to Algolia`, {
			objectID,
			type,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * Delete a document from Algolia index
 * @param objectID - Unique identifier for the document
 * @param type - Type of document ('profile' or 'group')
 */
export async function deleteFromAlgolia(
	objectID: string,
	type: "profile" | "group"
): Promise<void> {
	try {
		await algoliaClient.deleteObject({
			indexName: ALGOLIA_INDEX_NAME,
			objectID,
		});
		logger.info(`Successfully deleted ${type} from Algolia`, { objectID, type });
	} catch (error) {
		logger.error(`Error deleting ${type} from Algolia`, {
			objectID,
			type,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

/**
 * Batch sync multiple documents to Algolia
 * @param objects - Array of objects to sync
 */
export async function batchSyncToAlgolia(
	objects: { objectID: string; data: Record<string, any>; type: "profile" | "group" }[]
): Promise<void> {
	try {
		const algoliaObjects: Record<string, any>[] = objects.map(({ objectID, data, type }) => ({
			objectID,
			type,
			...data,
			createdAt: data.createdAt || null,
			updatedAt: data.updatedAt || null,
		}));

		// Remove undefined values from each object
		algoliaObjects.forEach((obj) => {
			Object.keys(obj).forEach((key) => {
				if (obj[key] === undefined) {
					delete obj[key];
				}
			});
		});

		await algoliaClient.saveObjects({
			indexName: ALGOLIA_INDEX_NAME,
			objects: algoliaObjects,
		});
		logger.info(`Successfully batch synced ${algoliaObjects.length} objects to Algolia`);
	} catch (error) {
		logger.error("Error batch syncing to Algolia", {
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}
