import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Id } from "../../../convex/_generated/dataModel";
import { DEFAULT_MODEL } from "@/lib/models";

export interface UserPreferences {
    _id?: Id<"userPreferences">;
    userId: Id<"users">;
    defaultModel: string;
    openRouterApiKey?: string;
    userModels: string[];
    _creationTime?: number;
}

interface PreferencesState {
    // State
    preferences: UserPreferences | null;
    isLoading: boolean;

    // Actions
    setPreferences: (preferences: UserPreferences | null) => void;
    setIsLoading: (isLoading: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
    subscribeWithSelector((set) => ({
        // Initial state
        preferences: null,
        isLoading: false,

        // Actions
        setPreferences: (preferences) => set({ preferences }),
        setIsLoading: (isLoading) => set({ isLoading }),
    }))
);

// Empty array constant to avoid creating new references
const EMPTY_ARRAY: string[] = [];

// Selector hooks for better performance
export const useUserPreferences = () => usePreferencesStore((state) => state.preferences);
export const useDefaultModel = () => usePreferencesStore((state) => state.preferences?.defaultModel ?? DEFAULT_MODEL);
export const useUserModels = () => usePreferencesStore((state) => state.preferences?.userModels ?? EMPTY_ARRAY);
export const useHasApiKey = () => usePreferencesStore((state) => Boolean(state.preferences?.openRouterApiKey?.trim()));
export const usePreferencesLoading = () => usePreferencesStore((state) => state.isLoading);
