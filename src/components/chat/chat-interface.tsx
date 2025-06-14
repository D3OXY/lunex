"use client";

import { useChatService } from "@/lib/services/chat-service";
import { useChatStore, useCurrentChat, useIsStreaming } from "@/lib/stores/chat-store";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// AI Components
import { AIBranch, AIBranchMessages, AIBranchNext, AIBranchPage, AIBranchPrevious, AIBranchSelector } from "@/components/ui/kibo-ui/ai/branch";
import { AIMessage, AIMessageAvatar, AIMessageContent } from "@/components/ui/kibo-ui/ai/message";
import { AIResponse } from "@/components/ui/kibo-ui/ai/response";

// UI Components
import { ChatInput } from "@/components/chat/chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatInterfaceProps {
    chatId?: Id<"chats">;
}

export function ChatInterface({ chatId }: ChatInterfaceProps): React.JSX.Element {
    const { query, setQuery, selectedModel } = useChatStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Store hooks
    const { setCurrentChatId, mergeChatsFromServer } = useChatStore();
    const currentChat = useCurrentChat();
    const isStreaming = useIsStreaming();

    // Service hooks
    const { sendMessage } = useChatService();

    // Clerk user hook
    const { user: clerkUser } = useUser();

    // Convex queries
    const currentUser = useQuery(api.user.current, {});
    const userChats = useQuery(api.chats.getUserChats);

    const navigate = useNavigate();

    // Set current chat when chatId changes
    useEffect(() => {
        if (chatId) {
            setCurrentChatId(chatId);
        }
    }, [chatId, setCurrentChatId]);

    // Update chats in store when userChats changes
    useEffect(() => {
        if (userChats && Array.isArray(userChats)) {
            mergeChatsFromServer(userChats);
        }
    }, [userChats, mergeChatsFromServer]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [currentChat?.messages, isStreaming]);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!query.trim() || isSubmitting || !currentUser?._id) return;

        setIsSubmitting(true);
        setQuery("");
        try {
            const newChatId = await sendMessage(query.trim(), selectedModel, chatId, currentUser._id);

            // If we are on the root path (starting a brand-new chat), redirect to the new chat route
            if (!chatId && newChatId) {
                void navigate(`/chat/${newChatId}`);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const allMessages = currentChat?.messages ?? [];

    if (!currentUser) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full px-4">
                    <AIBranch className="h-full">
                        <AIBranchMessages>
                            <div className="space-y-4 py-4">
                                {allMessages.length === 0 ? (
                                    <div className="text-muted-foreground flex h-32 items-center justify-center">Start a conversation by typing a message below</div>
                                ) : (
                                    allMessages.map((msg, index) => (
                                        <AIMessage key={`${index}-${msg.role}`} from={msg.role}>
                                            <AIMessageAvatar
                                                src={msg.role === "user" ? (clerkUser?.imageUrl ?? "") : "/neo.png"}
                                                name={msg.role === "user" ? (clerkUser?.fullName ?? "User") : "T3"}
                                            />
                                            <AIMessageContent>
                                                {msg.role === "assistant" ? (
                                                    <AIResponse className="tracking-wide">{msg.content}</AIResponse>
                                                ) : (
                                                    <div className="text-base tracking-wide">{msg.content}</div>
                                                )}
                                                {msg.isStreaming && isStreaming && (
                                                    <div className="mt-2 flex items-center gap-1">
                                                        <div className="h-2 w-2 animate-pulse rounded-full bg-current" />
                                                        <span className="text-xs opacity-70">Generating...</span>
                                                    </div>
                                                )}
                                            </AIMessageContent>
                                        </AIMessage>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </AIBranchMessages>

                        {/* Branch Navigation (hidden when only one branch) */}
                        <AIBranchSelector from="assistant" className="py-2">
                            <AIBranchPrevious />
                            <AIBranchPage />
                            <AIBranchNext />
                        </AIBranchSelector>
                    </AIBranch>
                </ScrollArea>
            </div>

            {/* Input & Suggestions - Fixed at bottom */}
            <div className="bg-background flex-shrink-0">
                <div className="">
                    <ChatInput chatId={chatId ?? null} disabled={isSubmitting || isStreaming} onSubmit={handleSubmit} />
                </div>
            </div>
        </div>
    );
}
