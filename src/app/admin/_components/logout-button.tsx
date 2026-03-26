"use client";

export function LogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors text-left"
    >
      <span className="text-base w-5 text-center">🚪</span>
      Cerrar sesión
    </button>
  );
}
