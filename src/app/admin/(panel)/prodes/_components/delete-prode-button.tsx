"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteProdeButton({ prodeId, prodeName }: { prodeId: string; prodeName: string }) {
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar el prode "${prodeName}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/prodes/${prodeId}`, { method: "DELETE" });
    if (res.ok) {
      setDeleted(true);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Error al eliminar prode");
    }
    setLoading(false);
  };

  if (deleted) {
    return <span className="text-xs text-white/20">Eliminado</span>;
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
      title="Eliminar prode"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}
