import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { fmMln, fPercent, fPct } from "@/lib/format";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: OverviewPage,
});

interface KpiCard { label: string; value: string; color?: "red" | "amber" | "green" }

function OverviewPage() {
  const { role, regionId, employeeId } = useSession();
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<KpiCard[]>([]);
  const [trend, setTrend] = useState<{ month: string; amount: number }[]>([]);
  const [regionBars, setRegionBars] = useState<{ name: string; pct: number }[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === "rep") {
      navigate({ to: "/itinerary" });
      return;
    }
    if (role) load();
  }, [role, regionId, employeeId]);

  async function load() {
    setLoading(true);
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
        label: d.toLocaleDateString("ru-KZ", { month: "short" }),
      };
    });
    const curPeriod = months[5].period;
    const prevPeriod = months[4].period;

    let outletQ = supabase.from("retail_outlets").select("id, region_id, employee_id");
    if (role === "rd" && regionId) outletQ = outletQ.eq("region_id", regionId);
    if (role === "rep" && employeeId) outletQ = outletQ.eq("employee_id", employeeId);
    const { data: outlets } = await outletQ;
    const ids = (outlets ?? []).map((o) => o.id);

    const { data: sales } = await supabase
      .from("sales_records").select("outlet_id, period, amount, plan")
      .in("outlet_id", ids.length ? ids : [0]);

    const byPeriod = new Map<string, { amount: number; plan: number }>();
    for (const m of months) byPeriod.set(m.period, { amount: 0, plan: 0 });
    for (const s of sales ?? []) {
      const p = s.period?.slice(0, 7) + "-01";
      if (byPeriod.has(p)) {
        const c = byPeriod.get(p)!;
        byPeriod.set(p, { amount: c.amount + Number(s.amount), plan: c.plan + Number(s.plan) });
      }
    }

    setTrend(months.map((m) => ({ month: m.label, amount: byPeriod.get(m.period)?.amount ?? 0 })));

    const cur = byPeriod.get(curPeriod) ?? { amount: 0, plan: 0 };
    const prevAmt = byPeriod.get(prevPeriod)?.amount ?? 0;
    const planPct = cur.plan > 0 ? Math.round((cur.amount / cur.plan) * 100) : 0;
    const changePct = prevAmt > 0 ? cur.amount / prevAmt - 1 : 0;

    const { data: equip } = await supabase.from("equipment").select("outlet_id, status").in("outlet_id", ids.length ? ids : [0]);
    const withFreezer = (equip ?? []).filter((e) => e.status !== "missing").length;
    const idleIds = (equip ?? []).filter((e) => e.status === "installed").map((e) => e.outlet_id);
    const idleCount = (sales ?? []).filter((s) => idleIds.includes(s.outlet_id) && s.period === curPeriod && Number(s.amount) === 0).length;

    setKpi([
      { label: "Продажи / план", value: `${fmMln(cur.amount)} / ${fmMln(cur.plan)}` },
      { label: "Выполнение плана", value: fPct(planPct), color: planPct < 50 ? "red" : planPct < 70 ? "amber" : "green" },
      { label: "К прошлому периоду", value: fPercent(changePct), color: changePct < 0 ? "red" : "green" },
      { label: "Охват визитами", value: "—" },
      { label: "Точек с ларём", value: fPct((withFreezer / (ids.length || 1)) * 100) },
      { label: "Ларей без продаж", value: String(idleCount) },
    ]);

    if (role === "sd" || role === "ceo") {
      const { data: regions } = await supabase.from("regions").select("id, name");
      const bars = (regions ?? []).map((r) => {
        const rIds = (outlets ?? []).filter((o) => o.region_id === r.id).map((o) => o.id);
        const c = (sales ?? []).filter((s) => rIds.includes(s.outlet_id) && s.period === curPeriod).reduce((a, b) => a + Number(b.amount), 0);
        const p = (sales ?? []).filter((s) => rIds.includes(s.outlet_id) && s.period === prevPeriod).reduce((a, b) => a + Number(b.amount), 0);
        return p > 0 ? { name: r.name, pct: Math.round((c / p - 1) * 100) } : null;
      }).filter(Boolean) as { name: string; pct: number }[];
      bars.sort((a, b) => b.pct - a.pct);
      setRegionBars(bars);
    }

    let alertQ = supabase.from("alerts").select("id, title, kind, priority").neq("status", "resolved").order("detected_at", { ascending: false }).limit(8);
    if (role === "rd" && regionId) alertQ = alertQ.eq("region_id", regionId);
    const { data: alertsData } = await alertQ;
    setAlerts(alertsData ?? []);

    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;

  const colorClass = { red: "text-status-red", amber: "text-status-amber", green: "text-status-green" };
  const priorityBadge: Record<string, string> = {
    critical: "bg-red-50 text-status-red border border-red-200",
    high: "bg-orange-50 text-status-amber border border-orange-200",
    medium: "bg-blue-50 text-brand-primary border border-blue-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Обзор</h1>
        <p className="text-brand-muted text-sm mt-1">DairyMilk · аналитика</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpi.map((k) => (
          <div key={k.label} className="bg-white border border-brand-border rounded-2xl p-4">
            <div className="text-xs text-brand-muted mb-1">{k.label}</div>
            <div className={`font-display text-2xl font-semibold ${k.color ? colorClass[k.color] : "text-foreground"}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-brand-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4">Динамика продаж</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5B6B88" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v: number) => [fmMln(v), "Продажи"]} contentStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="amount" stroke="#31487A" strokeWidth={2.5} dot={{ r: 4, fill: "#31487A" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {regionBars.length > 0 ? (
          <div className="bg-white border border-brand-border rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-4">Регионы: изменение продаж</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={regionBars} layout="vertical" margin={{ left: 70 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v + "%"} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#5B6B88" }} axisLine={false} tickLine={false} width={65} />
                <Tooltip formatter={(v: number) => [v + "%", "Изменение"]} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="pct" radius={4}>
                  {regionBars.map((e, i) => <Cell key={i} fill={e.pct >= 0 ? "#3E9468" : "#C0505A"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white border border-brand-border rounded-2xl p-5 flex items-center justify-center text-brand-muted text-sm">Нет данных по регионам</div>
        )}
      </div>

      <div className="bg-white border border-brand-border rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <AlertCircle size={15} className="text-status-red" /> Активные сигналы
        </h3>
        {alerts.length === 0 ? (
          <p className="text-brand-muted text-sm text-center py-4">Активных сигналов нет</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-brand-border last:border-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge[a.priority] ?? priorityBadge.medium}`}>{a.priority}</span>
                <div className="flex-1 text-sm">{a.title}</div>
                <span className="text-xs text-brand-muted">{a.kind}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
