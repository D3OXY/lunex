"use client";

import SidebarWrapper from "@/components/sidebar/sidebar-wrapper";
import { ChatInterface } from "@/components/chat/chat-interface";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Authenticated } from "convex/react";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

interface ChatPageProps {
  params: {
    id: string;
  };
}

export default function ChatPage({ params }: ChatPageProps): React.ReactElement {
  const { id } = params;
  return (
    <Authenticated>
      <ErrorBoundary>
        <SidebarWrapper>
          <ChatInterface chatId={id as unknown as Id<"chats">} />
        </SidebarWrapper>
      </ErrorBoundary>
    </Authenticated>
  );
}