import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти. Проверьте данные и попробуйте снова.");
    } finally {
      setLoading(false);
    }
  }



  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="font-display text-5xl font-semibold text-brand-primary mb-2">Milkontrol</div>
          <p className="text-brand-muted text-sm">DairyMilk · контроль торговой команды</p>
        </div>

        <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-xs">
          <div className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-4 text-center">
            Или вход по паролю
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-brand-border rounded-xl bg-brand-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="you@dairymilk.kz"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-brand-border rounded-xl bg-brand-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p className="text-status-red text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-primary text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-brand-muted mt-6">MILKONTROL © DairyMilk 2026</p>
      </div>
    </div>
  );
}
