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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUser } from "@clerk/nextjs";
import { Copy, Edit3, GitBranch, GlobeIcon, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ChatInterfaceProps {
    chatId?: Id<"chats">;
}

export function ChatInterface({ chatId }: ChatInterfaceProps): React.JSX.Element {
    const { query, setQuery, selectedModel } = useChatStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBranchDialog, setShowBranchDialog] = useState(false);
    const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
    const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
    const [editedContent, setEditedContent] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Store hooks
    const { setCurrentChatId } = useChatStore();
    const currentChat = useCurrentChat();
    const isStreaming = useIsStreaming();
    const webSearchEnabled = useWebSearchEnabled();

    // Service hooks
    const { sendMessage, regenerateMessage } = useChatService();

    // Sync context
    const { currentUser, isLoading } = useSyncContext();

    // Clerk user hook (for avatar and display name)
    const { user: clerkUser } = useUser();

    // Branching functionality
    const branchChat = useMutation(api.chats.branchChat);
    const editMessage = useMutation(api.chats.editMessage);
    const regenerateResponse = useMutation(api.chats.regenerateResponse);

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

    const handleCopyResponse = async (content: string): Promise<void> => {
        try {
            await navigator.clipboard.writeText(content);
            toast.success("Response copied to clipboard");
        } catch (error) {
            console.error("Failed to copy to clipboard:", error);
            toast.error("Failed to copy to clipboard");
        }
    };

    const handleEditMessage = (messageIndex: number, currentContent: string): void => {
        setEditingMessageIndex(messageIndex);
        setEditedContent(currentContent);
    };

    const handleSaveEdit = async (): Promise<void> => {
        if (!chatId || editingMessageIndex === null || !currentUser?._id) return;

        setIsSubmitting(true);
        try {
            // Store the edited content before resetting state
            const contentToSend = editedContent.trim();

            // Reset editing state first
            setEditingMessageIndex(null);
            setEditedContent("");

            // Use secure mutation to truncate messages up to the edited message
            await editMessage({
                chatId,
                messageIndex: editingMessageIndex,
            });

            // Update UI state immediately to remove the old messages after the edited one
            // This will trigger a re-render and remove the old messages from the UI
            if (currentChat) {
                const truncatedMessages = currentChat.messages.slice(0, editingMessageIndex);
                // Update the chat in the store to reflect the truncation
                useChatStore.getState().updateChat(chatId, { messages: truncatedMessages });
            }

            // Send the new message content to get AI response
            await sendMessage(contentToSend, selectedModel, chatId, currentUser._id);
        } catch (error) {
            console.error("Failed to regenerate response:", error);
            const message = error instanceof Error ? error.message : "Failed to regenerate response";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelEdit = (): void => {
        setEditingMessageIndex(null);
        setEditedContent("");
    };

    const handleRegenerateResponse = async (messageIndex: number): Promise<void> => {
        if (!chatId || !currentUser?._id) return;

        setIsSubmitting(true);
        try {
            // Use the regenerateResponse mutation to truncate messages up to the AI message
            await regenerateResponse({
                chatId,
                messageIndex,
            });

            // Update UI state immediately to remove the old AI response
            // This will trigger a re-render and remove the old message from the UI
            if (currentChat) {
                const truncatedMessages = currentChat.messages.slice(0, messageIndex);
                // Update the chat in the store to reflect the truncation
                useChatStore.getState().updateChat(chatId, { messages: truncatedMessages });
            }

            // Regenerate the AI response without adding a new user message
            await regenerateMessage(selectedModel, chatId);
        } catch (error) {
            console.error("Failed to regenerate response:", error);
            const message = error instanceof Error ? error.message : "Failed to regenerate response";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
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
        <TooltipProvider>
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
                                                    {editingMessageIndex === index && msg.role === "user" ? (
                                                        <div className="space-y-2">
                                                            <Textarea
                                                                value={editedContent}
                                                                onChange={(e) => setEditedContent(e.target.value)}
                                                                className="min-h-[100px]"
                                                                placeholder="Edit your message..."
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button size="sm" onClick={handleSaveEdit} disabled={!editedContent.trim() || isSubmitting}>
                                                                    Save & Regenerate
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : msg.role === "assistant" ? (
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
                                                    {/* Action buttons - outside the chat bubble */}
                                                    {!msg.isStreaming && chatId && editingMessageIndex !== index && (
                                                        <div className="mt-1 flex justify-end gap-1 px-2">
                                                            {msg.role === "assistant" && (
                                                                <>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
                                                                                onClick={() => handleCopyResponse(msg.content)}
                                                                                disabled={isSubmitting || isStreaming}
                                                                            >
                                                                                <Copy className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Copy response</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
                                                                                onClick={() => handleBranchFromMessage(index)}
                                                                                disabled={isSubmitting || isStreaming}
                                                                            >
                                                                                <GitBranch className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Branch from here</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                    {/* Show regenerate button only for the last AI response */}
                                                                    {index === allMessages.length - 1 && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
                                                                                    onClick={() => handleRegenerateResponse(index)}
                                                                                    disabled={isSubmitting || isStreaming}
                                                                                >
                                                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>Regenerate response</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                </>
                                                            )}
                                                            {msg.role === "user" && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
                                                                            onClick={() => handleEditMessage(index, msg.content)}
                                                                            disabled={isSubmitting || isStreaming}
                                                                        >
                                                                            <Edit3 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Edit & regenerate</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
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
        </TooltipProvider>
    );
}
