"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { useChatStore, useCurrentChat, useIsStreaming } from "@/lib/stores/chat-store";
import { useChatService } from "@/lib/services/chat-service";
import type { Id } from "../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

// AI Components
import { AIInput, AIInputTextarea, AIInputToolbar, AIInputSubmit } from "@/components/ui/kibo-ui/ai/input";
import { AIMessage, AIMessageContent, AIMessageAvatar } from "@/components/ui/kibo-ui/ai/message";
import { AIResponse } from "@/components/ui/kibo-ui/ai/response";

// UI Components
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusIcon, SendIcon } from "lucide-react";

interface ChatInterfaceProps {
    chatId?: Id<"chats">;
}

export function ChatInterface({ chatId }: ChatInterfaceProps): React.JSX.Element {
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Store hooks
    const { setCurrentChatId, setChats } = useChatStore();
    const currentChat = useCurrentChat();
    const isStreaming = useIsStreaming();

    // Service hooks
    const { sendMessage, createChat } = useChatService();

    // Clerk user hook
    const { user: clerkUser } = useUser();

    // Convex queries
    const currentUser = useQuery(api.user.current, {});
    const userChats = useQuery(api.chats.getUserChats, currentUser && currentUser._id ? { userId: currentUser._id } : "skip");

    const router = useRouter();

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

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!message.trim() || isSubmitting || !currentUser?._id) return;

        setIsSubmitting(true);
        try {
            const newChatId = await sendMessage(message.trim(), chatId, currentUser._id);
            setMessage("");

            // If we are on the root path (starting a brand-new chat), redirect to the new chat route
            if (!chatId && newChatId) {
                router.push(`/chat/${newChatId}`);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNewChat = async () => {
        if (!currentUser?._id) return;

        try {
            const newChatId = await createChat({
                userId: currentUser._id,
                title: "New Chat",
            });

            if (newChatId) {
                setCurrentChatId(newChatId);
            }
        } catch (error) {
            console.error("Failed to create new chat:", error);
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
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-lg font-semibold">{currentChat?.title ?? "Chat"}</h2>
                <Button onClick={() => void handleNewChat()} variant="outline" size="sm" className="gap-2">
                    <PlusIcon className="h-4 w-4" />
                    New Chat
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4">
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
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-4">
                <AIInput onSubmit={handleSubmit}>
                    <AIInputTextarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here..."
                        disabled={isSubmitting || isStreaming}
                        minHeight={48}
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
    );
}
