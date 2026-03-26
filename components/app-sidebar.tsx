"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    cargos: ["ADMIN", "SUPERVISOR", "TECNICO", "VISUALIZADOR"],
  },
  {
    label: "Ordens de Serviço",
    href: "/ordens",
    icon: ClipboardList,
    cargos: ["ADMIN", "SUPERVISOR", "TECNICO", "VISUALIZADOR"],
  },
  {
    label: "Calendário",
    href: "/calendario",
    icon: CalendarDays,
    cargos: ["ADMIN", "SUPERVISOR", "TECNICO", "VISUALIZADOR"],
  },
  {
    label: "Administração",
    href: "/admin",
    icon: ShieldCheck,
    cargos: ["ADMIN"],
  },
];

interface AppSidebarProps {
  cargo: string;
  nome: string;
}

export function AppSidebar({ cargo, nome }: AppSidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) =>
    item.cargos.includes(cargo)
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="relative w-full h-8 group-data-[collapsible=icon]:hidden mb-10 mr-10 justify-center">
            <div className="overflow-hidden rounded-md">
              <Image
                src="/logo.png"
                alt="Radius Sinapse"
                className="object-contain object-left"
                priority
                width={200}
                height={200}
              />
            </div>
          </div>
          {/* Icon mode: show initials */}
          <div className="hidden group-data-[collapsible=icon]:flex w-8 h-8 rounded-lg bg-sidebar-primary items-center justify-center shrink-0">
            <span className="text-sidebar-primary-foreground text-xs font-bold">RS</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      size="default"
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="rounded-lg bg-sidebar-accent px-3 py-2.5 group-data-[collapsible=icon]:hidden">
          <p className="text-xs text-sidebar-foreground/60">Cargo</p>
          <p className="text-xs font-medium text-sidebar-foreground mt-0.5 capitalize">
            {cargo.toLowerCase()}
          </p>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex w-8 h-8 rounded-lg bg-sidebar-accent items-center justify-center mx-auto">
          <span className="text-sidebar-foreground text-xs font-bold">
            {cargo.charAt(0)}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}