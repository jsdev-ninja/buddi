import { firebaseApi } from "@/services/firebase";
import { useEffect, useState } from "react";
import { Profile } from "./profile";


export function useProfile() {

    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const profile = await firebaseApi.profiles.getProfile(firebaseUser.uid);
        }
    }, []);
}