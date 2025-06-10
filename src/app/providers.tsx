"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { ToasterProvider } from "@/components/providers/ToastProvider";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";
import QueryClientProvider from "@/components/providers/QueryClientProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ClerkProvider>
        <ConvexClientProvider>
          <QueryClientProvider>{children}</QueryClientProvider>
        </ConvexClientProvider>
      </ClerkProvider>
      <ToasterProvider />
    </ThemeProvider>
  );
}
