import { firebaseApi } from "@/services/firebase";
import { User } from "@firebase/auth";
import { createContext, useContext, useEffect, useReducer } from "react";

const initialState = {
	user: null,
	isLoading: false,
};

const reducer = (state: typeof initialState, action: any) => {
	switch (action.type) {
		case "SET_USER":
			return { ...state, user: action.payload };
		case "SET_LOADING":
			return { ...state, isLoading: action.payload };
	}

	return state;
};

const AuthContext = createContext<{
	user: User | null;
	isLoading: boolean;
	signIn: () => Promise<{ user: User | null; isNewUser: boolean }>;
	signOut: () => Promise<void>;
}>({
	user: null,
	isLoading: false,
	signIn: async () => { return { user: null, isNewUser: false } },
	signOut: async () => { },
});

// Hook to use authentication
export function useAuth() {
	return useContext(AuthContext!);
}



// Main Auth Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {

	const [state, dispatch] = useReducer(reducer, initialState);

	const signIn = async (): Promise<{ user: User | null; isNewUser: boolean }> => {
		try {
			dispatch({ type: "SET_LOADING", payload: true });
			// Use real Firebase Google sign-in
			const { user: firebaseUser, isNewUser } = await firebaseApi.auth.loginWithGoogle();
			console.log("isNewUser", isNewUser);
			dispatch({ type: "SET_USER", payload: firebaseUser });

			return {
				user: firebaseUser ?? null,
				isNewUser,
			}
		} catch (error) {
			console.error("Sign in error:", error);
			return {
				user: null,
				isNewUser: false,
			}
		} finally {
			dispatch({ type: "SET_LOADING", payload: false });

		}
	};

	const signOut = async () => {
		try {
			dispatch({ type: "SET_LOADING", payload: true });
			await firebaseApi.auth.signOut();
			dispatch({ type: "SET_USER", payload: null });
		} catch (error) {
			console.error("Sign out error:", error);
			throw error;
		}
	};


	useEffect(() => {
		firebaseApi.auth.onAuthStateChanged((user) => {
			dispatch({ type: "SET_USER", payload: user });
		});
	}, []);

	return (
		<AuthContext.Provider value={{
			user: state.user,
			isLoading: state.isLoading,
			signIn,
			signOut,
		}}>
			{children}
		</AuthContext.Provider>
	);
}
