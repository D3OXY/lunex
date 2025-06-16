"use client";

import { useTempChatService } from "@/lib/services/temp-chat-service";
import { useChatStore } from "@/lib/stores/chat-store";
import { useCurrentTempChat, useTempChatIsStreaming, useTempChatStore } from "@/lib/stores/temp-chat-store";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUser } from "@clerk/nextjs";
import { ChevronDown, Copy, GlobeIcon, MessageCircleDashed, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

export function TempChatInterface(): React.JSX.Element {
    const { query, setQuery, webSearchEnabled } = useChatStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showSaveDialog, setShowSaveDialog] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Temporary chat hooks
    const currentTempChat = useCurrentTempChat();
    const isTempStreaming = useTempChatIsStreaming();
    const { createTempChat, clearTempChat } = useTempChatStore();

    // Service hooks
    const { sendMessage, regenerateMessage, saveTempChat } = useTempChatService();

    // Auth hooks
    const { getToken } = useAuth();
    const { user: clerkUser } = useUser();

    // Router hooks
    const navigate = useNavigate();

    // Create temporary chat on component mount
    useEffect(() => {
        if (!currentTempChat) {
            createTempChat();
        }
    }, [currentTempChat, createTempChat]);

    // Scroll detection
    useEffect(() => {
        const scrollArea = scrollAreaRef.current;
        if (!scrollArea) return;

        const handleScroll = () => {
            const viewport = scrollArea.querySelector("[data-radix-scroll-area-viewport]")!;

            const { scrollTop, scrollHeight, clientHeight } = viewport;
            const threshold = 100; // Show button when 100px from bottom
            const atBottom = scrollHeight - scrollTop - clientHeight < threshold;

            setIsAtBottom(atBottom);
            setShowScrollToBottom(!atBottom && scrollHeight > clientHeight);
        };

        const viewport = scrollArea.querySelector("[data-radix-scroll-area-viewport]")!;
        if (viewport) {
            viewport.addEventListener("scroll", handleScroll);
            // Initial check
            handleScroll();

            return () => viewport.removeEventListener("scroll", handleScroll);
        }
    }, [currentTempChat?.messages]);

    // Modified auto-scroll - only scroll when user is at bottom
    useEffect(() => {
        if (isAtBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [currentTempChat?.messages, isTempStreaming, isAtBottom]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowScrollToBottom(false);
        setIsAtBottom(true);
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (!query.trim() || isSubmitting) return;

        setIsSubmitting(true);
        setQuery("");

        try {
            const authToken = await getToken({ template: "convex" });
            if (!authToken) {
                throw new Error("Authentication token not available");
            }

            await sendMessage(query.trim(), authToken);
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error("Failed to send message");
        } finally {
            setIsSubmitting(false);
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

    const handleRegenerateResponse = async (): Promise<void> => {
        if (!currentTempChat || currentTempChat.messages.length === 0) return;

        setIsSubmitting(true);
        try {
            const authToken = await getToken({ template: "convex" });
            if (!authToken) {
                throw new Error("Authentication token not available");
            }

            await regenerateMessage(authToken);
        } catch (error) {
            console.error("Failed to regenerate response:", error);
            toast.error("Failed to regenerate response");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveAsChat = () => {
        if (!currentTempChat || currentTempChat.messages.length === 0) {
            toast.error("No messages to save");
            return;
        }
        setShowSaveDialog(true);
    };

    const confirmSaveAsChat = async () => {
        try {
            const authToken = await getToken({ template: "convex" });
            if (!authToken) {
                throw new Error("Authentication token not available");
            }

            // Simple title using first user message or default
            const chatId = await saveTempChat();

            toast.success("Chat saved successfully");
            setShowSaveDialog(false);

            // Navigate to the newly saved chat
            void navigate(`/chat/${chatId}`);
        } catch (error) {
            console.error("Failed to save chat:", error);
            toast.error(error instanceof Error ? error.message : "Failed to save chat");
        }
    };

    const allMessages = currentTempChat?.messages ?? [];

    // Find the last assistant message index for regenerate functionality
    const lastAssistantMessageIndex = (() => {
        for (let i = allMessages.length - 1; i >= 0; i--) {
            if (allMessages[i]?.role === "assistant") {
                return i;
            }
        }
        return -1;
    })();

    return (
        <TooltipProvider>
            <div className="flex h-full flex-col">
                {/* Temporary Chat Header */}
                <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex items-center justify-between border-b p-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold">Temporary Chat</h1>
                                <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-1 text-xs font-medium">
                                    <MessageCircleDashed className="mr-1 h-3 w-3" />
                                    Not saved
                                </span>
                            </div>
                            <p className="text-muted-foreground text-sm">This conversation won&apos;t be saved automatically</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {allMessages.length > 0 && (
                            <Button variant="outline" size="sm" onClick={handleSaveAsChat}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Chat
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={clearTempChat}>
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Messages */}
                <div className="relative flex-1 overflow-hidden">
                    <ScrollArea className="h-full px-4" ref={scrollAreaRef}>
                        <AIBranch className="h-full">
                            <AIBranchMessages>
                                <div className="space-y-4 py-4">
                                    {allMessages.length === 0 ? (
                                        <div className="text-muted-foreground flex h-32 items-center justify-center">Start a temporary conversation by typing a message below</div>
                                    ) : (
                                        allMessages.map((msg, index) => (
                                            <AIMessage key={`${index}-${msg.role}`} from={msg.role}>
                                                <AIMessageAvatar
                                                    src={msg.role === "user" ? (clerkUser?.imageUrl ?? "") : ""}
                                                    name={msg.role === "user" ? (clerkUser?.fullName ?? "User") : "AI"}
                                                />
                                                <AIMessageContent>
                                                    {msg.role === "assistant" && msg.reasoning && (
                                                        <ReasoningDisplay reasoning={msg.reasoning} isStreaming={msg.isStreaming && isTempStreaming} />
                                                    )}
                                                    {msg.role === "assistant" ? (
                                                        <AIResponse className="tracking-wide">{msg.content}</AIResponse>
                                                    ) : (
                                                        <div className="text-base tracking-wide">{msg.content}</div>
                                                    )}
                                                    {msg.isStreaming && isTempStreaming && (
                                                        <div className="mt-2 flex items-center gap-1">
                                                            <div className="h-2 w-2 animate-pulse rounded-full bg-current" />
                                                            <span className="text-xs opacity-70">Generating...</span>
                                                        </div>
                                                    )}
                                                    {/* Action buttons - outside the chat bubble */}
                                                    {!msg.isStreaming && (
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
                                                                                disabled={isSubmitting || isTempStreaming}
                                                                            >
                                                                                <Copy className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Copy response</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                    {/* Show regenerate button only for the last AI response */}
                                                                    {index === lastAssistantMessageIndex && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
                                                                                    onClick={handleRegenerateResponse}
                                                                                    disabled={isSubmitting || isTempStreaming}
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
                                                        </div>
                                                    )}
                                                </AIMessageContent>
                                            </AIMessage>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </AIBranchMessages>

                            {/* Branch Navigation (hidden for temporary chats) */}
                            <AIBranchSelector from="assistant" className="hidden py-2">
                                <AIBranchPrevious />
                                <AIBranchPage />
                                <AIBranchNext />
                            </AIBranchSelector>
                        </AIBranch>
                    </ScrollArea>

                    {/* Scroll to bottom button */}
                    {showScrollToBottom && (
                        <div className="absolute right-4 bottom-4 z-10">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="secondary" size="sm" className="h-10 w-10 rounded-full p-0 shadow-lg" onClick={scrollToBottom}>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Scroll to bottom</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
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
                        <ChatInput chatId={null} disabled={isSubmitting || isTempStreaming} onSubmit={handleSubmit} />
                    </div>
                </div>

                {/* Save confirmation dialog */}
                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Save Temporary Chat</DialogTitle>
                            <DialogDescription>This will save your temporary conversation as a permanent chat that you can access later.</DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={confirmSaveAsChat}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Chat
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
