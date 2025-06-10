import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";

import { type Metadata } from "next";
import { Oswald } from "next/font/google";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(
        oswald.variable,
        "dark bg-background font-oswald min-h-screen antialiased",
      )}
    >
      <body>{children}</body>
    </html>
  );
}
