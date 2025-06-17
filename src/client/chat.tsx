"use client";

import SidebarWrapper from "@/components/sidebar/sidebar-wrapper";
import { ChatInterface } from "@/components/chat/chat-interface";
import type { Id } from "../../convex/_generated/dataModel";
import { Authenticated } from "convex/react";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useChatService } from "@/lib/services/chat-service";
import { useSyncContext } from "@/app/context/sync-context";
import { getQueryParam } from "@/lib/utils";

export default function Chat() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { getCurrentChat, selectedModel } = useChatStore();
    const { sendMessage } = useChatService();
    const { currentUser } = useSyncContext();

    // Handle query parameter for existing chat
    useEffect(() => {
        const qParam = getQueryParam(searchParams, "q");
        if (qParam && id && currentUser?._id) {
            const currentChat = getCurrentChat();

            // Only auto-send if this is an existing chat with no messages
            if (currentChat && currentChat.messages.length === 0) {
                const handleAutoSubmit = async (): Promise<void> => {
                    try {
                        await sendMessage(qParam.trim(), selectedModel, id as Id<"chats">, currentUser._id);
                        // Remove the query parameter from URL after sending
                        void navigate(`/chat/${id}`, { replace: true });
                    } catch (error) {
                        console.error("Failed to send message from URL parameter:", error);
                    }
                };

                void handleAutoSubmit();
            } else if (currentChat && currentChat.messages.length > 0) {
                // If chat already has messages, just remove the query parameter
                void navigate(`/chat/${id}`, { replace: true });
            }
        }
    }, [searchParams, id, currentUser, selectedModel, sendMessage, navigate, getCurrentChat]);

    return (
        <Authenticated>
            <ErrorBoundary>
                <SidebarWrapper>
                    <ChatInterface chatId={id as unknown as Id<"chats">} />
                </SidebarWrapper>
            </ErrorBoundary>
        </Authenticated>
    );
}
