import { db, firebaseApi } from "@/services/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";

function getConversationId(userId1: string, userId2: string): string {
	return [userId1, userId2].sort().join("_");
}

/**
 * Returns badge counts for Messages and Matches tabs.
 * - messagesBadge: number of conversations with unread messages.
 * - matchesBadge: number of matches that don't have a conversation yet ("new" matches).
 * Listens to conversations in real-time.
 */
export function useNotificationBadges(): { messagesBadge: number; matchesBadge: number } {
	const { user } = useAuth();
	const [messagesBadge, setMessagesBadge] = useState(0);
	const [matchesBadge, setMatchesBadge] = useState(0);

	useEffect(() => {
		if (!user?.uid) {
			setMessagesBadge(0);
			setMatchesBadge(0);
			return;
		}

		// Subscribe to conversations in real-time
		const q = query(
			collection(db, "conversations"),
			where("participants", "array-contains", user.uid)
		);

		const unsubscribe = onSnapshot(q, async (snapshot) => {
			let unreadCount = 0;
			const convIds = new Set<string>();

			snapshot.docs.forEach((docSnapshot) => {
				const data = docSnapshot.data();
				convIds.add(docSnapshot.id);
				const count = data.unreadCount?.[user.uid] || 0;
				if (count > 0) {
					unreadCount++;
				}
			});

			setMessagesBadge(unreadCount);

			try {
				const userMatches = await firebaseApi.matches.getUserMatches(user.uid);
				const newMatches = userMatches.filter((m) => {
					const cid = getConversationId(user.uid, m.userId);
					return !convIds.has(cid);
				});
				setMatchesBadge(newMatches.length);
			} catch {
				// ignore
			}
		});

		return () => unsubscribe();
	}, [user?.uid]);

	return { messagesBadge, matchesBadge };
}
