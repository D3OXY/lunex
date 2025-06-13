import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useChats } from "@/lib/stores/chat-store";
import { MessageSquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactElement } from "react";

type NavChatsProps = HTMLAttributes<HTMLDivElement>;

export const NavChats = ({ className, ...props }: NavChatsProps): ReactElement => {
  const chats = useChats();
  const pathname = usePathname();

  return (
    <div className={className} {...props}>
      <SidebarMenu>
        {chats.map((chat) => {
          const href = `/chat/${chat._id}`;
          const isActive = pathname === href;

          return (
            <SidebarMenuItem key={chat._id}>
              <SidebarMenuButton
                asChild
                className={cn(
                  "w-full justify-start gap-2",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
              >
                <Link href={href}>
                  <MessageSquareIcon className="h-4 w-4" />
                  {chat.title}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );
};