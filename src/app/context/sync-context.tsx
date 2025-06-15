"use client";

import { useChatStore } from "@/lib/stores/chat-store";
import { useUser } from "@clerk/nextjs";
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
    // Clerk user hook
    const { user: clerkUser } = useUser();

    // Convex queries
    const currentUser = useQuery(api.user.current, {});
    const userChats = useQuery(api.chats.getUserChats);

    // Store hooks
    const { mergeChatsFromServer } = useChatStore();

    // Sync chats with server when userChats changes
    useEffect(() => {
        if (userChats && Array.isArray(userChats)) {
            mergeChatsFromServer(userChats);
        }
    }, [userChats, mergeChatsFromServer]);

    const contextValue: SyncContextValue = {
        currentUser,
        isLoading: currentUser === undefined,
    };

    return <SyncContext.Provider value={contextValue}>{children}</SyncContext.Provider>;
}
