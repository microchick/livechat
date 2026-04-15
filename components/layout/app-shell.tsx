import { AppSidebar } from "@/components/layout/app-sidebar";


export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50 text-slate-900">
      <AppSidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-24 pt-4 lg:px-8 lg:pb-6 lg:pt-6">{children}</div>
      </main>
    </div>
  );

}
