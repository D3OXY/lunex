"use client";

import SidebarWrapper from "@/components/sidebar/sidebar-wrapper";
import { ChatInterface } from "@/components/chat/chat-interface";
import type { Id } from "../../convex/_generated/dataModel";
import { Authenticated } from "convex/react";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { useParams } from "react-router-dom";

export default function Chat() {
    const { id } = useParams<{ id: string }>();

    return (
        <Authenticated>
            <ErrorBoundary>
                <SidebarWrapper>{/* Public Chat Interface */}</SidebarWrapper>
            </ErrorBoundary>
        </Authenticated>
    );
}
