"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { useChatStore, useChats } from "@/lib/stores/chat-store";
import { useChatService } from "@/lib/services/chat-service";
import type { Id } from "../../../convex/_generated/dataModel";

// UI Components
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusIcon, MessageSquareIcon, MoreHorizontalIcon, PencilIcon, TrashIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
    currentChatId?: Id<"chats"> | null;
    onChatSelect: (chatId: Id<"chats">) => void;
    onNewChat: () => void;
}

export function ChatSidebar({ currentChatId, onChatSelect, onNewChat }: ChatSidebarProps): React.JSX.Element {
    const [searchQuery, setSearchQuery] = useState("");
    const [editingChatId, setEditingChatId] = useState<Id<"chats"> | null>(null);
    const [editTitle, setEditTitle] = useState("");

    // Store hooks
    const chats = useChats();

    // Service hooks
    const { deleteChat, updateChatTitle } = useChatService();

    // Clerk user hook
    const { user: clerkUser } = useUser();

    // Convex queries
    const currentUser = useQuery(api.user.current, {});

    // Filter chats based on search query
    const filteredChats = chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleDeleteChat = async (chatId: Id<"chats">) => {
        try {
            await deleteChat({ chatId });
        } catch (error) {
            console.error("Failed to delete chat:", error);
        }
    };

    const handleEditTitle = (chatId: Id<"chats">, currentTitle: string) => {
        setEditingChatId(chatId);
        setEditTitle(currentTitle);
    };

    const handleSaveTitle = async (chatId: Id<"chats">) => {
        if (!editTitle.trim()) return;

        try {
            await updateChatTitle({ chatId, title: editTitle.trim() });
            setEditingChatId(null);
            setEditTitle("");
        } catch (error) {
            console.error("Failed to update chat title:", error);
        }
    };

    const handleCancelEdit = () => {
        setEditingChatId(null);
        setEditTitle("");
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else if (diffInHours < 24 * 7) {
            return date.toLocaleDateString([], { weekday: "short" });
        } else {
            return date.toLocaleDateString([], { month: "short", day: "numeric" });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, chatId: Id<"chats">) => {
        if (e.key === "Enter") {
            void handleSaveTitle(chatId);
        } else if (e.key === "Escape") {
            handleCancelEdit();
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, chatId: Id<"chats">) => {
        e.stopPropagation();
        void handleDeleteChat(chatId);
    };

    return (
        <div className="bg-muted/30 flex h-full flex-col border-r">
            {/* Header */}
            <div className="border-b p-4">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Chats</h2>
                    <Button onClick={onNewChat} size="sm" className="gap-2">
                        <PlusIcon className="h-4 w-4" />
                        New
                    </Button>
                </div>

                {/* Search */}
                <div className="relative">
                    <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                    <Input placeholder="Search chats..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {filteredChats.length === 0 ? (
                        <div className="text-muted-foreground flex h-32 flex-col items-center justify-center">
                            <MessageSquareIcon className="mb-2 h-8 w-8" />
                            <p className="text-sm">{searchQuery ? "No chats found" : "No chats yet"}</p>
                            {!searchQuery && (
                                <Button variant="ghost" size="sm" onClick={onNewChat} className="mt-2">
                                    Start a new chat
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredChats.map((chat) => (
                                <div
                                    key={chat._id}
                                    className={cn(
                                        "group flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors",
                                        "hover:bg-muted/50",
                                        currentChatId === chat._id && "bg-muted"
                                    )}
                                    onClick={() => onChatSelect(chat._id)}
                                >
                                    <MessageSquareIcon className="text-muted-foreground h-4 w-4 flex-shrink-0" />

                                    <div className="min-w-0 flex-1">
                                        {editingChatId === chat._id ? (
                                            <Input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onBlur={() => void handleSaveTitle(chat._id)}
                                                onKeyDown={(e) => handleKeyDown(e, chat._id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-auto border-none bg-transparent p-0 text-sm font-medium"
                                                autoFocus
                                            />
                                        ) : (
                                            <>
                                                <div className="truncate text-sm font-medium">{chat.title}</div>
                                                <div className="text-muted-foreground text-xs">
                                                    {chat.messages.length > 0 ? `${chat.messages.length} message${chat.messages.length !== 1 ? "s" : ""}` : "No messages"} •{" "}
                                                    {formatDate(chat._creationTime)}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreHorizontalIcon className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditTitle(chat._id, chat.title);
                                                }}
                                            >
                                                <PencilIcon className="mr-2 h-4 w-4" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => handleDeleteClick(e, chat._id)} className="text-destructive">
                                                <TrashIcon className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
