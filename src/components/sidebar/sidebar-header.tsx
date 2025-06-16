"use client";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from "@/components/ui/sidebar";
import { MessageCircleDashed, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { SearchCommand } from "./search-command";

export function SidebarHeader() {
    const { open } = useSidebar();
    const [searchOpen, setSearchOpen] = useState(false);

    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <p className="w-full text-center text-lg font-bold">{open ? "Lunex Chat" : "L.C"}</p>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setSearchOpen(true)}>
                        <Search />
                        {open ? (
                            <div className="flex w-full items-center justify-between">
                                <span>Search</span>
                                <kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
                                    <span className="text-xs">⌘</span>K
                                </kbd>
                            </div>
                        ) : (
                            "Search"
                        )}
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link to="/">
                            <Plus />
                            New Chat
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link to="/temp">
                            <MessageCircleDashed />
                            New Temp Chat
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarSeparator />
            </SidebarMenu>

            <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
        </>
    );
}
