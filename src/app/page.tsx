"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LandingPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(
          error.message.includes("Invalid login credentials")
            ? "Email o contraseña incorrectos"
            : error.message
        );
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } else {
      if (!name.trim()) {
        setError("Ingresá tu nombre o apodo");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Si email confirmation está deshabilitado → redirige directo
        // Si está habilitado → mostramos mensaje de confirmación
        setSuccess("¡Cuenta creada! Revisá tu email para confirmar.");
        setLoading(false);
      }
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // Si no hay error, el browser redirige a Google — no necesitamos hacer nada más
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Ingresá tu email primero y después tocá '¿Olvidaste tu contraseña?'");
      return;
    }
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/nueva-contrasena`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Te mandamos un email para resetear la contraseña.");
    }
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#0a1628] px-4">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-green-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-green-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center rounded-3xl bg-gradient-to-br from-green-400 to-green-700 p-4 shadow-lg shadow-green-500/30">
            <span className="text-4xl">⚽</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            ProdeMundial
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Mundial 2026 · USA · MEX · CAN
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
          {/* Tabs */}
          <div className="mb-5 flex rounded-xl bg-white/5 p-1">
            <button
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                mode === "login"
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Ingresar
            </button>
            <button
              onClick={() => switchMode("register")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                mode === "register"
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Google Button */}
          <Button
            variant="google"
            className="w-full mb-4"
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0f1f3d] px-2 text-white/30">o con email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <Input
                type="text"
                placeholder="Tu nombre o apodo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                className="pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-xs text-green-400 hover:text-green-300 transition-colors"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {/* Error / Success feedback */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                <p className="text-xs text-green-300">{success}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "login" ? (
                "Ingresar"
              ) : (
                "Crear cuenta"
              )}
            </Button>
          </form>
        </div>

        {/* Join prode link */}
        <p className="mt-4 text-center text-sm text-white/40">
          ¿Tenés un código de invitación?{" "}
          <Link href="/join" className="text-green-400 font-medium hover:text-green-300 transition-colors">
            Unirme al prode
          </Link>
        </p>

        {/* Demo mode */}
        <div className="mt-3 text-center">
          <a
            href="/demo"
            className="text-xs text-white/25 hover:text-white/50 transition-colors underline underline-offset-2"
          >
            Probar en modo demo (sin cuenta)
          </a>
        </div>
      </div>
    </div>
  );
}
