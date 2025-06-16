"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useChats, type Chat } from "@/lib/stores/chat-store";
import { UserButton } from "@clerk/nextjs";
import type { Id } from "convex/_generated/dataModel";
import { Authenticated } from "convex/react";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();
    const chats = useChats();
    return (
        <nav className="bg-background flex h-10 shrink-0 items-center justify-between gap-2 rounded-lg px-4">
            <div className="flex h-10 items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink href="#">Lunex</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                        {pathname === "/" && (
                            <BreadcrumbItem>
                                <BreadcrumbPage>New Chat</BreadcrumbPage>
                            </BreadcrumbItem>
                        )}
                        {pathname.startsWith("/chat/") && (
                            <BreadcrumbItem>
                                <BreadcrumbPage className="max-w-[100px] truncate md:max-w-[300px]">{getChatTitle(chats, pathname.split("/")[2]! as Id<"chats">)}</BreadcrumbPage>
                            </BreadcrumbItem>
                        )}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <Authenticated>
                <div className="text-foreground flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                        <Bell />
                    </Button>
                    <UserButton showName />
                </div>
            </Authenticated>
        </nav>
    );
}

function getChatTitle(chats: Chat[], chatId: Id<"chats">) {
    const chat = chats.find((chat) => chat._id === chatId);
    return chat?.title;
}
