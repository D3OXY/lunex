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
import { AIInput, AIInputSubmit, AIInputTextarea, AIInputToolbar } from "@/components/ui/kibo-ui/ai/input";
import { AIMessage, AIMessageAvatar, AIMessageContent } from "@/components/ui/kibo-ui/ai/message";
import { AIResponse } from "@/components/ui/kibo-ui/ai/response";

// UI Components
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendIcon } from "lucide-react";

interface ChatInterfaceProps {
    chatId?: Id<"chats">;
}

export function ChatInterface({ chatId }: ChatInterfaceProps): React.JSX.Element {
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inputKey, setInputKey] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Store hooks
    const { setCurrentChatId, setChats } = useChatStore();
    const currentChat = useCurrentChat();
    const isStreaming = useIsStreaming();

    // Service hooks
    const { sendMessage } = useChatService();

    // Clerk user hook
    const { user: clerkUser } = useUser();

    // Convex queries
    const currentUser = useQuery(api.user.current, {});
    const userChats = useQuery(api.chats.getUserChats, currentUser && currentUser._id ? { userId: currentUser._id } : "skip");

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
            setChats(userChats);
        }
    }, [userChats, setChats]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [currentChat?.messages, isStreaming]);

    // Auto-focus input when user starts typing
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't interfere if user is already typing in an input/textarea or if modifiers are pressed
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.ctrlKey || e.metaKey || e.altKey || isSubmitting || isStreaming) {
                return;
            }

            // Only handle printable characters (letters, numbers, symbols, space)
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                setMessage((prev) => prev + e.key);
                // Focus the textarea after state update
                setTimeout(() => {
                    textareaRef.current?.focus();
                }, 0);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isSubmitting, isStreaming]);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!message.trim() || isSubmitting || !currentUser?._id) return;

        setIsSubmitting(true);
        setMessage("");
        setInputKey((prev) => prev + 1);
        try {
            const newChatId = await sendMessage(message.trim(), chatId, currentUser._id);

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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            if (e.shiftKey) {
                // Shift+Enter: Allow default behavior (new line)
                return;
            } else {
                // Enter: Submit the message
                e.preventDefault();
                if (message.trim() && !isSubmitting && !isStreaming) {
                    void handleSubmit(e as unknown as React.FormEvent);
                }
            }
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
                                                src={msg.role === "user" ? (clerkUser?.imageUrl ?? "") : "/ai-avatar.png"}
                                                name={msg.role === "user" ? (clerkUser?.fullName ?? "User") : "T3"}
                                            />
                                            <AIMessageContent>
                                                {msg.role === "assistant" ? <AIResponse>{msg.content}</AIResponse> : <div className="text-sm">{msg.content}</div>}
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
                    <AIInput onSubmit={handleSubmit}>
                        <AIInputTextarea
                            ref={textareaRef}
                            key={inputKey}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message here..."
                            disabled={isSubmitting || isStreaming}
                            minHeight={20}
                            maxHeight={200}
                        />
                        <AIInputToolbar>
                            <div className="flex-1" />
                            <AIInputSubmit disabled={!message.trim() || isSubmitting || isStreaming}>
                                <SendIcon className="h-4 w-4" />
                            </AIInputSubmit>
                        </AIInputToolbar>
                    </AIInput>
                </div>
            </div>
        </div>
    );
}
