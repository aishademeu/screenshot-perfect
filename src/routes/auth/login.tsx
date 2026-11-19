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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      navigate({ to: "/" });
    }
    setLoading(false);
  }

  const DEMO_ROLES = [
    { role: "ceo", name: "Асхат Нурланов", title: "Генеральный директор", email: "ceo@dairymilk.kz" },
    { role: "sd", name: "Гульнара Ахметова", title: "Директор продаж", email: "sd@dairymilk.kz" },
    { role: "rd", name: "Марат Сейтов", title: "Региональный директор (Алматы)", email: "rd.almaty@dairymilk.kz", region_id: 1 },
    { role: "rep", name: "Ерлан К.", title: "Торгпред (Алматы)", email: "rep.erlan@dairymilk.kz", region_id: 1, employee_id: 1 },
  ];

  function loginAsDemo(demo: typeof DEMO_ROLES[0]) {
    localStorage.setItem("milkontrol_demo_session", JSON.stringify({
      id: "demo-" + demo.role,
      email: demo.email,
      role: demo.role,
      region_id: (demo as any).region_id ?? null,
      employee_id: (demo as any).employee_id ?? null,
    }));
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="font-display text-5xl font-semibold text-brand-primary mb-2">Milkontrol</div>
          <p className="text-brand-muted text-sm">DairyMilk · контроль торговой команды</p>
        </div>

        {/* Demo role quick-switch cards */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-2 text-center">
            Быстрый вход в роли (демо)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((d) => (
              <button
                key={d.role}
                onClick={() => loginAsDemo(d)}
                className="bg-white border border-brand-border rounded-xl p-3 text-left hover:border-brand-primary hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="font-semibold text-sm text-foreground">{d.title}</div>
                <div className="text-xs text-brand-muted">{d.name}</div>
              </button>
            ))}
          </div>
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
