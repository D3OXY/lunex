"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useChatService } from "@/lib/services/chat-service";
import type { Chat } from "@/lib/stores/chat-store";
import { useChats, useChatStore } from "@/lib/stores/chat-store";
import { cn } from "@/lib/utils";
import { GitBranchIcon, MessageSquareIcon, PenLine, X } from "lucide-react";
import type { HTMLAttributes, ReactElement } from "react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Id } from "../../../convex/_generated/dataModel";

type NavChatsProps = HTMLAttributes<HTMLDivElement> & {
    onNewChat?: () => void;
};

interface ChatGroup {
    title: string;
    chats: Chat[];
    startIndex: number;
}

export const NavChats = ({ className, ...props }: NavChatsProps): ReactElement => {
    const [hoveredChatId, setHoveredChatId] = useState<Id<"chats"> | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [newTitle, setNewTitle] = useState("");

    const chats = useChats();
    const location = useLocation();
    const { deleteChat, updateChatTitle } = useChatService();
    const { open: sidebarOpen } = useSidebar();
    const { removeChat } = useChatStore();

    // Memoized chat groups for better performance
    const chatGroups = useMemo((): ChatGroup[] => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const groups = {
            today: [] as Chat[],
            yesterday: [] as Chat[],
            thirtyDays: [] as Chat[],
            older: [] as Chat[],
        };

        chats.forEach((chat) => {
            const chatDate = new Date(chat._creationTime);
            if (chatDate >= today) {
                groups.today.push(chat);
            } else if (chatDate >= yesterday) {
                groups.yesterday.push(chat);
            } else if (chatDate >= thirtyDaysAgo) {
                groups.thirtyDays.push(chat);
            } else {
                groups.older.push(chat);
            }
        });

        let startIndex = 0;
        const result: ChatGroup[] = [];

        if (groups.today.length > 0) {
            result.push({ title: "Today", chats: groups.today, startIndex });
            startIndex += groups.today.length;
        }
        if (groups.yesterday.length > 0) {
            result.push({ title: "Yesterday", chats: groups.yesterday, startIndex });
            startIndex += groups.yesterday.length;
        }
        if (groups.thirtyDays.length > 0) {
            result.push({ title: "Last 30 days", chats: groups.thirtyDays, startIndex });
            startIndex += groups.thirtyDays.length;
        }
        if (groups.older.length > 0) {
            result.push({ title: "Older", chats: groups.older, startIndex });
        }

        return result;
    }, [chats]);

    const handleDeleteChat = async (chatId: Id<"chats">): Promise<void> => {
        // Immediately remove from local store for instant UI feedback
        removeChat(chatId);

        // Close dialog and clear state
        setDeleteDialogOpen(false);
        setSelectedChat(null);

        try {
            // Call server mutation to persist the deletion
            await deleteChat({ chatId });
        } catch (error) {
            console.error("Failed to delete chat on server:", error);
            // Note: We don't re-add the chat here because the sync layer will handle
            // restoring it if the server deletion failed
        }
    };

    const startEdit = (chatId: Id<"chats">, currentTitle: string): void => {
        setSelectedChat(chats.find((chat) => chat._id === chatId) ?? null);
        setNewTitle(currentTitle);
        setRenameDialogOpen(true);
    };

    const saveEdit = async (): Promise<void> => {
        if (!selectedChat) return;

        const trimmedTitle = newTitle.trim();
        if (!trimmedTitle) return;

        await updateChatTitle({ chatId: selectedChat._id, title: trimmedTitle });
        setSelectedChat(null);
        setNewTitle("");
        setRenameDialogOpen(false);
    };

    const cancelEdit = (): void => {
        setSelectedChat(null);
        setNewTitle("");
        setRenameDialogOpen(false);
    };

    const renderChatItem = (chat: Chat, animationIndex: number): ReactElement => {
        const href = `/chat/${chat._id}`;
        const isActive = location.pathname === href;
        const isHovered = hoveredChatId === chat._id;

        const chatIcon = chat.branched ? (
            <GitBranchIcon className="text-muted-foreground group-hover:text-foreground h-3.5 w-3.5 flex-shrink-0 transition-colors duration-200" />
        ) : (
            <MessageSquareIcon className="text-muted-foreground group-hover:text-foreground h-3.5 w-3.5 flex-shrink-0 transition-colors duration-200" />
        );

        const chatItem = (
            <div
                key={chat._id}
                className={cn(
                    "group relative mx-2 flex cursor-pointer items-center rounded-lg transition-all duration-200 ease-out",
                    "hover:bg-sidebar-accent/70 hover:shadow-sm",
                    "animate-in slide-in-from-left-2 fade-in-0",
                    isActive && "bg-sidebar-accent border-primary/20 border shadow-sm",
                    !sidebarOpen && "justify-center"
                )}
                style={{
                    animationDelay: `${animationIndex * 30}ms`,
                    animationFillMode: "both",
                }}
                onMouseEnter={() => setHoveredChatId(chat._id)}
                onMouseLeave={() => setHoveredChatId(null)}
            >
                <Link to={href} className={cn("flex min-h-0 w-full items-center gap-2 overflow-hidden p-2", !sidebarOpen && "justify-center")}>
                    {chatIcon}
                    {sidebarOpen && <div className="group-hover:text-foreground min-w-0 flex-1 truncate text-xs font-medium transition-colors duration-200">{chat.title}</div>}
                </Link>

                {sidebarOpen && isHovered && (
                    <div className="from-background via-background/90 animate-in slide-in-from-right-2 fade-in-0 absolute top-0 right-0 bottom-0 z-10 flex items-center justify-end gap-1 bg-gradient-to-l to-transparent pr-2 pl-8 duration-200">
                        <Button
                            variant="ghost"
                            className="h-6 w-6 p-0 text-white"
                            onClick={(e) => {
                                e.stopPropagation();
                                startEdit(chat._id, chat.title);
                            }}
                            title="Rename chat"
                        >
                            <PenLine className="size-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            className="h-6 w-6 p-0 text-white"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedChat(chat);
                                setDeleteDialogOpen(true);
                            }}
                            title="Delete chat"
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                )}
            </div>
        );

        // When sidebar is collapsed, wrap with tooltip
        if (!sidebarOpen) {
            return (
                <Tooltip key={chat._id}>
                    <TooltipTrigger asChild>{chatItem}</TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                        <p className="font-medium">{chat.title}</p>
                        {chat.branched && <p className="text-muted-foreground text-xs">Branch</p>}
                    </TooltipContent>
                </Tooltip>
            );
        }

        return chatItem;
    };

    return (
        <TooltipProvider>
            <div className={cn("flex h-full flex-col", className)} {...props}>
                <div className="flex-1 overflow-x-hidden overflow-y-auto">
                    <div className="pb-4">
                        {chats.length === 0 ? (
                            <div className="text-muted-foreground animate-in fade-in-50 flex h-32 flex-col items-center justify-center px-2 duration-300">
                                <MessageSquareIcon className="mb-2 h-6 w-6" />
                                {sidebarOpen && <p className="text-center text-xs">No chats yet</p>}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {chatGroups.map((group) => (
                                    <div key={group.title} className="mb-4">
                                        {sidebarOpen && <div className="text-muted-foreground mb-2 px-2 text-xs font-medium">{group.title}</div>}
                                        <div className="space-y-1">{group.chats.map((chat, index) => renderChatItem(chat, group.startIndex + index))}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {selectedChat && (
                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to delete &quot;{selectedChat.title}&quot;? This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel
                                    onClick={() => {
                                        setDeleteDialogOpen(false);
                                        setSelectedChat(null);
                                    }}
                                >
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => void handleDeleteChat(selectedChat._id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {selectedChat && (
                    <Dialog
                        open={renameDialogOpen}
                        onOpenChange={(open) => {
                            setRenameDialogOpen(open);
                            if (!open) {
                                cancelEdit();
                            }
                        }}
                    >
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Rename Chat</DialogTitle>
                                <DialogDescription>Make changes to your chat title here. Click save or press Enter when you&apos;re done.</DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (newTitle.trim()) {
                                        void saveEdit();
                                    }
                                }}
                                className="grid gap-4 py-4"
                            >
                                <div className="flex flex-col gap-4">
                                    <Input
                                        id="name"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Escape") {
                                                cancelEdit();
                                            }
                                        }}
                                        className="col-span-3"
                                        autoFocus
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" type="button" onClick={cancelEdit}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={!newTitle.trim()}>
                                        Save changes
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </TooltipProvider>
    );
};
