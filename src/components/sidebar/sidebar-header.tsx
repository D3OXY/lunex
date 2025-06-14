"use client";

import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Plus, Search } from "lucide-react";
import Image from "next/image";
import { useNavigate } from "react-router-dom";

export function SidebarHeader() {
    const { open } = useSidebar();
    const navigate = useNavigate();
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <div className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex items-center justify-between">
                    <Image src="/logo.svg" alt="Lunex" width={50} height={50} />
                    {open && (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon">
                                <Search />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="New Chat">
                                <Plus />
                            </Button>
                        </div>
                    )}
                </div>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
