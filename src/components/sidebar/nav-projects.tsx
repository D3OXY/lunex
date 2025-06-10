"use client";

import { CreateProjectDialog } from "@/components/project/CreateProjectDialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpace } from "@/context/SpaceContext";
import { convexQuery } from "@convex-dev/react-query";
import { CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/cvx/_generated/api";
import { ChevronRight, LayoutList, Plus, Settings, WandSparkles } from "lucide-react";
import Link from "next/link";

export default function NavProjects() {
    const { currentSpace } = useSpace();
    const { data, isLoading } = useQuery(
        convexQuery(api.project.getSpaceProjects, {
            spaceId: currentSpace?._id,
        })
    );

    if (isLoading) return <SidebarGroupSkeleton />;

    if (!data) return null;

    return (
        <SidebarMenu>
            <SidebarGroup>
                <SidebarGroupLabel className="flex items-center justify-between">
                    <span>Projects</span>
                    <CreateProjectDialog spaceId={currentSpace?._id}>
                        <Button variant="ghost" size="icon" className="h-fit w-fit cursor-pointer p-1">
                            <Plus />
                        </Button>
                    </CreateProjectDialog>
                </SidebarGroupLabel>
                <SidebarGroupContent>
                    {data.map((item) => (
                        <Collapsible key={item._id} asChild defaultOpen={true} className="group/collapsible">
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton>
                                        <WandSparkles />
                                        <span>{item.name}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        <SidebarMenuSubItem>
                                            <SidebarMenuSubButton asChild>
                                                <Link href={`/d/${currentSpace?.slug}/p/${item._id}/tasks`}>
                                                    <LayoutList />
                                                    <span>Tasks</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                        {["owner", "admin"].includes(item.role) && (
                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton asChild>
                                                    <Link href={`/d/${currentSpace?.slug}/p/${item._id}/settings`}>
                                                        <Settings />
                                                        <span>Manage</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        )}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    ))}
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarMenu>
    );
}

function SidebarGroupSkeleton() {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>
                <Skeleton className="h-4 w-24" />
            </SidebarGroupLabel>
            <SidebarGroupContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
