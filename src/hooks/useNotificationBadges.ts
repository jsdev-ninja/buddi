import { firebaseApi } from "@/services/firebase";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";

const POLL_MS = 90 * 1000; // 90 seconds

function getConversationId(userId1: string, userId2: string): string {
	return [userId1, userId2].sort().join("_");
}

/**
 * Returns badge counts for Messages and Matches tabs.
 * - messagesBadge: number of conversations (in-app "activity" indicator).
 * - matchesBadge: number of matches that don't have a conversation yet ("new" matches).
 * Polls every 90s so the tab bar updates.
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

		const fetch = async () => {
			try {
				const [convs, userMatches] = await Promise.all([
					firebaseApi.chat.getConversations(user.uid),
					firebaseApi.matches.getUserMatches(user.uid),
				]);
				const convIds = new Set(convs.map((c) => c.id));
				const newMatches = userMatches.filter((m) => {
					const cid = getConversationId(user.uid, m.userId);
					return !convIds.has(cid);
				});
				setMessagesBadge(convs.length);
				setMatchesBadge(newMatches.length);
			} catch (e) {
				// ignore
			}
		};

		fetch();
		const interval = setInterval(fetch, POLL_MS);
		return () => clearInterval(interval);
	}, [user?.uid]);

	return { messagesBadge, matchesBadge };
}
