import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import { Authenticated } from "convex/react";
import { Bell } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="bg-background flex h-16 shrink-0 items-center justify-between gap-2 rounded-lg px-4">
      <div className="flex h-16 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">Lunex</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
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
