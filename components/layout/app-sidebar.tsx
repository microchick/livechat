"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Settings2, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/inbox", label: "收件箱", icon: Inbox },
  { href: "/customers", label: "客户管理", icon: Users },
  { href: "/settings", label: "挂件设置", icon: Settings2 },
];


export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur xl:block">
        <div className="flex h-full flex-col px-5 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">Chat Ops</p>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">客服工作台</h1> 
          </div>

          <nav className="mt-10 space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active ? "bg-blue-600 text-white shadow-soft" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
 
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
        <div className="grid gap-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>

          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition",
                  active ? "bg-blue-600 text-white shadow-soft" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
