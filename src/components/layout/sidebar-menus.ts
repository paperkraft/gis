import { FolderOpen, LucideIcon, MailPlus, Users, Wallet } from "lucide-react";

interface SidebarMenu {
    title: string;
    href: string;
    icon: LucideIcon;
    exact?: boolean;
}

export const sidebarMenus: SidebarMenu[] = [
    { title: "Projects", href: "/", icon: FolderOpen, exact: true },
    { title: "Shared with me", href: "/shared-projects", icon: Users },
    { title: "Invitations", href: "/invitation", icon: MailPlus },
    { title: "Subscription", href: "/subscription", icon: Wallet },
]