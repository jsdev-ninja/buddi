import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { sendPushToUsers } from "../services/notifications/sendExpoPush";

/**
 * Notify user when someone likes their profile.
 */
export const onProfileLikeCreated = onDocumentCreated(
	"profileLikes/{likeId}",
	async (event) => {
		try {
			const snap = event.data;
			if (!snap?.exists) return;
			const data = snap.data();
			const likedUserId = data?.likedUserId as string | undefined;
			const likerUserId = data?.userId as string | undefined; // liker's profile id (same as userId)
			if (!likedUserId) return;
			await sendPushToUsers(
				[likedUserId],
				"New like",
				"Someone liked your profile",
				{ type: "profile_like", profileId: likerUserId ?? "" }
			);
		} catch (err) {
			logger.error("onProfileLikeCreated", { error: err instanceof Error ? err.message : String(err) });
		}
	}
);

/**
 * Notify group creator when someone likes their group.
 */
export const onGroupLikeCreated = onDocumentCreated(
	"groupLikes/{likeId}",
	async (event) => {
		try {
			const snap = event.data;
			if (!snap?.exists) return;
			const data = snap.data();
			const groupId = data?.groupId as string | undefined;
			if (!groupId) return;
			const groupDoc = await getFirestore().collection("groups").doc(groupId).get();
			if (!groupDoc.exists) return;
			const groupData = groupDoc.data();
			const ownerId = groupData?.userId as string | undefined;
			if (!ownerId) return;
			await sendPushToUsers(
				[ownerId],
				"New like",
				"Someone liked your group",
				{ type: "group_like", groupId }
			);
		} catch (err) {
			logger.error("onGroupLikeCreated", { error: err instanceof Error ? err.message : String(err) });
		}
	}
);

/**
 * Notify both users when they match (mutual like).
 */
export const onMatchCreated = onDocumentCreated(
	"matches/{matchId}",
	async (event) => {
		try {
			const snap = event.data;
			if (!snap?.exists) return;
			const data = snap.data();
			const user1Id = data?.user1Id as string | undefined;
			const user2Id = data?.user2Id as string | undefined;
			const matchId = event.params.matchId;
			if (!user1Id || !user2Id) return;
			await sendPushToUsers(
				[user1Id, user2Id],
				"It's a match!",
				"You have a new match",
				{ type: "match", matchId }
			);
		} catch (err) {
			logger.error("onMatchCreated", { error: err instanceof Error ? err.message : String(err) });
		}
	}
);

/**
 * Notify conversation participants (except sender) when a new message is sent.
 */
export const onMessageCreated = onDocumentCreated(
	"conversations/{conversationId}/messages/{messageId}",
	async (event) => {
		try {
			const snap = event.data;
			if (!snap?.exists) return;
			const data = snap.data();
			const senderId = data?.userId as string | undefined;
			const text = (data?.text as string) ?? "";
			const conversationId = event.params.conversationId;
			const convDoc = await getFirestore()
				.collection("conversations")
				.doc(conversationId)
				.get();
			if (!convDoc.exists) return;
			const participants = (convDoc.data()?.participants as string[] | undefined) ?? [];
			// Only notify other participants; never send push to the sender
			const recipients = participants.filter((id) => id && id !== senderId);
			if (recipients.length === 0) return;
			const preview = text.length > 80 ? text.slice(0, 77) + "..." : text;
			await sendPushToUsers(
				recipients,
				"New message",
				preview,
				{ type: "new_message", conversationId, senderId: senderId ?? "" }
			);
		} catch (err) {
			logger.error("onMessageCreated", { error: err instanceof Error ? err.message : String(err) });
		}
	}
);
