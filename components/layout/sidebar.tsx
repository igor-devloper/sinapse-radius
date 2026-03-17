"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  ShieldCheck,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, cargos: ["ADMIN", "SUPERVISOR", "TECNICO", "VISUALIZADOR"] },
  { label: "Ordens de Serviço", href: "/ordens", icon: ClipboardList, cargos: ["ADMIN", "SUPERVISOR", "TECNICO", "VISUALIZADOR"] },
  { label: "Calendário", href: "/calendario", icon: CalendarDays, cargos: ["ADMIN", "SUPERVISOR", "TECNICO", "VISUALIZADOR"] },
  { label: "Administração", href: "/admin", icon: ShieldCheck, cargos: ["ADMIN"] },
];

export default function Sidebar({ cargo }: { cargo: string }) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => item.cargos.includes(cargo));

  return (
    <aside className="w-60 h-full bg-white border-r border-gray-100 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          {/* Ícone "sinapse" simplificado */}
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">RS</span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-900">Radius</p>
            <p className="text-xs text-violet-600 font-medium -mt-0.5">Sinapse</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-violet-50 text-violet-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-violet-600" : "text-gray-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Cargo badge */}
      <div className="px-4 pb-4">
        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="text-xs text-gray-400">Cargo</p>
          <p className="text-xs font-medium text-gray-700 mt-0.5 capitalize">{cargo.toLowerCase()}</p>
        </div>
      </div>
    </aside>
  );
}
