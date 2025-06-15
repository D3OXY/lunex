"use client";

import { useSyncContext } from "@/app/context/sync-context";
import { useChatService } from "@/lib/services/chat-service";
import { useChatStore, useCurrentChat, useIsStreaming, useWebSearchEnabled } from "@/lib/stores/chat-store";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// AI Components
import { ReasoningDisplay } from "@/components/reasoning-display";
import { AIBranch, AIBranchMessages, AIBranchNext, AIBranchPage, AIBranchPrevious, AIBranchSelector } from "@/components/ui/kibo-ui/ai/branch";
import { AIMessage, AIMessageAvatar, AIMessageContent } from "@/components/ui/kibo-ui/ai/message";
import { AIResponse } from "@/components/ui/kibo-ui/ai/response";

// UI Components
import { ChatInput } from "@/components/chat/chat-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser } from "@clerk/nextjs";
import { GitBranch, GlobeIcon, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

interface ChatInterfaceProps {
    chatId?: Id<"chats">;
}

export function ChatInterface({ chatId }: ChatInterfaceProps): React.JSX.Element {
    const { query, setQuery, selectedModel } = useChatStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBranchDialog, setShowBranchDialog] = useState(false);
    const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Store hooks
    const { setCurrentChatId } = useChatStore();
    const currentChat = useCurrentChat();
    const isStreaming = useIsStreaming();
    const webSearchEnabled = useWebSearchEnabled();

    // Service hooks
    const { sendMessage } = useChatService();

    // Sync context
    const { currentUser, isLoading } = useSyncContext();

    // Clerk user hook (for avatar and display name)
    const { user: clerkUser } = useUser();

    // Branching functionality
    const branchChat = useMutation(api.chats.branchChat);

    const navigate = useNavigate();

    // Set current chat when chatId changes
    useEffect(() => {
        if (chatId) {
            setCurrentChatId(chatId);
        }
    }, [chatId, setCurrentChatId]);

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
            await sendMessage(
                query.trim(),
                selectedModel,
                chatId,
                currentUser._id,
                // Callback for immediate navigation when creating new chat
                !chatId
                    ? (createdChatId) => {
                          void navigate(`/chat/${createdChatId}`);
                      }
                    : undefined
            );
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBranchFromMessage = (messageIndex: number): void => {
        setSelectedMessageIndex(messageIndex);
        setShowBranchDialog(true);
    };

    const handleCreateBranch = async (): Promise<void> => {
        if (!chatId || selectedMessageIndex === null) return;

        try {
            const branchedChatId = await branchChat({
                chatId,
                messageIndex: selectedMessageIndex,
            });

            toast.success("Branch created successfully");
            setShowBranchDialog(false);
            setSelectedMessageIndex(null);

            // Navigate to the new branch
            void navigate(`/chat/${branchedChatId}`);
        } catch (error) {
            console.error("Failed to create branch:", error);
            toast.error("Failed to create branch");
        }
    };

    const allMessages = currentChat?.messages ?? [];

    if (isLoading || !currentUser) {
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
                                                src={msg.role === "user" ? (clerkUser?.imageUrl ?? "") : ""}
                                                name={msg.role === "user" ? (clerkUser?.fullName ?? "User") : "AI"}
                                            />
                                            <AIMessageContent>
                                                {msg.role === "assistant" && msg.reasoning && (
                                                    <ReasoningDisplay reasoning={msg.reasoning} isStreaming={msg.isStreaming && isStreaming} />
                                                )}
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
                                                {/* Branch button for assistant messages */}
                                                {msg.role === "assistant" && !msg.isStreaming && chatId && (
                                                    <div className="mt-2 flex justify-end">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleBranchFromMessage(index)}>
                                                                    <GitBranch className="mr-2 h-4 w-4" />
                                                                    Branch from here
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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
                {webSearchEnabled && (
                    <div className="border-t px-4 py-2">
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            <GlobeIcon size={14} />
                            <span>Web search enabled - responses will include real-time information</span>
                        </div>
                    </div>
                )}
                <div className="">
                    <ChatInput chatId={chatId ?? null} disabled={isSubmitting || isStreaming} onSubmit={handleSubmit} />
                </div>
            </div>

            {/* Branch confirmation dialog */}
            <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Branch</DialogTitle>
                        <DialogDescription>
                            This will create a new conversation starting from the selected message. You can continue the conversation from that point in a separate branch.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowBranchDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateBranch}>
                            <GitBranch className="mr-2 h-4 w-4" />
                            Create Branch
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
