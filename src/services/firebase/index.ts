// Import the functions you need from the SDKs you need
import type { Group } from "@/entities/group";
import type { Profile, ProfileInput } from "@/entities/profile";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { initializeApp } from "firebase/app";
import {
	getAuth,
	getReactNativePersistence,
	GoogleAuthProvider,
	initializeAuth,
	onAuthStateChanged,
	signInWithCredential,
	signOut,
	User,
} from "firebase/auth";
import {
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	getFirestore,
	onSnapshot,
	orderBy,
	query,
	setDoc,
	updateDoc,
	where,
} from "firebase/firestore";
import {
	deleteObject,
	getDownloadURL,
	getStorage,
	ref,
	uploadBytes,
} from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: "AIzaSyBtjrfdfCALf6OtJEbeOzK4XXJ5BH-4D7E",
	authDomain: "buddia-dev.firebaseapp.com",
	projectId: "buddia-dev",
	storageBucket: "buddia-dev.firebasestorage.app",
	messagingSenderId: "64676977478",
	appId: "1:64676977478:web:2b2582f73c7d6efba3a347",
	measurementId: "G-4KEMTGRFHM",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Storage
const firebaseStorage = getStorage(app);

// Initialize Auth with React Native persistence
// Check if auth is already initialized to avoid "already-initialized" error
let auth;
try {
	auth = initializeAuth(app, {
		persistence: getReactNativePersistence(AsyncStorage),
	});
} catch (error: any) {
	// If auth is already initialized, get the existing instance
	if (error.code === "auth/already-initialized") {
		auth = getAuth(app);
	} else {
		throw error;
	}
}

/**
 * GOOGLE_CLIENT_ID - OAuth 2.0 Client ID for Google Sign-In
 *
 * HOW TO GET IT:
 *
 * Method 1: From Firebase Console (Easiest)
 * 1. Go to https://console.firebase.google.com
 * 2. Select your project (buddia-dev)
 * 3. Go to Authentication > Sign-in method
 * 4. Click on "Google" provider
 * 5. Enable it if not already enabled
 * 6. You'll see "Web client ID" - copy this value
 *    Format: PROJECT_ID-XXXXX.apps.googleusercontent.com
 *
 * Method 2: From Google Cloud Console
 * 1. Go to https://console.cloud.google.com
 * 2. Select your Firebase project
 * 3. Go to APIs & Services > Credentials
 * 4. Look for "OAuth 2.0 Client IDs"
 * 5. Find the one for "Web client" (or create one)
 * 6. Copy the Client ID
 *
 * IMPORTANT:
 * - For iOS: You need the iOS Client ID (different from Web Client ID)
 * - For Android: You need the Android Client ID (different from Web Client ID)
 * - The Web Client ID is used for Firebase authentication
 */
const GOOGLE_WEB_CLIENT_ID =
	"64676977478-1lq4fnf0khpmhls1qcodbotrpa26md8m.apps.googleusercontent.com";
// iOS Client ID from GoogleService-Info.plist
const GOOGLE_IOS_CLIENT_ID =
	"64676977478-isdhiokj3hj0q8p0098q1qnru4dqkau8.apps.googleusercontent.com";

// Configure Google Sign-In
GoogleSignin.configure({
	webClientId: GOOGLE_WEB_CLIENT_ID, // From Firebase Console (Web client ID)
	iosClientId: GOOGLE_IOS_CLIENT_ID, // From GoogleService-Info.plist (iOS client ID)

	// Android client ID will be read from google-services.json if available
});

// recursively remove undefined values from an object
const cleanObject = (obj: any) => {
	if (typeof obj !== "object" || obj === null) {
		return obj;
	}
	for (const key in obj) {
		if (obj[key] === undefined) {
			delete obj[key];
		}
		if (typeof obj[key] === "object") {
			obj[key] = cleanObject(obj[key]);
		}
	}
	return obj;
};

export const firebaseApi = {
	profiles: {
		create: async (profileData: Omit<Profile, "id" | "createdAt" | "updatedAt">) => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to create a profile");
				}

				const now = Date.now();
				const userId = auth.currentUser.uid;

				let firestoreData: any = {
					...profileData,
					type: "profile",
					userId,
				};

				firestoreData = cleanObject(firestoreData);

				firestoreData.createdAt = now;
				firestoreData.updatedAt = now;

				// Use userId as document ID so getProfile(userId) works
				const profileRef = doc(db, "profiles", userId);
				await setDoc(profileRef, firestoreData);

				return {
					...firestoreData,
					id: userId,
					createdAt: now,
					updatedAt: now,
				} as Profile;
			} catch (error) {
				console.error("Error creating profile:", error);
				throw error;
			}
		},
		getProfile: async (userId: string): Promise<Profile | null> => {
			try {
				if (!userId) {
					return null
				}
				const docSnapshot = await getDoc(doc(db, "profiles", userId));
				if (!docSnapshot.exists()) {
					return null;
				}
				const data = docSnapshot.data();
				return {
					id: docSnapshot.id,
					...data,
				} as Profile;

			} catch (error) {
				console.error("Error fetching profile:", error);
				return null;
			}
		},
		update: async (profileId: string, profileData: Partial<ProfileInput>): Promise<Profile> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to update a profile");
				}

				if (!profileId) {
					throw new Error("Profile ID is required to update a profile");
				}

				const now = Date.now();

				// Prepare update data (exclude id, userId, type, createdAt, verified)
				let updateData: any = {
					...profileData,
					updatedAt: now,
				};

				// Clean undefined values
				updateData = cleanObject(updateData);

				// Get the profile document reference
				const profileRef = doc(db, "profiles", profileId);

				// Update the document
				await updateDoc(profileRef, updateData);

				// Fetch and return the updated profile
				const updatedProfile = await firebaseApi.profiles.getProfile(auth.currentUser.uid);
				if (!updatedProfile) {
					throw new Error("Profile not found after update");
				}

				return updatedProfile;
			} catch (error) {
				console.error("Error updating profile:", error);
				throw error;
			}
		},
		getDiscoverProfiles: async (excludeUserId: string): Promise<Profile[]> => {
			try {
				// Query all profiles except the current user's
				// Note: Firestore doesn't support != operator directly, so we'll fetch all and filter
				// For better performance with many profiles, consider using a different approach
				const q = query(
					collection(db, "profiles"),
					where("type", "==", "profile")
				);

				const querySnapshot = await getDocs(q);
				const profiles: Profile[] = [];

				querySnapshot.forEach((doc) => {
					const data = doc.data();
					const profile = {
						id: doc.id,
						...data,
					} as Profile;

					// Exclude current user's profile
					if (profile.userId !== excludeUserId) {
						profiles.push(profile);
					}
				});

				// Sort by createdAt if available (newest first)
				profiles.sort((a, b) => {
					const aTime = a.createdAt || 0;
					const bTime = b.createdAt || 0;
					return bTime - aTime;
				});

				return profiles;
			} catch (error) {
				console.error("Error fetching discover profiles:", error);
				throw error;
			}
		},
	},
	auth: {
		loginWithGoogle: async () => {
			try {
				// Check if Google Play Services are available (Android only)
				await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

				// Sign in with Google
				await GoogleSignin.signIn();

				// Get the ID token after sign-in
				const tokens = await GoogleSignin.getTokens();

				if (!tokens.idToken) {
					throw new Error("Failed to get ID token from Google");
				}

				// Create Firebase credential with the Google ID token
				const credential = GoogleAuthProvider.credential(tokens.idToken);

				// Sign in with Firebase using the credential
				const userCredential = await signInWithCredential(auth, credential);
				console.log("userCredential", userCredential.user);

				// check if signup or signin
				if (userCredential.user.metadata.creationTime) {
					// signup
					console.log("signup");
				} else {
					// signin
					console.log("signin");
				}
				return {
					user: userCredential.user,
					isNewUser: userCredential.user.metadata.creationTime ? true : false,
				};
			} catch (error: any) {
				if (error.code === "SIGN_IN_CANCELLED" || error.code === "10") {
					throw new Error("Google sign-in cancelled by user", { cause: error });
				}
				console.error("Google sign-in error:", error);
				throw error;
			}
		},
		signOut: async () => {
			// Sign out from Firebase
			await signOut(auth);
			// Sign out from Google Sign-In
			await GoogleSignin.signOut();
		},
		getCurrentUser: () => {
			return auth.currentUser;
		},
		onAuthStateChanged: (callback: (user: User | null) => void) => {
			return onAuthStateChanged(auth, (user) => {
				callback(user as User | null);
			});
		},
	},
	groups: {
		create: async (
			groupData: Omit<Group, "id" | "createdAt" | "updatedAt" | "startDate" | "endDate"> & {
				startDate?: string | number;
				endDate?: string | number;
			}
		): Promise<Group> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to create a group");
				}

				const now = Date.now();

				// Convert string dates to JavaScript timestamps if provided
				let firestoreData: any = {
					...groupData,
					userId: auth.currentUser.uid,
				};

				firestoreData = cleanObject(firestoreData);

				// Convert startDate string to timestamp (Date.now()) if provided
				if (firestoreData.startDate) {
					if (typeof firestoreData.startDate === "string") {
						firestoreData.startDate = new Date(firestoreData.startDate).getTime();
					}
					// If it's already a number, keep it as is
				}

				// Convert endDate string to timestamp (Date.now()) if provided
				if (firestoreData.endDate) {
					if (typeof firestoreData.endDate === "string") {
						firestoreData.endDate = new Date(firestoreData.endDate).getTime();
					}
					// If it's already a number, keep it as is
				}

				// Add timestamps using Date.now()
				firestoreData.createdAt = now;
				firestoreData.updatedAt = now;

				console.log("firestoreData", firestoreData);

				// Add document to Firestore
				const docRef = await addDoc(collection(db, "groups"), firestoreData);

				// Return the created group with the document ID
				return {
					...firestoreData,
					id: docRef.id,
					createdAt: now,
					updatedAt: now,
				} as Group;
			} catch (error) {
				console.error("Error creating group:", error);
				throw error;
			}
		},
		getUserGroups: async (userId: string): Promise<Group[]> => {
			try {
				if (!userId) {
					throw new Error("User ID is required to fetch groups");
				}

				// Query groups where userId matches
				// Try with orderBy first, fallback to without if index doesn't exist
				let q;
				try {
					q = query(
						collection(db, "groups"),
						where("userId", "==", userId),
						orderBy("createdAt", "desc")
					);
				} catch (indexError) {
					// If index doesn't exist, query without orderBy
					console.warn("Index not found, querying without orderBy:", indexError);
					q = query(collection(db, "groups"), where("userId", "==", userId));
				}

				const querySnapshot = await getDocs(q);
				const groups: Group[] = [];

				querySnapshot.forEach((doc) => {
					const data = doc.data();
					groups.push({
						id: doc.id,
						...data,
					} as Group);
				});

				// Sort by createdAt if available (client-side fallback)
				groups.sort((a, b) => {
					const aTime = a.createdAt || 0;
					const bTime = b.createdAt || 0;
					return bTime - aTime; // Descending order (newest first)
				});

				return groups;
			} catch (error) {
				console.error("Error fetching user groups:", error);
				throw error;
			}
		},
		// Get discoverable groups (public groups)
		getDiscoverGroups: async (excludeUserId: string, excludeGroupIds: string[] = []): Promise<Group[]> => {
			try {
				const q = query(
					collection(db, "groups"),
					where("privacy", "==", "public")
				);

				const querySnapshot = await getDocs(q);
				const groups: Group[] = [];

				querySnapshot.forEach((doc) => {
					const data = doc.data();
					const group = {
						id: doc.id,
						...data,
					} as Group;

					// Exclude user's own groups and excluded groups
					if (group.userId !== excludeUserId && !excludeGroupIds.includes(group.id)) {
						groups.push(group);
					}
				});

				// Sort by createdAt if available (newest first)
				groups.sort((a, b) => {
					const aTime = a.createdAt || 0;
					const bTime = b.createdAt || 0;
					return bTime - aTime;
				});

				return groups;
			} catch (error) {
				console.error("Error fetching discover groups:", error);
				throw error;
			}
		},
	},
	storage: {
		uploadPhoto: async (uri: string, userId: string, photoIndex: number): Promise<string> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to upload photos");
				}

				// Fetch the image as a blob
				const response = await fetch(uri);
				const blob = await response.blob();

				// Create a unique filename
				const filename = `profiles/${userId}/photo_${photoIndex}_${Date.now()}.jpg`;
				const storageRef = ref(firebaseStorage, filename);

				// Upload the file
				await uploadBytes(storageRef, blob);

				// Get the download URL
				const downloadURL = await getDownloadURL(storageRef);
				return downloadURL;
			} catch (error) {
				console.error("Error uploading photo:", error);
				throw error;
			}
		},
		deletePhoto: async (photoUrl: string): Promise<void> => {
			try {
				// Extract the path from the URL
				// Firebase Storage URLs are in format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
				const url = new URL(photoUrl);
				const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
				if (!pathMatch) {
					throw new Error("Invalid photo URL");
				}
				const decodedPath = decodeURIComponent(pathMatch[1]);
				const storageRef = ref(firebaseStorage, decodedPath);
				await deleteObject(storageRef);
			} catch (error) {
				console.error("Error deleting photo:", error);
				throw error;
			}
		},
	},
	likes: {
		// Like a profile
		likeProfile: async (profileId: string): Promise<void> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to like a profile");
				}

				const userId = String(auth.currentUser.uid);
				const likeDocRef = doc(db, "profileLikes", `${userId}_${profileId}`);

				// Skip if already liked (avoids update permission)
				const existingLike = await getDoc(likeDocRef);
				if (existingLike.exists()) {
					return;
				}

				// Get the profile to get the profile owner's userId
				const profileDoc = await getDoc(doc(db, "profiles", profileId));
				if (!profileDoc.exists()) {
					throw new Error("Profile not found");
				}
				const profileData = profileDoc.data();
				const likedUserId = String((profileData?.userId as string | undefined) ?? profileId);

				const likeData = {
					userId,
					profileId: String(profileId),
					likedUserId,
					createdAt: Date.now(),
					type: "like",
				};
				await setDoc(likeDocRef, likeData);

				// Check for mutual like (match) - check if the liked user has liked this user's profile
				const currentUserProfile = await firebaseApi.profiles.getProfile(userId);
				if (currentUserProfile) {
					const reverseLikeQuery = query(
						collection(db, "profileLikes"),
						where("userId", "==", likedUserId),
						where("profileId", "==", currentUserProfile.id)
					);
					const reverseLikeSnapshot = await getDocs(reverseLikeQuery);

					if (!reverseLikeSnapshot.empty) {
						const matchId = userId < likedUserId ? `${userId}_${likedUserId}` : `${likedUserId}_${userId}`;
						const matchRef = doc(db, "matches", matchId);
						const existingMatch = await getDoc(matchRef);
						if (!existingMatch.exists()) {
							await setDoc(matchRef, {
								user1Id: userId < likedUserId ? userId : likedUserId,
								user2Id: userId < likedUserId ? likedUserId : userId,
								createdAt: Date.now(),
								type: "profile",
							});
						}
					}
				}
			} catch (error) {
				console.error("Error liking profile:", error);
				throw error;
			}
		},
		// Dislike (pass) a profile - hide for 7 days
		dislikeProfile: async (profileId: string): Promise<void> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to dislike a profile");
				}

				const userId = auth.currentUser.uid;
				const hideUntil = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
				const hideDocRef = doc(db, "profileHides", `${userId}_${profileId}`);

				await setDoc(hideDocRef, {
					userId,
					profileId,
					hideUntil,
					createdAt: Date.now(),
				});
			} catch (error) {
				console.error("Error disliking profile:", error);
				throw error;
			}
		},
		// Like a group
		likeGroup: async (groupId: string): Promise<void> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to like a group");
				}

				const userId = auth.currentUser.uid;
				const likeDocRef = doc(db, "groupLikes", `${userId}_${groupId}`);

				await setDoc(likeDocRef, {
					userId,
					groupId,
					createdAt: Date.now(),
					type: "like",
				});
			} catch (error) {
				console.error("Error liking group:", error);
				throw error;
			}
		},
		// Dislike (pass) a group - hide for 7 days
		dislikeGroup: async (groupId: string): Promise<void> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to dislike a group");
				}

				const userId = auth.currentUser.uid;
				const hideUntil = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
				const hideDocRef = doc(db, "groupHides", `${userId}_${groupId}`);

				await setDoc(hideDocRef, {
					userId,
					groupId,
					hideUntil,
					createdAt: Date.now(),
				});
			} catch (error) {
				console.error("Error disliking group:", error);
				throw error;
			}
		},
		// Get user's likes
		getUserLikes: async (userId: string): Promise<{ profiles: string[]; groups: string[] }> => {
			try {
				const profileLikesQuery = query(
					collection(db, "profileLikes"),
					where("userId", "==", userId)
				);
				const groupLikesQuery = query(
					collection(db, "groupLikes"),
					where("userId", "==", userId)
				);

				const [profileLikesSnapshot, groupLikesSnapshot] = await Promise.all([
					getDocs(profileLikesQuery),
					getDocs(groupLikesQuery),
				]);

				const profiles = profileLikesSnapshot.docs.map((doc) => doc.data().profileId);
				const groups = groupLikesSnapshot.docs.map((doc) => doc.data().groupId);

				return { profiles, groups };
			} catch (error) {
				console.error("Error fetching user likes:", error);
				throw error;
			}
		},
		// Get user's hides
		getUserHides: async (userId: string): Promise<{ profiles: string[]; groups: string[] }> => {
			try {
				const now = Date.now();
				const profileHidesQuery = query(
					collection(db, "profileHides"),
					where("userId", "==", userId)
				);
				const groupHidesQuery = query(
					collection(db, "groupHides"),
					where("userId", "==", userId)
				);

				const [profileHidesSnapshot, groupHidesSnapshot] = await Promise.all([
					getDocs(profileHidesQuery),
					getDocs(groupHidesQuery),
				]);

				// Filter out expired hides
				const profiles = profileHidesSnapshot.docs
					.filter((doc) => doc.data().hideUntil > now)
					.map((doc) => doc.data().profileId);
				const groups = groupHidesSnapshot.docs
					.filter((doc) => doc.data().hideUntil > now)
					.map((doc) => doc.data().groupId);

				return { profiles, groups };
			} catch (error) {
				console.error("Error fetching user hides:", error);
				throw error;
			}
		},
	},
	matches: {
		// Get user's matches
		getUserMatches: async (userId: string): Promise<{ matchId: string; userId: string; createdAt: number }[]> => {
			try {
				const matchesQuery1 = query(
					collection(db, "matches"),
					where("user1Id", "==", userId),
					where("type", "==", "profile")
				);
				const matchesQuery2 = query(
					collection(db, "matches"),
					where("user2Id", "==", userId),
					where("type", "==", "profile")
				);

				const [snapshot1, snapshot2] = await Promise.all([
					getDocs(matchesQuery1),
					getDocs(matchesQuery2),
				]);

				const matches: { matchId: string; userId: string; createdAt: number }[] = [];

				snapshot1.forEach((doc) => {
					const data = doc.data();
					matches.push({
						matchId: doc.id,
						userId: data.user2Id,
						createdAt: data.createdAt,
					});
				});

				snapshot2.forEach((doc) => {
					const data = doc.data();
					matches.push({
						matchId: doc.id,
						userId: data.user1Id,
						createdAt: data.createdAt,
					});
				});

				return matches;
			} catch (error) {
				console.error("Error fetching matches:", error);
				throw error;
			}
		},
		// Get profiles that liked the user
		getLikesReceived: async (userId: string): Promise<string[]> => {
			try {
				// Get all likes where the user's profile was liked
				const profile = await firebaseApi.profiles.getProfile(userId);
				if (!profile) {
					return [];
				}

				const likesQuery = query(
					collection(db, "profileLikes"),
					where("profileId", "==", profile.id)
				);

				const snapshot = await getDocs(likesQuery);
				return snapshot.docs.map((doc) => doc.data().userId);
			} catch (error) {
				console.error("Error fetching likes received:", error);
				throw error;
			}
		},
	},
	chat: {
		// Create or get conversation
		createConversation: async (participantIds: string[], isGroup: boolean = false, groupId?: string, groupName?: string): Promise<string> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to create a conversation");
				}

				const userId = auth.currentUser.uid;
				const allParticipants = [...new Set([userId, ...participantIds])].sort();

				// For 1-on-1 chats, use sorted user IDs as conversation ID
				// For group chats, generate a unique ID
				const conversationId = isGroup
					? `group_${groupId || Date.now()}`
					: `${allParticipants[0]}_${allParticipants[1]}`;

				const conversationRef = doc(db, "conversations", conversationId);
				const conversationDoc = await getDoc(conversationRef);

				if (!conversationDoc.exists()) {
					await setDoc(conversationRef, {
						participants: allParticipants,
						isGroup,
						groupId: groupId || null,
						groupName: groupName || null,
						createdAt: Date.now(),
						updatedAt: Date.now(),
						lastMessage: null,
						lastMessageAt: null,
					});
				}

				return conversationId;
			} catch (error) {
				console.error("Error creating conversation:", error);
				throw error;
			}
		},
		// Get user's conversations
		getConversations: async (userId: string): Promise<{
			id: string;
			name: string;
			lastMessage?: string;
			timestamp?: string;
			members?: number;
			isGroup?: boolean;
			participantIds: string[];
		}[]> => {
			try {
				const conversationsQuery = query(
					collection(db, "conversations"),
					where("participants", "array-contains", userId),
					orderBy("updatedAt", "desc")
				);

				const snapshot = await getDocs(conversationsQuery);
				const conversations: {
					id: string;
					name: string;
					lastMessage?: string;
					timestamp?: string;
					members?: number;
					isGroup?: boolean;
					participantIds: string[];
				}[] = [];

				for (const docSnapshot of snapshot.docs) {
					const data = docSnapshot.data();
					const otherParticipantIds = data.participants.filter((id: string) => id !== userId);

					// For group chats, use group name
					// For 1-on-1, fetch the other participant's profile name
					let name = data.groupName || "Unknown";
					if (!data.isGroup && otherParticipantIds.length > 0) {
						const otherProfile = await firebaseApi.profiles.getProfile(otherParticipantIds[0]);
						name = otherProfile?.name || "Unknown";
					}

					const lastMessageAt = data.lastMessageAt;
					const timestamp = lastMessageAt
						? new Date(lastMessageAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
						: undefined;

					conversations.push({
						id: docSnapshot.id,
						name,
						lastMessage: data.lastMessage || undefined,
						timestamp,
						members: data.participants.length,
						isGroup: data.isGroup || false,
						participantIds: data.participants,
					});
				}

				return conversations;
			} catch (error) {
				console.error("Error fetching conversations:", error);
				throw error;
			}
		},
		// Get a single conversation by ID (e.g. when opening chat for a new match)
		getConversation: async (
			conversationId: string,
			userId: string
		): Promise<{ name: string; participants: string[]; isGroup: boolean } | null> => {
			try {
				const conversationRef = doc(db, "conversations", conversationId);
				const conversationDoc = await getDoc(conversationRef);
				if (!conversationDoc.exists()) return null;
				const data = conversationDoc.data();
				const participants = data.participants || [];
				const isGroup = data.isGroup || false;
				let name = data.groupName || "Unknown";
				if (!isGroup) {
					const otherId = participants.find((id: string) => id !== userId);
					if (otherId) {
						const profile = await firebaseApi.profiles.getProfile(otherId);
						name = profile?.name || "Unknown";
					}
				}
				return { name, participants, isGroup };
			} catch (error) {
				console.error("Error fetching conversation:", error);
				return null;
			}
		},
		// Send a message
		sendMessage: async (conversationId: string, text: string): Promise<string> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to send a message");
				}

				const userId = auth.currentUser.uid;
				const messageRef = doc(collection(db, "conversations", conversationId, "messages"));

				const messageData = {
					userId,
					text,
					createdAt: Date.now(),
				};

				await setDoc(messageRef, messageData);

				// Update conversation's last message and timestamp
				const conversationRef = doc(db, "conversations", conversationId);
				await updateDoc(conversationRef, {
					lastMessage: text,
					lastMessageAt: Date.now(),
					updatedAt: Date.now(),
				});

				return messageRef.id;
			} catch (error) {
				console.error("Error sending message:", error);
				throw error;
			}
		},
		// Get messages for a conversation
		getMessages: async (conversationId: string): Promise<{
			id: string;
			text: string;
			timestamp: string;
			isSent: boolean;
		}[]> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to get messages");
				}

				const userId = auth.currentUser.uid;
				const messagesQuery = query(
					collection(db, "conversations", conversationId, "messages"),
					orderBy("createdAt", "asc")
				);

				const snapshot = await getDocs(messagesQuery);
				const messages: {
					id: string;
					text: string;
					timestamp: string;
					isSent: boolean;
				}[] = [];

				snapshot.forEach((doc) => {
					const data = doc.data();
					messages.push({
						id: doc.id,
						text: data.text,
						timestamp: new Date(data.createdAt).toLocaleTimeString("en-US", {
							hour: "2-digit",
							minute: "2-digit",
							hour12: false,
						}),
						isSent: data.userId === userId,
					});
				});

				return messages;
			} catch (error) {
				console.error("Error fetching messages:", error);
				throw error;
			}
		},
		// Subscribe to messages in real-time
		subscribeToMessages: (
			conversationId: string,
			callback: (messages: {
				id: string;
				text: string;
				timestamp: string;
				isSent: boolean;
			}[]) => void
		): (() => void) => {
			if (!auth.currentUser) {
				return () => { };
			}

			const userId = auth.currentUser.uid;
			const messagesQuery = query(
				collection(db, "conversations", conversationId, "messages"),
				orderBy("createdAt", "asc")
			);

			return onSnapshot(messagesQuery, (snapshot) => {
				const messages: {
					id: string;
					text: string;
					timestamp: string;
					isSent: boolean;
				}[] = [];

				snapshot.forEach((doc) => {
					const data = doc.data();
					messages.push({
						id: doc.id,
						text: data.text,
						timestamp: new Date(data.createdAt).toLocaleTimeString("en-US", {
							hour: "2-digit",
							minute: "2-digit",
							hour12: false,
						}),
						isSent: data.userId === userId,
					});
				});

				callback(messages);
			});
		},
	},
	pushTokens: {
		/**
		 * Save or update Expo push token for the current user.
		 * Stores in userPushTokens/{userId} with tokens array (supports multiple devices).
		 */
		saveToken: async (expoPushToken: string): Promise<void> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to save push token");
				}
				const userId = auth.currentUser.uid;
				const tokenDocRef = doc(db, "userPushTokens", userId);
				const snap = await getDoc(tokenDocRef);
				const now = Date.now();
				const existingTokens: string[] = snap.exists() ? (snap.data().tokens ?? []) : [];
				const tokens = existingTokens.includes(expoPushToken)
					? existingTokens
					: [...existingTokens.filter(Boolean), expoPushToken];
				await setDoc(tokenDocRef, { tokens, updatedAt: now }, { merge: true });
			} catch (error) {
				console.error("Error saving push token:", error);
				throw error;
			}
		},
		/**
		 * Remove current device's push token (e.g. when user disables notifications in Settings).
		 */
		removeToken: async (): Promise<void> => {
			try {
				if (!auth.currentUser) return;
				const userId = auth.currentUser.uid;
				const tokenDocRef = doc(db, "userPushTokens", userId);
				const snap = await getDoc(tokenDocRef);
				if (!snap.exists()) return;
				const existingTokens: string[] = snap.data().tokens ?? [];
				// We don't have the current token here; clear all so user stops receiving
				if (existingTokens.length === 0) return;
				await setDoc(tokenDocRef, { tokens: [], updatedAt: Date.now() }, { merge: true });
			} catch (error) {
				console.error("Error removing push token:", error);
			}
		},
	},
};
