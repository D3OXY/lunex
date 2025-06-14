"use client";

import { ChatInput } from "@/components/chat/chat-input";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import SidebarWrapper from "@/components/sidebar/sidebar-wrapper";
import { useUser } from "@clerk/nextjs";
import { Authenticated, useQuery } from "convex/react";
import { PlusCircle, Compass, Code, Book } from "lucide-react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useChatService } from "@/lib/services/chat-service";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home(): React.JSX.Element {
    const { query, setQuery, selectedModel } = useChatStore();
    const { user } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Convex queries and services
    const currentUser = useQuery(api.user.current, {});
    const { sendMessage, createChat } = useChatService();
    const navigate = useNavigate();
    return (
        <Authenticated>
            <ErrorBoundary>
                <SidebarWrapper>
                    <div className="flex h-full flex-col justify-center">
                        {/* Welcome message */}
                        <div className="flex h-full flex-1 flex-col items-center justify-center text-center">
                            <h1 className="mb-8 text-4xl font-bold text-white">
                                How can I help you, <span className="text-primary">{user?.firstName ?? "User"}</span>?
                            </h1>
                            <div className="mb-8 flex space-x-4">
                                <button className="flex items-center space-x-2 rounded-full bg-[#3a3a3a] px-6 py-3 text-white transition-colors duration-200 hover:bg-[#4a4a4a]">
                                    <PlusCircle className="h-5 w-5" />
                                    <span>Create</span>
                                </button>
                                <button className="flex items-center space-x-2 rounded-full bg-[#3a3a3a] px-6 py-3 text-white transition-colors duration-200 hover:bg-[#4a4a4a]">
                                    <Compass className="h-5 w-5" />
                                    <span>Explore</span>
                                </button>
                                <button className="flex items-center space-x-2 rounded-full bg-[#3a3a3a] px-6 py-3 text-white transition-colors duration-200 hover:bg-[#4a4a4a]">
                                    <Code className="h-5 w-5" />
                                    <span>Code</span>
                                </button>
                                <button className="flex items-center space-x-2 rounded-full bg-[#3a3a3a] px-6 py-3 text-white transition-colors duration-200 hover:bg-[#4a4a4a]">
                                    <Book className="h-5 w-5" />
                                    <span>Learn</span>
                                </button>
                            </div>
                            <div className="flex w-full max-w-2xl flex-col space-y-4">
                                <div
                                    onClick={() => {
                                        setQuery("How does AI work?");
                                        document.getElementById("ai-chat-input")?.focus();
                                    }}
                                    className="cursor-pointer rounded-lg bg-[#1f1f1f] px-6 py-4 text-left text-lg text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
                                >
                                    How does AI work?
                                </div>
                                <div
                                    onClick={() => {
                                        setQuery("Are black holes real?");
                                        document.getElementById("ai-chat-input")?.focus();
                                    }}
                                    className="cursor-pointer rounded-lg bg-[#1f1f1f] px-6 py-4 text-left text-lg text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
                                >
                                    Are black holes real?
                                </div>
                                <div
                                    onClick={() => {
                                        setQuery('How many Rs are in the word "strawberry"?');
                                        document.getElementById("ai-chat-input")?.focus();
                                    }}
                                    className="cursor-pointer rounded-lg bg-[#1f1f1f] px-6 py-4 text-left text-lg text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
                                >
                                    How many Rs are in the word &quot;strawberry&quot;?
                                </div>
                                <div
                                    onClick={() => {
                                        setQuery("What is the meaning of life?");
                                        document.getElementById("ai-chat-input")?.focus();
                                    }}
                                    className="cursor-pointer rounded-lg bg-[#1f1f1f] px-6 py-4 text-left text-lg text-white transition-colors duration-200 hover:bg-[#2a2a2a]"
                                >
                                    What is the meaning of life?
                                </div>
                            </div>
                        </div>
                        {/* Welcome message End */}
                        <ChatInput
                            chatId={null}
                            disabled={isSubmitting}
                            onSubmit={async (e: React.FormEvent) => {
                                e.preventDefault();
                                if (!query.trim() || isSubmitting || !currentUser?._id) return;

                                setIsSubmitting(true);
                                setQuery("");

                                try {
                                    // Create new chat and start streaming - title will be generated in background
                                    const newChatId = await sendMessage(query.trim(), selectedModel, undefined, currentUser._id, (chatId) => {
                                        // Navigate immediately when chat is created (before streaming starts)
                                        void navigate(`/chat/${chatId}`);
                                    });
                                } catch (error) {
                                    console.error("Failed to create chat:", error);
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }}
                        />
                    </div>
                </SidebarWrapper>
            </ErrorBoundary>
        </Authenticated>
    );
}
