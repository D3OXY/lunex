"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatService } from "@/lib/services/chat-service";
import type { Chat } from "@/lib/stores/chat-store";
import { useChats } from "@/lib/stores/chat-store";
import { cn } from "@/lib/utils";
import { MessageSquareIcon, PenLine, SearchIcon, X, XIcon } from "lucide-react";
import type { HTMLAttributes, ReactElement } from "react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Id } from "../../../convex/_generated/dataModel";

type NavChatsProps = HTMLAttributes<HTMLDivElement> & {
    onNewChat?: () => void;
};

interface GroupedChats {
    today: Chat[];
    yesterday: Chat[];
    thirtyDays: Chat[];
    older: Chat[];
}

export const NavChats = ({ className, ...props }: NavChatsProps): ReactElement => {
    const [searchQuery, setSearchQuery] = useState("");
    const [editingChatId, setEditingChatId] = useState<Id<"chats"> | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [hoveredChatId, setHoveredChatId] = useState<Id<"chats"> | null>(null);

    const chats = useChats();
    const location = useLocation();
    const { deleteChat, updateChatTitle } = useChatService();

    // Filter chats based on search query
    const filteredChats = chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()));

    // Group chats by date
    const groupChatsByDate = (chats: typeof filteredChats): GroupedChats => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        return chats.reduce(
            (groups, chat) => {
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

                return groups;
            },
            { today: [], yesterday: [], thirtyDays: [], older: [] } as GroupedChats
        );
    };

    const groupedChats = groupChatsByDate(filteredChats);

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

    const handleEditClick = (e: React.MouseEvent, chatId: Id<"chats">, currentTitle: string) => {
        e.stopPropagation();
        handleEditTitle(chatId, currentTitle);
    };

    const renderChatGroup = (chats: Chat[], groupTitle: string, startIndex: number) => {
        if (chats.length === 0) return null;

        return (
            <div key={groupTitle} className="mb-4">
                <div className="text-muted-foreground mb-2 px-2 text-xs font-medium">{groupTitle}</div>
                <div className="space-y-1">
                    {chats.map((chat, index) => {
                        const href = `/chat/${chat._id}`;
                        const isActive = location.pathname === href;
                        const animationIndex = startIndex + index;
                        const isHovered = hoveredChatId === chat._id;

                        return (
                            <div
                                key={chat._id}
                                className={cn(
                                    "group relative mx-2 flex cursor-pointer items-center rounded-lg transition-all duration-200 ease-out",
                                    "hover:bg-sidebar-accent/70 hover:shadow-sm",
                                    "animate-in slide-in-from-left-2 fade-in-0",
                                    isActive && "bg-sidebar-accent border-primary/20 border shadow-sm"
                                )}
                                style={{
                                    animationDelay: `${animationIndex * 30}ms`,
                                    animationFillMode: "both",
                                }}
                                onMouseEnter={() => setHoveredChatId(chat._id)}
                                onMouseLeave={() => setHoveredChatId(null)}
                            >
                                {editingChatId === chat._id ? (
                                    <div className="flex w-full items-center gap-2 p-2">
                                        <MessageSquareIcon className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
                                        <Input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onBlur={() => void handleSaveTitle(chat._id)}
                                            onKeyDown={(e) => handleKeyDown(e, chat._id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="focus:ring-primary/50 h-5 flex-1 border-none bg-transparent p-0 text-xs font-medium focus:ring-1"
                                            autoFocus
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 flex-shrink-0 p-0 opacity-70 hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCancelEdit();
                                            }}
                                        >
                                            <XIcon className="h-2.5 w-2.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Link
                                            to={href}
                                            className="flex min-h-0 w-full items-center gap-2 overflow-hidden p-2"
                                            onClick={() => {
                                                /* Link handles navigation */
                                            }}
                                        >
                                            <MessageSquareIcon className="text-muted-foreground group-hover:text-foreground h-3.5 w-3.5 flex-shrink-0 transition-colors duration-200" />
                                            <div className="group-hover:text-foreground min-w-0 flex-1 truncate text-xs font-medium transition-colors duration-200">
                                                {chat.title}
                                            </div>
                                        </Link>

                                        {/* Hover Overlay Actions */}
                                        {isHovered && (
                                            <div className="from-background via-background/90 animate-in slide-in-from-right-2 fade-in-0 absolute top-0 right-0 bottom-0 z-10 flex items-center justify-end gap-1 bg-gradient-to-l to-transparent pr-2 pl-8 duration-200">
                                                <Button
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0 text-white"
                                                    onClick={(e) => handleEditClick(e, chat._id, chat.title)}
                                                    title="Rename chat"
                                                >
                                                    <PenLine className="size-4" />
                                                </Button>
                                                <Button variant="ghost" className="h-6 w-6 p-0 text-white" onClick={(e) => handleDeleteClick(e, chat._id)} title="Delete chat">
                                                    <X className="size-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={cn("flex h-full flex-col", className)} {...props}>
            {/* Search */}
            <div className="relative mb-3 flex-shrink-0 px-2">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-5 h-3.5 w-3.5 -translate-y-1/2 transform" />
                <Input
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="focus:ring-primary/20 h-8 pl-8 text-xs transition-all duration-200 focus:ring-2"
                />
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto">
                <div className="pb-4">
                    {filteredChats.length === 0 ? (
                        <div className="text-muted-foreground animate-in fade-in-50 flex h-32 flex-col items-center justify-center px-2 duration-300">
                            <MessageSquareIcon className="mb-2 h-6 w-6" />
                            <p className="text-center text-xs">{searchQuery ? "No chats found" : "No chats yet"}</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {renderChatGroup(groupedChats.today, "Today", 0)}
                            {renderChatGroup(groupedChats.yesterday, "Yesterday", groupedChats.today.length)}
                            {renderChatGroup(groupedChats.thirtyDays, "30 Days Ago", groupedChats.today.length + groupedChats.yesterday.length)}
                            {renderChatGroup(groupedChats.older, "Older", groupedChats.today.length + groupedChats.yesterday.length + groupedChats.thirtyDays.length)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
