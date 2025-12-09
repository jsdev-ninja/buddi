// Import the functions you need from the SDKs you need
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { initializeApp } from "firebase/app";
import {
	getAuth,
	getReactNativePersistence,
	GoogleAuthProvider,
	initializeAuth,
	onAuthStateChanged,
	signInWithCredential,
	signOut,
	type User as FirebaseUser,
} from "firebase/auth";

// Complete auth session for expo-auth-session
WebBrowser.maybeCompleteAuthSession();

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

// Initialize Auth with React Native persistence
// Check if auth is already initialized to avoid "already-initialized" error
let auth;
try {
	auth = initializeAuth(app, {
		persistence: getReactNativePersistence(ReactNativeAsyncStorage),
	});
} catch (error: any) {
	// If auth is already initialized, get the existing instance
	if (error.code === "auth/already-initialized") {
		auth = getAuth(app);
	} else {
		throw error;
	}
}

const convertFirebaseUser = (user: FirebaseUser | null) => {
	if (!user) return null;
	return {
		uid: user.uid,
		email: user.email,
		displayName: user.displayName,
		photoURL: user.photoURL,
	};
};

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
 * - This is NOT the same as your Firebase API key
 * - It's a Google OAuth client ID that allows your app to authenticate with Google
 * - You need to add the redirect URI to your OAuth client in Google Cloud Console:
 *   - For development: https://auth.expo.io/@your-username/buddia
 *   - For production: buddi:// (your app scheme)
 *
 * SET IT AS ENVIRONMENT VARIABLE:
 * Create a .env file in your project root:
 *   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
 */
const GOOGLE_CLIENT_ID = "64676977478-1lq4fnf0khpmhls1qcodbotrpa26md8m.apps.googleusercontent.com";

export const firebaseApi = {
	auth: {
		loginWithGoogle: async () => {
			// Step 1: Use expo-auth-session to get Google ID token

			let redirectUri = AuthSession.makeRedirectUri({});
			console.log("🔗 Redirect URI:", redirectUri);

			// Log the redirect URI so you can add it to Google Cloud Console
			console.log("🔗 Redirect URI:", redirectUri);
			console.log(
				"📋 Add this exact URI to Google Cloud Console > OAuth 2.0 Client > Authorized redirect URIs"
			);

			// Use authorization code flow (more compatible with Google OAuth)
			// Google doesn't support PKCE with ID token response type
			const request = new AuthSession.AuthRequest({
				clientId: GOOGLE_CLIENT_ID,
				scopes: ["openid", "profile", "email"],
				responseType: AuthSession.ResponseType.Code, // Use code flow instead of id_token
				redirectUri,
				usePKCE: true, // PKCE is required for authorization code flow
			});

			const result = await request.promptAsync({
				authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
			});

			if (result.type === "success" && result.params.code) {
				// Step 2: Exchange authorization code for ID token
				// We need to use the code verifier from the request for PKCE
				const tokenResponse = await AuthSession.exchangeCodeAsync(
					{
						clientId: GOOGLE_CLIENT_ID,
						code: result.params.code,
						redirectUri,
						extraParams: {},
						codeVerifier: request.codeVerifier, // Required for PKCE
					},
					{
						tokenEndpoint: "https://oauth2.googleapis.com/token",
					}
				);

				// Step 3: Build Firebase credential with the Google ID token
				const idToken = tokenResponse.idToken;
				if (!idToken) {
					throw new Error("Failed to get ID token from Google");
				}
				const credential = GoogleAuthProvider.credential(idToken);

				// Step 3: Sign in with credential from the Google user
				try {
					const userCredential = await signInWithCredential(auth, credential);
					return convertFirebaseUser(userCredential.user);
				} catch (error: any) {
					// Handle Errors here
					const errorCode = error.code;
					const errorMessage = error.message;
					console.error("Firebase sign-in error:", errorCode, errorMessage);
					throw error;
				}
			}

			// User cancelled or sign-in failed
			if (result.type === "cancel") {
				throw new Error("Google sign-in cancelled by user");
			}

			throw new Error("Google sign-in failed");
		},
		signOut: async () => {
			await signOut(auth);
		},
		getCurrentUser: () => {
			return convertFirebaseUser(auth.currentUser);
		},
		onAuthStateChanged: (callback: (user: ReturnType<typeof convertFirebaseUser>) => void) => {
			return onAuthStateChanged(auth, (user) => {
				callback(convertFirebaseUser(user));
			});
		},
	},
};
