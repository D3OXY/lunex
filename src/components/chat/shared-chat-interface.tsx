"use client";

import { ReasoningDisplay } from "@/components/reasoning-display";
import { AIBranch, AIBranchMessages, AIBranchNext, AIBranchPage, AIBranchPrevious, AIBranchSelector } from "@/components/ui/kibo-ui/ai/branch";
import { AIMessage, AIMessageAvatar, AIMessageContent } from "@/components/ui/kibo-ui/ai/message";
import { AIResponse } from "@/components/ui/kibo-ui/ai/response";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { APP_NAME } from "@/lib/constants";
import { useQuery } from "convex/react";
import { Copy, Globe, ExternalLink, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface SharedChatInterfaceProps {
    chatId: Id<"chats">;
}

interface Message {
    role: "user" | "assistant";
    content: string;
    reasoning?: string;
}

interface PublicChat {
    _id: Id<"chats">;
    userId: Id<"users">;
    title: string;
    messages: Message[];
    _creationTime: number;
    updatedAt: number;
    branched: boolean;
    visibility: "public" | "private";
    user: {
        name: string;
        username: string;
        imageUrl?: string;
    } | null;
}

export function SharedChatInterface({ chatId }: SharedChatInterfaceProps): React.JSX.Element {
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Get public chat data
    const publicChat = useQuery(api.chats.getPublicChat, { chatId }) as PublicChat | null | undefined;

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
    }, [publicChat?.messages]);

    // Auto-scroll when messages change and user is at bottom
    useEffect(() => {
        if (isAtBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [publicChat?.messages, isAtBottom]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowScrollToBottom(false);
        setIsAtBottom(true);
    };

    const handleCopyResponse = async (content: string): Promise<void> => {
        try {
            await navigator.clipboard.writeText(content);
            toast.success("Response copied to clipboard");
        } catch (error: unknown) {
            console.error("Failed to copy to clipboard:", error);
            toast.error("Failed to copy to clipboard");
        }
    };

    const copyShareLink = async (): Promise<void> => {
        try {
            const shareUrl = window.location.href;
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Share link copied to clipboard");
        } catch (error: unknown) {
            console.error("Error copying link:", error);
            toast.error("Failed to copy link");
        }
    };

    // Loading state
    if (publicChat === undefined) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="space-y-2 text-center">
                    <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                    <div className="text-muted-foreground text-sm">Loading shared chat...</div>
                </div>
            </div>
        );
    }

    // Chat not found or not public
    if (publicChat === null) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="mx-auto max-w-md space-y-4 p-6 text-center">
                    <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                        <MessageSquare className="text-muted-foreground h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold">Chat Not Found</h2>
                        <p className="text-muted-foreground text-sm">This chat is either private, doesn&apos;t exist, or has been deleted.</p>
                    </div>
                    <Button onClick={() => (window.location.href = "/")} className="mt-4">
                        Go to {APP_NAME}
                    </Button>
                </div>
            </div>
        );
    }

    const allMessages = publicChat.messages ?? [];

    return (
        <TooltipProvider>
            <div className="bg-background flex h-full flex-col">
                {/* Header */}
                <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex items-center justify-between border-b p-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold">{publicChat.title}</h1>
                                <Badge variant="secondary" className="text-xs">
                                    <Globe className="mr-1 h-3 w-3" />
                                    Public
                                </Badge>
                            </div>
                            {publicChat.user && (
                                <p className="text-muted-foreground text-sm">
                                    Shared by {publicChat.user.name} (@{publicChat.user.username})
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={copyShareLink}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Copy share link</p>
                            </TooltipContent>
                        </Tooltip>
                        <Button variant="default" size="sm" onClick={() => (window.location.href = "/")}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Try {APP_NAME}
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
                                        <div className="text-muted-foreground flex h-32 items-center justify-center">This shared chat is empty</div>
                                    ) : (
                                        allMessages.map((msg, index) => (
                                            <AIMessage key={`${index}-${msg.role}`} from={msg.role}>
                                                <AIMessageAvatar
                                                    src={msg.role === "user" ? (publicChat.user?.imageUrl ?? "") : ""}
                                                    name={msg.role === "user" ? (publicChat.user?.name ?? "User") : "AI"}
                                                />
                                                <AIMessageContent>
                                                    {msg.role === "assistant" && msg.reasoning && <ReasoningDisplay reasoning={msg.reasoning} isStreaming={false} />}
                                                    {msg.role === "assistant" ? (
                                                        <AIResponse className="tracking-wide">{msg.content}</AIResponse>
                                                    ) : (
                                                        <div className="text-base tracking-wide">{msg.content}</div>
                                                    )}

                                                    {/* Copy button for assistant messages */}
                                                    {msg.role === "assistant" && (
                                                        <div className="mt-1 flex justify-end gap-1 px-2">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
                                                                        onClick={() => handleCopyResponse(msg.content)}
                                                                    >
                                                                        <Copy className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Copy response</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    )}
                                                </AIMessageContent>
                                            </AIMessage>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </AIBranchMessages>

                            {/* Branch Navigation (hidden for shared chats) */}
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
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Scroll to bottom</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-t p-4 backdrop-blur">
                    <div className="text-center">
                        <p className="text-muted-foreground mb-2 text-xs">This is a shared chat from {APP_NAME}. Messages are read-only.</p>
                        <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")}>
                            Start your own conversation on {APP_NAME}
                        </Button>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
