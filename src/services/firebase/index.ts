// Import the functions you need from the SDKs you need
import type { Group } from "@/entities/group";
import type { Profile, ProfileInput } from "@/entities/profile";
import { getDisplayName } from "@/lib/profile";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
	arrayUnion,
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	getFirestore,
	increment,
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
export const db = getFirestore(app);

// Initialize Firebase Storage
export const firebaseStorage = getStorage(app);

// Initialize Auth with React Native persistence
// Check if auth is already initialized to avoid "already-initialized" error
export let auth: any;
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

type GoogleSigninModule = {
	configure: (config: { webClientId: string; iosClientId?: string }) => void;
	hasPlayServices: (options?: { showPlayServicesUpdateDialog?: boolean }) => Promise<void>;
	signIn: () => Promise<unknown>;
	getTokens: () => Promise<{ idToken?: string | null }>;
	signOut: () => Promise<void>;
};

let googleSignin: GoogleSigninModule | null = null;
let googleSigninConfigured = false;

const getGoogleSignin = (): GoogleSigninModule => {
	if (googleSignin) {
		return googleSignin;
	}
	try {
		// Lazy-load native module so Expo Go can still boot the app.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require("@react-native-google-signin/google-signin");
		googleSignin = mod.GoogleSignin as GoogleSigninModule;
		return googleSignin;
	} catch {
		throw new Error(
			"Google Sign-In native module is not available in this app build. Use a development/production build (not Expo Go)."
		);
	}
};

const ensureGoogleSigninConfigured = () => {
	if (googleSigninConfigured) {
		return;
	}
	const GoogleSignin = getGoogleSignin();
	GoogleSignin.configure({
		webClientId: GOOGLE_WEB_CLIENT_ID, // From Firebase Console (Web client ID)
		iosClientId: GOOGLE_IOS_CLIENT_ID, // From GoogleService-Info.plist (iOS client ID)
		// Android client ID will be read from google-services.json if available
	});
	googleSigninConfigured = true;
};

/**
 * Returns a Firestore-safe copy of the value: no undefined anywhere.
 * - Primitives and null are returned as-is.
 * - Arrays: undefined elements removed, each element cleaned recursively.
 * - Objects: keys with undefined value removed, nested values cleaned recursively.
 * Does not mutate the input. Use before setDoc/updateDoc when payload may contain undefined.
 */
export function cleanForFirestore<T>(value: T): T {
	if (value === null || value === undefined) {
		return value;
	}
	if (typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value
			.filter((item) => item !== undefined)
			.map((item) => cleanForFirestore(item)) as T;
	}
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(value as object)) {
		const v = (value as Record<string, unknown>)[key];
		if (v === undefined) continue;
		out[key] = cleanForFirestore(v);
	}
	return out as T;
}

/** @deprecated Use cleanForFirestore for new code. Mutates obj and removes undefined. */
const cleanObject = (obj: any) => {
	if (typeof obj !== "object" || obj === null) return obj;
	if (Array.isArray(obj)) {
		for (let i = obj.length - 1; i >= 0; i--) {
			if (obj[i] === undefined) obj.splice(i, 1);
			else obj[i] = cleanObject(obj[i]);
		}
		return obj;
	}
	for (const key in obj) {
		if (obj[key] === undefined) delete obj[key];
		else if (typeof obj[key] === "object" && obj[key] !== null) obj[key] = cleanObject(obj[key]);
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
				ensureGoogleSigninConfigured();
				const GoogleSignin = getGoogleSignin();

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
			try {
				const GoogleSignin = getGoogleSignin();
				await GoogleSignin.signOut();
			} catch {
				// Ignore when native module isn't available (e.g. Expo Go).
			}
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

				// Create group chat conversation so it appears in Messages and all participants can talk
				const creatorId = auth.currentUser!.uid;
				const initialParticipantIds = Array.isArray(firestoreData.participants) ? firestoreData.participants : [];
				const conversationParticipants = [...new Set([creatorId, ...initialParticipantIds])];
				const conversationId = `group_${docRef.id}`;
				const unreadCount: Record<string, number> = {};
				conversationParticipants.forEach((pId) => {
					unreadCount[pId] = 0;
				});
				await setDoc(doc(db, "conversations", conversationId), {
					participants: conversationParticipants,
					isGroup: true,
					groupId: docRef.id,
					groupName: firestoreData.groupName || "Unnamed Group",
					unreadCount,
					createdAt: now,
					updatedAt: now,
					lastMessage: null,
					lastMessageAt: null,
				});

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

					// Exclude completed, user's own groups, and excluded groups
					if (
						group.status !== "completed" &&
						group.userId !== excludeUserId &&
						!excludeGroupIds.includes(group.id)
					) {
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
		getGroup: async (groupId: string): Promise<Group | null> => {
			try {
				const docRef = doc(db, "groups", groupId);
				const snapshot = await getDoc(docRef);
				if (!snapshot.exists()) return null;
				return { id: snapshot.id, ...snapshot.data() } as Group;
			} catch (error) {
				console.error("Error fetching group:", error);
				throw error;
			}
		},
		update: async (
			groupId: string,
			updates: Partial<Omit<Group, "id" | "userId" | "createdAt">> & {
				startDate?: string | number;
				endDate?: string | number;
			}
		): Promise<void> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to update a group");
				}
				const docRef = doc(db, "groups", groupId);
				const snapshot = await getDoc(docRef);
				if (!snapshot.exists()) throw new Error("Group not found");
				const data = snapshot.data();
				if (data?.userId !== auth.currentUser.uid) {
					throw new Error("Only the group creator can update the group");
				}
				const now = Date.now();
				const firestoreData: Record<string, unknown> = { ...updates, updatedAt: now };
				if (firestoreData.startDate !== undefined) {
					firestoreData.startDate =
						typeof firestoreData.startDate === "string"
							? new Date(firestoreData.startDate as string).getTime()
							: firestoreData.startDate;
				}
				if (firestoreData.endDate !== undefined) {
					firestoreData.endDate =
						typeof firestoreData.endDate === "string"
							? new Date(firestoreData.endDate as string).getTime()
							: firestoreData.endDate;
				}
				const cleaned = cleanForFirestore(firestoreData) as Record<string, unknown>;
				await updateDoc(docRef, cleaned);
			} catch (error) {
				console.error("Error updating group:", error);
				throw error;
			}
		},
		markCompleted: async (groupId: string): Promise<void> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to mark a group as completed");
				}
				const docRef = doc(db, "groups", groupId);
				const snapshot = await getDoc(docRef);
				if (!snapshot.exists()) throw new Error("Group not found");
				const data = snapshot.data();
				if (data?.userId !== auth.currentUser.uid) {
					throw new Error("Only the group creator can mark the group as completed");
				}
				const now = Date.now();
				await updateDoc(docRef, { status: "completed", completedAt: now, updatedAt: now });
			} catch (error) {
				console.error("Error marking group completed:", error);
				throw error;
			}
		},
		addParticipant: async (groupId: string, userId: string): Promise<void> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to add a participant");
				}
				const docRef = doc(db, "groups", groupId);
				const snapshot = await getDoc(docRef);
				if (!snapshot.exists()) throw new Error("Group not found");
				const data = snapshot.data();
				if (data?.userId !== auth.currentUser.uid) {
					throw new Error("Only the group creator can add participants");
				}
				const participants: string[] = Array.isArray(data?.participants) ? [...data.participants] : [];
				if (participants.includes(userId)) return;
				participants.push(userId);
				const maxMembers = (data?.maxMembers as number) || 10;
				if (participants.length + 1 > maxMembers) {
					throw new Error("Group has reached maximum members");
				}
				await updateDoc(docRef, { participants, updatedAt: Date.now() });

				// Add user to group chat conversation so they see the chat and can message
				const conversationRef = doc(db, "conversations", `group_${groupId}`);
				const convSnap = await getDoc(conversationRef);
				if (convSnap.exists()) {
					await updateDoc(conversationRef, {
						participants: arrayUnion(userId),
						[`unreadCount.${userId}`]: 0,
						updatedAt: Date.now(),
					});
				}
			} catch (error) {
				console.error("Error adding participant:", error);
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
				if (auth.currentUser.uid !== userId) {
					throw new Error("Cannot upload photos for another user");
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
		uploadChatMedia: async (uri: string, conversationId: string, type: "image" | "audio"): Promise<string> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to upload media");
				}
				const response = await fetch(uri);
				const blob = await response.blob();
				const ext = type === "image" ? "jpg" : "m4a";
				const filename = `chat/${conversationId}/${type}_${Date.now()}.${ext}`;
				const storageRef = ref(firebaseStorage, filename);
				await uploadBytes(storageRef, blob);
				return await getDownloadURL(storageRef);
			} catch (error) {
				console.error("Error uploading chat media:", error);
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
		// Get user IDs who liked a group (for group creator to see and add to group)
		getGroupLikes: async (groupId: string): Promise<{ userId: string; createdAt: number }[]> => {
			try {
				const q = query(
					collection(db, "groupLikes"),
					where("groupId", "==", groupId)
				);
				const snapshot = await getDocs(q);
				return snapshot.docs.map((d) => ({
					userId: d.data().userId,
					createdAt: d.data().createdAt || 0,
				}));
			} catch (error) {
				console.error("Error fetching group likes:", error);
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
		// Unmatch: remove match between current user and other user
		unmatch: async (otherUserId: string): Promise<void> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to unmatch");
				}
				const userId = auth.currentUser.uid;
				const matchId = userId < otherUserId ? `${userId}_${otherUserId}` : `${otherUserId}_${userId}`;
				const matchRef = doc(db, "matches", matchId);
				const snapshot = await getDoc(matchRef);
				if (snapshot.exists()) {
					await deleteDoc(matchRef);
				}
			} catch (error) {
				console.error("Error unmatching:", error);
				throw error;
			}
		},
		// Get match id between two users (if any)
		getMatchId: async (userId: string, otherUserId: string): Promise<string | null> => {
			const matchId = userId < otherUserId ? `${userId}_${otherUserId}` : `${otherUserId}_${userId}`;
			const matchRef = doc(db, "matches", matchId);
			const snapshot = await getDoc(matchRef);
			return snapshot.exists() ? matchId : null;
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
					const unreadCount: Record<string, number> = {};
					const roles: Record<string, string> = {};
					allParticipants.forEach((pId) => {
						unreadCount[pId] = 0;
						roles[pId] = pId === userId ? "creator" : "member";
					});
					await setDoc(conversationRef, {
						participants: allParticipants,
						isGroup,
						groupId: groupId || null,
						groupName: groupName || null,
						unreadCount,
						roles,
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
			partnerKind?: "solo" | "couple";
			unreadCount: number;
			roles: Record<string, string>;
			background: string | null;
		}[]> => {
			try {
				const conversationsQuery = query(
					collection(db, "conversations"),
					where("participants", "array-contains", userId),
					orderBy("updatedAt", "desc")
				);

				const snapshot = await getDocs(conversationsQuery);
				const conversations: any[] = [];

				for (const docSnapshot of snapshot.docs) {
					const data = docSnapshot.data();
					const otherParticipantIds = data.participants.filter((id: string) => id !== userId);

					// For group chats, use group name
					// For 1-on-1, fetch the other participant's profile name
					let name = data.groupName || "Unknown";
					let partnerKind: "solo" | "couple" | undefined;
					if (!data.isGroup && otherParticipantIds.length > 0) {
						const otherProfile = await firebaseApi.profiles.getProfile(otherParticipantIds[0]);
						name = getDisplayName(otherProfile);
						partnerKind = otherProfile?.kind ?? "solo";
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
						partnerKind,
						unreadCount: data.unreadCount?.[userId] || 0,
						roles: data.roles || {},
						background: data.background || null,
					});
				}

				return conversations;
			} catch (error) {
				console.error("Error fetching conversations:", error);
				throw error;
			}
		},
		// Subscribe to conversations in real-time
		subscribeToConversations: (
			userId: string,
			callback: (conversations: {
				id: string;
				name: string;
				lastMessage?: string;
				timestamp?: string;
				members?: number;
				isGroup?: boolean;
				participantIds: string[];
				partnerKind?: "solo" | "couple";
				unreadCount: number;
				roles: Record<string, string>;
				background: string | null;
			}[]) => void
		): (() => void) => {
			const conversationsQuery = query(
				collection(db, "conversations"),
				where("participants", "array-contains", userId),
				orderBy("updatedAt", "desc")
			);

			return onSnapshot(conversationsQuery, async (snapshot) => {
				const conversationsList: any[] = [];

				for (const docSnapshot of snapshot.docs) {
					const data = docSnapshot.data();
					const otherParticipantIds = data.participants.filter((id: string) => id !== userId);

					let name = data.groupName || "Unknown";
					let partnerKind: "solo" | "couple" | undefined;
					if (!data.isGroup && otherParticipantIds.length > 0) {
						const otherProfile = await firebaseApi.profiles.getProfile(otherParticipantIds[0]);
						name = getDisplayName(otherProfile);
						partnerKind = otherProfile?.kind ?? "solo";
					}

					const lastMessageAt = data.lastMessageAt;
					const timestamp = lastMessageAt
						? new Date(lastMessageAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
						: undefined;

					conversationsList.push({
						id: docSnapshot.id,
						name,
						lastMessage: data.lastMessage || undefined,
						timestamp,
						members: data.participants.length,
						isGroup: data.isGroup || false,
						participantIds: data.participants,
						partnerKind,
						unreadCount: data.unreadCount?.[userId] || 0,
						roles: data.roles || {},
						background: data.background || null,
					});
				}

				callback(conversationsList);
			});
		},
		// Get a single conversation by ID (e.g. when opening chat for a new match)
		getConversation: async (
			conversationId: string,
			userId: string
		): Promise<{ name: string; participants: string[]; isGroup: boolean; partnerKind?: "solo" | "couple"; roles?: Record<string, string>; background?: string | null } | null> => {
			try {
				const conversationRef = doc(db, "conversations", conversationId);
				const conversationDoc = await getDoc(conversationRef);
				if (!conversationDoc.exists()) return null;
				const data = conversationDoc.data();
				const participants = data.participants || [];
				const isGroup = data.isGroup || false;
				let name = data.groupName || "Unknown";
				let partnerKind: "solo" | "couple" | undefined;
				if (!isGroup) {
					const otherId = participants.find((id: string) => id !== userId);
					if (otherId) {
						const profile = await firebaseApi.profiles.getProfile(otherId);
						name = getDisplayName(profile);
						partnerKind = profile?.kind ?? "solo";
					}
				}
				return { name, participants, isGroup, partnerKind, roles: data.roles || {}, background: data.background || null };
			} catch (error) {
				console.error("Error fetching conversation:", error);
				return null;
			}
		},
		// Clear unread count for a user in a conversation
		clearUnreadCount: async (conversationId: string, userId: string): Promise<void> => {
			try {
				const conversationRef = doc(db, "conversations", conversationId);
				await updateDoc(conversationRef, {
					[`unreadCount.${userId}`]: 0,
				});
			} catch (error) {
				console.error("Error clearing unread count:", error);
			}
		},
		// Send a message
		sendMessage: async (
			conversationId: string,
			text: string,
			extra?: { image?: string; video?: string; audio?: string }
		): Promise<string> => {
			try {
				if (!auth.currentUser) {
					throw new Error("User must be authenticated to send a message");
				}

				const userId = auth.currentUser.uid;
				const messageRef = doc(collection(db, "conversations", conversationId, "messages"));

				const messageData: Record<string, unknown> = {
					userId,
					text,
					createdAt: Date.now(),
				};
				if (extra?.image) messageData.image = extra.image;
				if (extra?.video) messageData.video = extra.video;
				if (extra?.audio) messageData.audio = extra.audio;

				await setDoc(messageRef, messageData);

				// Update conversation's last message, timestamp and increment unread counts
				const conversationRef = doc(db, "conversations", conversationId);
				const convSnap = await getDoc(conversationRef);
				let participants: string[] = [];
				if (convSnap.exists()) {
					participants = convSnap.data().participants || [];
				}

				const preview = extra?.image ? "📷 Photo" : extra?.video ? "🎥 Video" : extra?.audio ? "🎤 Voice message" : text;
				const updateObj: Record<string, any> = {
					lastMessage: preview,
					lastMessageAt: Date.now(),
					updatedAt: Date.now(),
				};

				participants.forEach((pId) => {
					if (pId !== userId) {
						updateObj[`unreadCount.${pId}`] = increment(1);
					}
				});

				await updateDoc(conversationRef, updateObj);

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
			image?: string;
			video?: string;
			audio?: string;
			timestamp: string;
			isSent: boolean;
			createdAt: number;
			userId: string;
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
					image?: string;
					video?: string;
					audio?: string;
					timestamp: string;
					isSent: boolean;
					createdAt: number;
					userId: string;
				}[] = [];

				snapshot.forEach((doc) => {
					const data = doc.data();
					const createdAt = data.createdAt ?? 0;
					messages.push({
						id: doc.id,
						text: data.text ?? "",
						image: data.image ?? undefined,
						video: data.video ?? undefined,
						audio: data.audio ?? undefined,
						timestamp: new Date(createdAt).toLocaleTimeString("en-US", {
							hour: "2-digit",
							minute: "2-digit",
							hour12: false,
						}),
						isSent: data.userId === userId,
						createdAt,
						userId: data.userId ?? "",
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
				image?: string;
				video?: string;
				audio?: string;
				timestamp: string;
				isSent: boolean;
				createdAt: number;
				userId: string;
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
					image?: string;
					video?: string;
					audio?: string;
					timestamp: string;
					isSent: boolean;
					createdAt: number;
					userId: string;
				}[] = [];

				snapshot.forEach((doc) => {
					const data = doc.data();
					const createdAt = data.createdAt ?? 0;
					messages.push({
						id: doc.id,
						text: data.text ?? "",
						image: data.image ?? undefined,
						video: data.video ?? undefined,
						audio: data.audio ?? undefined,
						timestamp: new Date(createdAt).toLocaleTimeString("en-US", {
							hour: "2-digit",
							minute: "2-digit",
							hour12: false,
						}),
						isSent: data.userId === userId,
						createdAt,
						userId: data.userId ?? "",
					});
				});

				callback(messages);
			});
		},
		// Update participant's role in a conversation
		updateParticipantRole: async (conversationId: string, participantId: string, role: "admin" | "member"): Promise<void> => {
			try {
				const conversationRef = doc(db, "conversations", conversationId);
				await updateDoc(conversationRef, {
					[`roles.${participantId}`]: role,
					updatedAt: Date.now(),
				});
			} catch (error) {
				console.error("Error updating participant role:", error);
				throw error;
			}
		},
		// Remove participant from group/conversation
		removeParticipant: async (conversationId: string, participantId: string): Promise<void> => {
			try {
				const conversationRef = doc(db, "conversations", conversationId);
				const convSnap = await getDoc(conversationRef);
				if (!convSnap.exists()) return;
				const convData = convSnap.data();
				const participants = (convData.participants || []).filter((id: string) => id !== participantId);

				await updateDoc(conversationRef, {
					participants,
					[`roles.${participantId}`]: deleteField(),
					[`unreadCount.${participantId}`]: deleteField(),
					updatedAt: Date.now(),
				});

				// Also update the group document
				const groupId = convData.groupId;
				if (groupId) {
					const groupRef = doc(db, "groups", groupId);
					const groupSnap = await getDoc(groupRef);
					if (groupSnap.exists()) {
						const groupData = groupSnap.data();
						const groupParticipants = (groupData.participants || []).filter((id: string) => id !== participantId);
						await updateDoc(groupRef, {
							participants: groupParticipants,
							updatedAt: Date.now(),
						});
					}
				}
			} catch (error) {
				console.error("Error removing participant:", error);
				throw error;
			}
		},
		// Leave group
		leaveGroup: async (conversationId: string, userId: string): Promise<void> => {
			try {
				const conversationRef = doc(db, "conversations", conversationId);
				const convSnap = await getDoc(conversationRef);
				if (!convSnap.exists()) return;
				const convData = convSnap.data();

				const isCreator = convData.roles?.[userId] === "creator" || (convData.groupId && (await getDoc(doc(db, "groups", convData.groupId))).data()?.userId === userId);

				if (isCreator) {
					const groupId = convData.groupId;
					if (groupId) {
						await deleteDoc(doc(db, "groups", groupId));
					}
					await deleteDoc(conversationRef);
				} else {
					const participants = (convData.participants || []).filter((id: string) => id !== userId);
					await updateDoc(conversationRef, {
						participants,
						[`roles.${userId}`]: deleteField(),
						[`unreadCount.${userId}`]: deleteField(),
						updatedAt: Date.now(),
					});

					const groupId = convData.groupId;
					if (groupId) {
						const groupRef = doc(db, "groups", groupId);
						const groupSnap = await getDoc(groupRef);
						if (groupSnap.exists()) {
							const groupData = groupSnap.data();
							const groupParticipants = (groupData.participants || []).filter((id: string) => id !== userId);
							await updateDoc(groupRef, {
								participants: groupParticipants,
								updatedAt: Date.now(),
							});
						}
					}
				}
			} catch (error) {
				console.error("Error leaving group:", error);
				throw error;
			}
		},
		// Update chat background style/theme
		updateChatBackground: async (conversationId: string, background: string): Promise<void> => {
			try {
				const conversationRef = doc(db, "conversations", conversationId);
				await updateDoc(conversationRef, {
					background,
					updatedAt: Date.now(),
				});
			} catch (error) {
				console.error("Error updating chat background:", error);
				throw error;
			}
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
