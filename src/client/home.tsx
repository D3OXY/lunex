"use client";

import { ChatInterface } from "@/components/chat/chat-interface";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import SidebarWrapper from "@/components/sidebar/sidebar-wrapper";

export default function Home(): React.JSX.Element {
    return (
        <ErrorBoundary>
            <SidebarWrapper>
                <ChatInterface />
            </SidebarWrapper>
        </ErrorBoundary>
    );
}
