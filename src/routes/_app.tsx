import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";
import { ROLE_LABELS, ROLE_NAV, canDownloadReports } from "@/lib/roles";
import {
  LayoutDashboard, Map, Users, Bell, Camera, Truck, Target, Trophy,
  LogOut, Download, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";

const ICON_MAP: Record<string, ReactNode> = {
  "layout-dashboard": <LayoutDashboard size={18} />,
  "map": <Map size={18} />,
  "users": <Users size={18} />,
  "bell": <Bell size={18} />,
  "camera": <Camera size={18} />,
  "truck": <Truck size={18} />,
  "target": <Target size={18} />,
  "trophy": <Trophy size={18} />,
};

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, role, loading } = useSession();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <Loader2 className="animate-spin text-brand-primary" size={36} />
      </div>
    );
  }

  if (!user) {
    navigate({ to: "/auth/login" });
    return null;
  }

  const navItems = role ? ROLE_NAV[role] : [];

  async function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("milkontrol_demo_session");
    }
    await supabase.auth.signOut();
    navigate({ to: "/auth/login" });
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="w-56 bg-brand-navy text-sidebar-foreground flex flex-col flex-none sticky top-0 h-screen max-md:hidden">
        <div className="font-display text-2xl font-semibold text-white px-4 py-5">
          Milkontrol
        </div>
        <nav className="flex flex-col gap-1 px-2 flex-1">
          {navItems.map((item) => {
            const path = item.key ? `/${item.key}` : "/";
            return (
              <Link
                key={item.key || "overview"}
                to={path}
                activeProps={{ className: "bg-brand-primary text-white" }}
                inactiveProps={{ className: "text-sidebar-foreground hover:bg-sidebar-accent" }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors"
              >
                {ICON_MAP[item.icon] ?? null}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 text-xs text-sidebar-foreground/60 border-t border-sidebar-border">
          {role ? ROLE_LABELS[role] : ""}
          <br />
          <span className="truncate block">{user.email}</span>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-brand-border px-8 py-4 flex items-center justify-between gap-4 flex-wrap max-md:px-4">
          <div className="font-display text-xl font-semibold text-foreground">
            DairyMilk
          </div>
          <div className="flex gap-2 ml-auto">
            {canDownloadReports(role) && (
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm hover:opacity-90 transition-opacity"
              >
                <Download size={15} />
                <span className="max-sm:hidden">Скачать отчёт</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-border text-sm text-foreground hover:bg-brand-bg transition-colors"
            >
              <LogOut size={15} />
              <span className="max-sm:hidden">Выйти</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 max-md:p-4 max-md:pb-20">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-brand-navy z-20 flex md:hidden pb-safe">
        {navItems.map((item) => {
          const path = item.key ? `/${item.key}` : "/";
          return (
            <Link
              key={item.key || "overview"}
              to={path}
              className="flex-1 flex flex-col items-center gap-1 py-2 text-sidebar-foreground/70 text-xs"
              activeProps={{ className: "flex-1 flex flex-col items-center gap-1 py-2 text-white text-xs" }}
            >
              {ICON_MAP[item.icon] ?? null}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

async function downloadReport() {
  const sb = supabase;
  const [outlets, alerts] = await Promise.all([
    sb.from("retail_outlets").select("id, name, address"),
    sb.from("alerts").select("kind, priority, title, detected_at").neq("status", "resolved").order("detected_at", { ascending: false }),
  ]);
  const date = new Date().toLocaleDateString("ru-KZ");
  const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Milkontrol отчёт</title>
<style>body{font:15px Georgia,serif;max-width:820px;margin:40px auto;color:#192338;padding:0 20px}h1{font-size:34px;font-family:'Cormorant Garamond',serif}h2{border-bottom:1px solid #8FB3E2;padding-bottom:4px;margin-top:28px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #D9E1F1;padding:8px;text-align:left}th{color:#5B6B88;font-size:12px}</style>
<h1>Milkontrol · Отчёт DairyMilk</h1><p>Дата: ${date}</p>
<h2>Активные сигналы (${alerts.data?.length ?? 0})</h2>
<table><tr><th>Тип</th><th>Приоритет</th><th>Заголовок</th></tr>
${(alerts.data ?? []).map((a) => `<tr><td>${a.kind}</td><td>${a.priority}</td><td>${a.title}</td></tr>`).join("")}
</table>
<h2>Торговые точки (${outlets.data?.length ?? 0})</h2>
<table><tr><th>Название</th><th>Адрес</th></tr>
${(outlets.data ?? []).map((o) => `<tr><td>${o.name}</td><td>${o.address}</td></tr>`).join("")}
</table></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `milkontrol-report-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
