"use client";

import { SharedChatInterface } from "@/components/chat/shared-chat-interface";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import type { Id } from "../../convex/_generated/dataModel";
import { useParams } from "react-router-dom";

export default function SharedChat(): React.JSX.Element {
    const { id } = useParams<{ id: string }>();

    if (!id) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="space-y-2 text-center">
                    <h2 className="text-xl font-semibold">Invalid Chat ID</h2>
                    <p className="text-muted-foreground">The chat ID is missing or invalid.</p>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="bg-background h-screen">
                <SharedChatInterface chatId={id as unknown as Id<"chats">} />
            </div>
        </ErrorBoundary>
    );
}
