"use client";

import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import SidebarWrapper from "@/components/sidebar/sidebar-wrapper";
import { Authenticated } from "convex/react";

export default function Settings(): React.JSX.Element {
    return (
        <Authenticated>
            <ErrorBoundary>
                <SidebarWrapper>
                    <div className="flex h-full flex-col justify-center"></div>
                </SidebarWrapper>
            </ErrorBoundary>
        </Authenticated>
    );
}
