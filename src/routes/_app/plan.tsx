import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { fmMln, fPct } from "@/lib/format";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/plan")({
  component: PlanPage,
});

function PlanPage() {
  const { employeeId } = useSession();
  const [period, setPeriod] = useState(1);
  const [data, setData] = useState<{ cur: number; plan: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (employeeId) load(); }, [employeeId, period]);

  async function load() {
    setLoading(true);
    const now = new Date();
    const months: string[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    }
    const { data: outlets } = await supabase.from("retail_outlets").select("id").eq("employee_id", employeeId!);
    const ids = (outlets ?? []).map((o) => o.id);
    const { data: sales } = await supabase.from("sales_records").select("amount, plan").in("outlet_id", ids.length ? ids : [0]).in("period", months);
    const cur = (sales ?? []).reduce((a, b) => a + Number(b.amount), 0);
    const plan = (sales ?? []).reduce((a, b) => a + Number(b.plan), 0);
    setData({ cur, plan });
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;

  const pct = data && data.plan > 0 ? Math.min(Math.round((data.cur / data.plan) * 100), 100) : 0;
  const circumference = 2 * Math.PI * 50;
  const dash = (pct / 100) * circumference;
  const color = pct < 50 ? "#C0505A" : pct < 70 ? "#D18B2A" : "#3E9468";
  const gap = data ? Math.max(0, data.plan - data.cur) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-semibold">План</h1>
        <p className="text-brand-muted text-sm mt-1">Выполнение плана продаж</p>
      </div>
      <div className="flex gap-2">
        {[[1, "Месяц"], [6, "6 месяцев"], [12, "Год"]].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v as number)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${period === v ? "bg-brand-primary text-white border-brand-primary" : "border-brand-border text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-brand-border rounded-2xl p-6 flex justify-center">
          <svg viewBox="0 0 120 120" width={200} height={200}>
            <circle cx={60} cy={60} r={50} fill="none" stroke="var(--color-border)" strokeWidth={12} />
            <circle cx={60} cy={60} r={50} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`} transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dasharray 0.6s ease-out" }} />
            <text x={60} y={68} textAnchor="middle" fontSize={26} fill="var(--color-foreground)" fontFamily="'Cormorant Garamond', serif">{pct}%</text>
          </svg>
        </div>
        <div className="space-y-3">
          {[
            { label: "Факт", value: fmMln(data?.cur ?? 0) },
            { label: "План", value: fmMln(data?.plan ?? 0) },
            { label: pct >= 100 ? "Запас" : "Не хватает", value: fmMln(gap) },
          ].map((k) => (
            <div key={k.label} className="bg-white border border-brand-border rounded-2xl p-4">
              <div className="text-xs text-brand-muted mb-1">{k.label}</div>
              <div className="font-display text-2xl font-semibold text-foreground">{k.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
