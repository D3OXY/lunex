"use client";

import type { ReactNode } from "react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from "@tanstack/react-query";
import { convex } from "@/components/providers/ConvexClientProvider";

const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
        },
    },
});
convexQueryClient.connect(queryClient);

export default function QueryClientProvider({ children }: { children: ReactNode }) {
    return <TanstackQueryClientProvider client={queryClient}>{children}</TanstackQueryClientProvider>;
}
