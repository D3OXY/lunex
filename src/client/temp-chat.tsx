"use client";

import { TempChatInterface } from "@/components/chat/temp-chat-interface";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import SidebarWrapper from "@/components/sidebar/sidebar-wrapper";
import { Authenticated } from "convex/react";

export default function TempChat(): React.JSX.Element {
    return (
        <Authenticated>
            <ErrorBoundary>
                <SidebarWrapper>
                    <TempChatInterface />
                </SidebarWrapper>
            </ErrorBoundary>
        </Authenticated>
    );
}
