"use client";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from "@/components/ui/sidebar";
import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";

export function SidebarHeader() {
    const { open } = useSidebar();
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <p className="w-full text-center text-lg font-bold">{open ? "Lunex Chat" : "L.C"}</p>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton>
                    <Search />
                    Search
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
            <SidebarSeparator />
        </SidebarMenu>
    );
}
