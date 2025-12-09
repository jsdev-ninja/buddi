import * as SecureStore from 'expo-secure-store';
import { atom } from 'jotai';

// User type definition
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Storage helper functions using expo-secure-store
export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

// User atom - storage sync is handled in AuthProvider
export const userAtom = atom<User | null>(null);

// Loading state atom
export const authLoadingAtom = atom<boolean>(true);
