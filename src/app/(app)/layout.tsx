import { BottomNav, Sidebar } from "@/components/nav";
import { AppProvider } from "@/components/app-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-dvh bg-[#0a1628]">
        <div className="lg:flex">
          {/* Sidebar — solo desktop */}
          <aside className="hidden lg:block w-56 shrink-0 border-r border-white/10 sticky top-0 h-screen overflow-y-auto">
            <Sidebar />
          </aside>

          {/* Contenido principal */}
          <main className="flex-1 min-w-0 pb-24 lg:pb-10">
            {children}
          </main>
        </div>

        {/* Bottom nav — solo mobile */}
        <BottomNav />
      </div>
    </AppProvider>
  );
}
