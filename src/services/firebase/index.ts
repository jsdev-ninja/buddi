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
	getDocs,
	getFirestore,
	orderBy,
	query,
	updateDoc,
	where
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

				let firestoreData: any = {
					...profileData,
					userId: auth.currentUser.uid,
				};

				firestoreData = cleanObject(firestoreData);

				firestoreData.createdAt = now;
				firestoreData.updatedAt = now;

				const docRef = await addDoc(collection(db, "profiles"), firestoreData);

				return {
					...firestoreData,
					id: docRef.id,
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
					throw new Error("User ID is required to fetch a profile");
				}

				// Query profile where userId matches (profiles use auto-generated IDs, not userId as doc ID)
				const q = query(
					collection(db, "profiles"),
					where("userId", "==", userId)
				);

				const querySnapshot = await getDocs(q);

				if (querySnapshot.empty) {
					return null;
				}

				// Get the first matching profile (should only be one per user)
				const docSnapshot = querySnapshot.docs[0];
				const data = docSnapshot.data();

				return {
					id: docSnapshot.id,
					...data,
				} as Profile;
			} catch (error) {
				console.error("Error fetching profile:", error);
				throw error;
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
					throw new Error("Google sign-in cancelled by user");
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
};
