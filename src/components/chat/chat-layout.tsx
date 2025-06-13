"use client";

import { useState } from "react";
import { ChatInterface } from "./chat-interface";
import { ChatSidebar } from "./chat-sidebar";
import { useChatStore } from "@/lib/stores/chat-store";
import { useChatService } from "@/lib/services/chat-service";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// UI Components
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface ChatLayoutProps {
    initialChatId?: Id<"chats">;
}

export function ChatLayout({ initialChatId }: ChatLayoutProps): React.JSX.Element {
    const [selectedChatId, setSelectedChatId] = useState<Id<"chats"> | null>(initialChatId ?? null);

    // Store hooks
    const { setCurrentChatId } = useChatStore();

    // Service hooks
    const { createChat } = useChatService();

    // Convex queries
    const currentUserQuery = useQuery(api.user.current, {});
    const currentUser = currentUserQuery;

    const handleChatSelect = (chatId: Id<"chats">) => {
        setSelectedChatId(chatId);
        setCurrentChatId(chatId);
    };

    const handleNewChat = async () => {
        if (!currentUser) return;

        try {
            const newChatId = await createChat({
                userId: currentUser._id,
                title: "New Chat",
            });

            if (newChatId) {
                setSelectedChatId(newChatId);
                setCurrentChatId(newChatId);
            }
        } catch (error) {
            console.error("Failed to create new chat:", error);
        }
    };

    return (
        <div className="h-full w-full">
            <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* Sidebar Panel */}
                <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="min-w-[300px]">
                    <ChatSidebar currentChatId={selectedChatId} onChatSelect={handleChatSelect} onNewChat={handleNewChat} />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Chat Panel */}
                <ResizablePanel defaultSize={75} minSize={60}>
                    {selectedChatId ? (
                        <ChatInterface chatId={selectedChatId} />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                            <div className="max-w-md">
                                <h3 className="mb-2 text-xl font-semibold">Welcome to Chat</h3>
                                <p className="text-muted-foreground mb-6">Select an existing chat from the sidebar or create a new one to get started.</p>
                                <button
                                    onClick={handleNewChat}
                                    className="ring-offset-background focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                                >
                                    Start New Chat
                                </button>
                            </div>
                        </div>
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
