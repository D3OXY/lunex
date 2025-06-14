import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";

import { type Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

export const metadata: Metadata = {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={cn(inter.variable, "dark bg-background font-inter min-h-screen antialiased")}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
