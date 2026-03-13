import { BottomNav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0a1628]">
      <div className="pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}
