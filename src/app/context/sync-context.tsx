"use client";

import { useChatStore } from "@/lib/stores/chat-store";
import { usePreferencesStore } from "@/lib/stores/preferences-store";
import { useQuery } from "convex/react";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface SyncContextValue {
    currentUser: { _id: Id<"users"> } | null | undefined;
    isLoading: boolean;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncContext(): SyncContextValue {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error("useSyncContext must be used within a SyncProvider");
    }
    return context;
}

interface SyncProviderProps {
    children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps): React.JSX.Element {
    // Convex queries
    const currentUser = useQuery(api.user.current, {});
    const userChats = useQuery(api.chats.getUserChats);
    const userPreferences = useQuery(api.user_preferences.getUserPreferences);

    // Store hooks
    const { mergeChatsFromServer, setSelectedModel } = useChatStore();
    const { setPreferences, setIsLoading } = usePreferencesStore();

    // Sync chats with server when userChats changes
    // The mergeChatsFromServer function already handles stream priority
    useEffect(() => {
        if (userChats && Array.isArray(userChats)) {
            mergeChatsFromServer(userChats);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userChats]);

    // Sync user preferences with server
    useEffect(() => {
        if (userPreferences !== undefined) {
            setPreferences(userPreferences);
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }
    }, [userPreferences, setPreferences, setIsLoading]);

    // Sync selected model with default model from preferences (separate effect to avoid loops)
    useEffect(() => {
        if (userPreferences?.defaultModel) {
            setSelectedModel(userPreferences.defaultModel);
        }
    }, [userPreferences?.defaultModel, setSelectedModel]);

    const contextValue: SyncContextValue = {
        currentUser,
        isLoading: currentUser === undefined,
    };

    return <SyncContext.Provider value={contextValue}>{children}</SyncContext.Provider>;
}
