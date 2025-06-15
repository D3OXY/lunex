"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// UI Components
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Hash, Clock } from "lucide-react";

interface SearchCommandProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps): React.JSX.Element {
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    // Search results from Convex
    const searchResults = useQuery(api.chats.searchChats, searchTerm.trim() ? { searchTerm: searchTerm.trim(), limit: 10 } : "skip");

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                onOpenChange(!open);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onOpenChange]);

    // Reset search when dialog closes
    useEffect(() => {
        if (!open) {
            setSearchTerm("");
        }
    }, [open]);

    const handleSelectChat = (chatId: Id<"chats">) => {
        onOpenChange(false);
        void navigate(`/chat/${chatId}`);
    };

    const formatDate = (timestamp: number): string => {
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

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange} title="Search Chats" description="Search through your chat history">
            <CommandInput placeholder="Search chats..." value={searchTerm} onValueChange={setSearchTerm} />
            <CommandList>
                <CommandEmpty>{searchTerm.trim() ? "No chats found." : "Start typing to search your chats..."}</CommandEmpty>

                {searchResults && searchResults.length > 0 && (
                    <CommandGroup heading="Search Results">
                        {searchResults.map((result) => (
                            <CommandItem
                                key={result._id}
                                value={`${result.title} ${result.matchedContent}`}
                                onSelect={() => handleSelectChat(result._id)}
                                className="flex flex-col items-start gap-1 p-3"
                            >
                                <div className="flex w-full items-center gap-2">
                                    <MessageSquare className="text-muted-foreground h-4 w-4" />
                                    <span className="flex-1 truncate font-medium">{result.title}</span>
                                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(result._creationTime)}
                                    </div>
                                </div>

                                <div className="flex w-full items-center gap-2 text-xs">
                                    <Badge variant="outline" className="text-xs">
                                        {result.matchType === "title" ? (
                                            <>
                                                <Hash className="mr-1 h-3 w-3" />
                                                Title
                                            </>
                                        ) : (
                                            <>
                                                <MessageSquare className="mr-1 h-3 w-3" />
                                                Message
                                            </>
                                        )}
                                    </Badge>
                                    <span className="text-muted-foreground flex-1 truncate">{result.matchedContent}</span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}
