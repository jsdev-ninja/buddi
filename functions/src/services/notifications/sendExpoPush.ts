import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;
const DEFAULT_ANDROID_CHANNEL_ID = "buddi-default";

export interface ExpoPushMessage {
	to: string;
	title?: string;
	body?: string;
	data?: Record<string, unknown>;
	sound?: "default" | null;
	channelId?: string;
	priority?: "default" | "normal" | "high";
}

/**
 * Fetch Expo push tokens for the given user IDs from userPushTokens collection.
 */
async function getTokensForUsers(userIds: string[]): Promise<string[]> {
	const db = getFirestore();
	const tokens: string[] = [];
	for (const userId of userIds) {
		const doc = await db.collection("userPushTokens").doc(userId).get();
		if (doc.exists) {
			const data = doc.data();
			const userTokens = (data?.tokens as string[] | undefined) ?? [];
			for (const t of userTokens) {
				if (t && typeof t === "string" && t.startsWith("ExponentPushToken[")) {
					tokens.push(t);
				}
			}
		}
	}
	return tokens;
}

/**
 * Send push notifications via Expo Push API. Batches messages (max 100 per request).
 */
async function sendToExpo(messages: ExpoPushMessage[]): Promise<void> {
	for (let i = 0; i < messages.length; i += BATCH_SIZE) {
		const batch = messages.slice(i, i + BATCH_SIZE);
		let lastError: Error | null = null;
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				const res = await fetch(EXPO_PUSH_URL, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(batch),
				});
				if (!res.ok) {
					const text = await res.text();
					throw new Error(`Expo push failed: ${res.status} ${text}`);
				}
				const result = (await res.json()) as { data?: { status: string; message?: string }[] };
				if (result.data) {
					for (let j = 0; j < result.data.length; j++) {
						const d = result.data[j];
						if (d?.status === "error" && d?.message) {
							logger.warn("Expo push item error", { index: j, message: d.message });
						}
					}
				}
				lastError = null;
				break;
			} catch (err) {
				lastError = err instanceof Error ? err : new Error(String(err));
				logger.warn("Expo push attempt failed", { attempt: attempt + 1, error: lastError.message });
				if (attempt < 2) {
					await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
				}
			}
		}
		if (lastError) {
			throw lastError;
		}
	}
}

/**
 * Send a notification to one or more users. Looks up Expo push tokens from userPushTokens.
 */
export async function sendPushToUsers(
	userIds: string[],
	title: string,
	body: string,
	data: Record<string, unknown>
): Promise<void> {
	if (userIds.length === 0) return;
	const tokens = await getTokensForUsers([...new Set(userIds)]);
	if (tokens.length === 0) {
		logger.info("No push tokens found for users", { userIds });
		return;
	}
	const messages: ExpoPushMessage[] = tokens.map((to) => ({
		to,
		title,
		body,
		data,
		sound: "default",
		// Ensure Android displays notifications with correct importance.
		channelId: DEFAULT_ANDROID_CHANNEL_ID,
		priority: "high",
	}));
	await sendToExpo(messages);
}
