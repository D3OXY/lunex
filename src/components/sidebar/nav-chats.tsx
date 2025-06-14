"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatService } from "@/lib/services/chat-service";
import type { Chat } from "@/lib/stores/chat-store";
import { useChats } from "@/lib/stores/chat-store";
import { cn } from "@/lib/utils";
import { MessageSquareIcon, PenLine, X, XIcon } from "lucide-react";
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
    const [editingChatId, setEditingChatId] = useState<Id<"chats"> | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [hoveredChatId, setHoveredChatId] = useState<Id<"chats"> | null>(null);

    const chats = useChats();
    const location = useLocation();
    const { deleteChat, updateChatTitle } = useChatService();

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
            result.push({ title: "30 Days Ago", chats: groups.thirtyDays, startIndex });
            startIndex += groups.thirtyDays.length;
        }
        if (groups.older.length > 0) {
            result.push({ title: "Older", chats: groups.older, startIndex });
        }

        return result;
    }, [chats]);

    const handleDeleteChat = async (chatId: Id<"chats">): Promise<void> => {
        await deleteChat({ chatId });
    };

    const startEdit = (chatId: Id<"chats">, currentTitle: string): void => {
        setEditingChatId(chatId);
        setEditTitle(currentTitle);
    };

    const saveEdit = async (chatId: Id<"chats">): Promise<void> => {
        const trimmedTitle = editTitle.trim();
        if (!trimmedTitle) return;

        await updateChatTitle({ chatId, title: trimmedTitle });
        setEditingChatId(null);
        setEditTitle("");
    };

    const cancelEdit = (): void => {
        setEditingChatId(null);
        setEditTitle("");
    };

    const handleKeyDown = (e: React.KeyboardEvent, chatId: Id<"chats">): void => {
        if (e.key === "Enter") {
            void saveEdit(chatId);
        } else if (e.key === "Escape") {
            cancelEdit();
        }
    };

    const renderChatItem = (chat: Chat, animationIndex: number): ReactElement => {
        const href = `/chat/${chat._id}`;
        const isActive = location.pathname === href;
        const isEditing = editingChatId === chat._id;
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
                {isEditing ? (
                    <div className="flex w-full items-center gap-2 p-2">
                        <MessageSquareIcon className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
                        <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => void saveEdit(chat._id)}
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
                                cancelEdit();
                            }}
                        >
                            <XIcon className="h-2.5 w-2.5" />
                        </Button>
                    </div>
                ) : (
                    <>
                        <Link to={href} className="flex min-h-0 w-full items-center gap-2 overflow-hidden p-2">
                            <MessageSquareIcon className="text-muted-foreground group-hover:text-foreground h-3.5 w-3.5 flex-shrink-0 transition-colors duration-200" />
                            <div className="group-hover:text-foreground min-w-0 flex-1 truncate text-xs font-medium transition-colors duration-200">{chat.title}</div>
                        </Link>

                        {isHovered && (
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
                                        void handleDeleteChat(chat._id);
                                    }}
                                    title="Delete chat"
                                >
                                    <X className="size-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className={cn("flex h-full flex-col", className)} {...props}>
            <div className="flex-1 overflow-x-hidden overflow-y-auto">
                <div className="pb-4">
                    {chats.length === 0 ? (
                        <div className="text-muted-foreground animate-in fade-in-50 flex h-32 flex-col items-center justify-center px-2 duration-300">
                            <MessageSquareIcon className="mb-2 h-6 w-6" />
                            <p className="text-center text-xs">No chats yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {chatGroups.map((group) => (
                                <div key={group.title} className="mb-4">
                                    <div className="text-muted-foreground mb-2 px-2 text-xs font-medium">{group.title}</div>
                                    <div className="space-y-1">{group.chats.map((chat, index) => renderChatItem(chat, group.startIndex + index))}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
