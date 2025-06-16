"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCurrentChat } from "@/lib/stores/chat-store";
import { UserButton } from "@clerk/nextjs";
import { Authenticated } from "convex/react";
import { MessageCircleDashed, MessageCircleQuestion } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();
    const currentChat = useCurrentChat();
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
                        {pathname === "/" && (
                            <>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>New Chat</BreadcrumbPage>
                                </BreadcrumbItem>
                            </>
                        )}
                        {pathname.startsWith("/chat/") && currentChat && (
                            <>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="max-w-[100px] truncate md:max-w-[300px]">{currentChat?.title}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </>
                        )}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <Authenticated>
                <div className="text-foreground flex items-center gap-2">
                    {pathname === "/" && (
                        <Button variant="ghost">
                            <MessageCircleDashed />
                            Temporary
                        </Button>
                    )}
                    {pathname.startsWith("/chat/") && currentChat && (
                        <Button variant="ghost">
                            <MessageCircleQuestion />
                            Chat Settings
                        </Button>
                    )}
                    <UserButton showName />
                </div>
            </Authenticated>
        </nav>
    );
}
