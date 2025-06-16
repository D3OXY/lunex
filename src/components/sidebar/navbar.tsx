"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCurrentChat, useChatStore } from "@/lib/stores/chat-store";
import { UserButton } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { Authenticated } from "convex/react";
import { MessageCircleDashed, MessageCircleQuestion, Globe, Copy, ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";

export default function Navbar() {
    const pathname = usePathname();
    const currentChat = useCurrentChat();
    const [showChatSettings, setShowChatSettings] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const updateChatVisibility = useMutation(api.chats.updateChatVisibility);
    const branchChat = useMutation(api.chats.branchChat);
    const { updateChat } = useChatStore();

    const handleShareOption = async (option: "public" | "branch-public"): Promise<void> => {
        if (!currentChat) return;

        setIsProcessing(true);
        try {
            if (option === "public") {
                // Make current chat public
                await updateChatVisibility({
                    chatId: currentChat._id,
                    visibility: "public",
                });

                // Update local store
                updateChat(currentChat._id, { visibility: "public" });

                toast.success("Chat is now public and shareable");
            } else if (option === "branch-public") {
                // Create a public branch up to current point
                const branchedChatId = await branchChat({
                    chatId: currentChat._id,
                    messageIndex: currentChat.messages.length - 1,
                    title: `${currentChat.title} (Public)`,
                });

                // Make the branch public
                await updateChatVisibility({
                    chatId: branchedChatId,
                    visibility: "public",
                });

                toast.success("Public branch created successfully");

                // Copy share link to clipboard
                const shareUrl = `${window.location.origin}/shared/${branchedChatId}`;
                await navigator.clipboard.writeText(shareUrl);
                toast.info("Share link copied to clipboard");
            }

            setShowChatSettings(false);
        } catch (error: unknown) {
            console.error("Error sharing chat:", error);
            toast.error("Failed to share chat");
        } finally {
            setIsProcessing(false);
        }
    };

    const copyShareLink = async (): Promise<void> => {
        if (!currentChat || currentChat.visibility !== "public") return;

        try {
            const shareUrl = `${window.location.origin}/shared/${currentChat._id}`;
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Share link copied to clipboard");
        } catch (error: unknown) {
            console.error("Error copying link:", error);
            toast.error("Failed to copy link");
        }
    };

    const openSharedChat = (): void => {
        if (!currentChat || currentChat.visibility !== "public") return;

        const shareUrl = `${window.location.origin}/shared/${currentChat._id}`;
        window.open(shareUrl, "_blank");
    };

    const handleMakePrivate = async (): Promise<void> => {
        if (!currentChat) return;

        setIsProcessing(true);
        try {
            await updateChatVisibility({
                chatId: currentChat._id,
                visibility: "private",
            });

            // Update local store
            updateChat(currentChat._id, { visibility: "private" });

            toast.success("Chat is now private");
            setShowChatSettings(false);
        } catch (error: unknown) {
            console.error("Error making chat private:", error);
            toast.error("Failed to make chat private");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <nav className="bg-background flex h-10 shrink-0 items-center justify-between gap-2 rounded-lg px-4">
                <div className="flex h-10 items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="#">Lunex</BreadcrumbLink>
                            </BreadcrumbItem>
                            {pathname === "/" && (
                                <>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>New Chat</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </>
                            )}
                            {pathname.startsWith("/chat/") && currentChat && (
                                <>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="max-w-[100px] truncate md:max-w-[300px]">
                                            {currentChat?.title}
                                            {currentChat?.visibility === "public" && <Globe className="text-muted-foreground ml-2 inline h-3 w-3" />}
                                        </BreadcrumbPage>
                                    </BreadcrumbItem>
                                </>
                            )}
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
                <Authenticated>
                    <div className="text-foreground flex items-center gap-2">
                        {pathname === "/" && (
                            <Button variant="ghost">
                                <MessageCircleDashed />
                                Temporary
                            </Button>
                        )}
                        {pathname.startsWith("/chat/") && currentChat && (
                            <Button variant="ghost" onClick={() => setShowChatSettings(true)}>
                                <MessageCircleQuestion />
                                Chat Settings
                            </Button>
                        )}
                        <UserButton showName />
                    </div>
                </Authenticated>
            </nav>

            {/* Chat Settings Dialog */}
            <Dialog open={showChatSettings} onOpenChange={setShowChatSettings}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Chat Settings</DialogTitle>
                        <DialogDescription>Manage your chat sharing preferences. Public chats can be viewed by anyone with the link.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Current Status */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Current Status</Label>
                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                {currentChat?.visibility === "public" ? (
                                    <>
                                        <Globe className="h-4 w-4" />
                                        This chat is public and shareable
                                    </>
                                ) : (
                                    <>
                                        <MessageCircleDashed className="h-4 w-4" />
                                        This chat is private
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Share Options */}
                        {currentChat?.visibility === "private" && (
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Share Options</Label>
                                <RadioGroup>
                                    <div className="space-y-3">
                                        <div
                                            className="hover:bg-muted/50 flex cursor-pointer items-center space-x-2 rounded-lg border p-3"
                                            onClick={() => handleShareOption("branch-public")}
                                        >
                                            <RadioGroupItem value="branch-public" id="branch-public" />
                                            <div className="space-y-1">
                                                <Label htmlFor="branch-public" className="cursor-pointer font-medium">
                                                    Share Current State
                                                </Label>
                                                <p className="text-muted-foreground text-xs">
                                                    Create a public branch of the conversation up to this point. Future messages stay private.
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className="hover:bg-muted/50 flex cursor-pointer items-center space-x-2 rounded-lg border p-3"
                                            onClick={() => handleShareOption("public")}
                                        >
                                            <RadioGroupItem value="public" id="public" />
                                            <div className="space-y-1">
                                                <Label htmlFor="public" className="cursor-pointer font-medium">
                                                    Share Entire Chat
                                                </Label>
                                                <p className="text-muted-foreground text-xs">Make this entire conversation public. New messages will also be visible to others.</p>
                                            </div>
                                        </div>
                                    </div>
                                </RadioGroup>
                            </div>
                        )}

                        {/* Public Chat Actions */}
                        {currentChat?.visibility === "public" && (
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Public Chat Actions</Label>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={copyShareLink} className="flex-1">
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy Link
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={openSharedChat} className="flex-1">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open Shared
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleShareOption("branch-public")} className="w-full" disabled={isProcessing}>
                                    Create Branch & Share Current State
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleMakePrivate()} className="w-full" disabled={isProcessing}>
                                    Make Private
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
