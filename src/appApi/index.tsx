import { useAuth } from "@/context/AuthProvider";
import { router } from "expo-router";

export function useAppApi() {


    const auth = useAuth();


    const authApi = {
        signIn: async () => {
            const { isNewUser } = await auth.signIn();

            if (isNewUser) {
                router.push("/onboarding");
            } else {
                router.push("/profile");
            }
        }
    }


    const api = {
        auth: authApi,
    }


    return api
}
