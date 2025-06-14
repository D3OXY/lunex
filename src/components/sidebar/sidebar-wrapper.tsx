import Navbar from "@/components/sidebar/navbar";
import { NavChats } from "@/components/sidebar/nav-chats";
import { SidebarHeader as Header } from "@/components/sidebar/sidebar-header";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "19rem",
                } as React.CSSProperties
            }
            className="bg-muted h-[calc(100vh-1rem)] p-2 lg:p-4"
        >
            <Sidebar variant="floating" collapsible="icon">
                <SidebarHeader>
                    <Header />
                </SidebarHeader>
                <SidebarContent>
                    <NavChats />
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <Link to="/settings">
                                    <Settings />
                                    Manage
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset className="bg-muted flex w-full flex-1 flex-col gap-2 lg:gap-4">
                <Navbar />
                <div className="bg-background flex flex-1 flex-col gap-4 overflow-x-auto rounded-lg p-2 lg:p-4">{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}
