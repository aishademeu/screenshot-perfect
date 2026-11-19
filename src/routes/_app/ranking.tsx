import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { calculateKPI, calculateBonus } from "@/lib/roles";
import { fPct } from "@/lib/format";
import { Trophy, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/ranking")({
  component: RankingPage,
});

interface RankRow { id: number; name: string; kpi: number; planPct: number; visitsPct: number; photoPct: number }

function RankingPage() {
  const { employeeId } = useSession();
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [employeeId]);

  async function load() {
    setLoading(true);
    const now = new Date();
    const curP = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data: emps } = await supabase.from("employees").select("id, name, photo_discipline");
    const all: RankRow[] = [];
    for (const emp of emps ?? []) {
      const { data: oList } = await supabase.from("retail_outlets").select("id").eq("employee_id", emp.id);
      const ids = (oList ?? []).map((o) => o.id);
      const { data: sales } = await supabase.from("sales_records").select("amount, plan").in("outlet_id", ids.length ? ids : [0]).eq("period", curP);
      const { data: planned } = await supabase.from("planned_visits").select("completed_at").in("outlet_id", ids.length ? ids : [0]);
      const totalAmt = (sales ?? []).reduce((a, b) => a + Number(b.amount), 0);
      const totalPlan = (sales ?? []).reduce((a, b) => a + Number(b.plan), 0);
      const planPct = totalPlan > 0 ? Math.round((totalAmt / totalPlan) * 100) : 0;
      const totalPl = (planned ?? []).length;
      const donePl = (planned ?? []).filter((v) => v.completed_at).length;
      const visitsPct = totalPl > 0 ? Math.round((donePl / totalPl) * 100) : 0;
      const photoPct = Math.round(Number(emp.photo_discipline) * 100);
      all.push({ id: emp.id, name: emp.name, kpi: calculateKPI(planPct, visitsPct, photoPct), planPct, visitsPct, photoPct });
    }
    all.sort((a, b) => b.kpi - a.kpi);
    setRows(all);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;

  const myIdx = rows.findIndex((r) => r.id === employeeId);
  const me = rows[myIdx];
  const weakest = me ? Object.entries({ "выполнение плана": me.planPct, "визиты": me.visitsPct, "фото": me.photoPct }).sort((a, b) => a[1] - b[1])[0] : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-semibold">Рейтинг</h1>
        <p className="text-brand-muted text-sm mt-1">Позиция среди торгпредов компании</p>
      </div>

      {me && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Мой KPI", value: String(me.kpi) },
            { label: "Место", value: `${myIdx + 1} из ${rows.length}` },
            { label: "Прогноз премии", value: calculateBonus(me.kpi) > 0 ? calculateBonus(me.kpi).toLocaleString("ru") + " ₸" : "—" },
          ].map((k) => (
            <div key={k.label} className="bg-white border border-brand-border rounded-2xl p-4 text-center">
              <div className="text-xs text-brand-muted mb-1">{k.label}</div>
              <div className="font-display text-2xl font-semibold">{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {weakest && (
        <div className="bg-white border border-brand-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-2">Что подтянуть</h3>
          <p className="text-sm text-foreground">Слабее всего: <b>{weakest[0]}</b> ({fPct(weakest[1])}). Уделите внимание этому показателю для роста KPI.</p>
        </div>
      )}

      <div className="bg-white border border-brand-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>{["#", "Торгпред", "KPI"].map((h) => (
                <th key={h} className="text-left text-xs font-medium text-brand-muted px-4 py-3 border-b border-brand-border">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-brand-border last:border-0 ${r.id === employeeId ? "bg-blue-50" : "hover:bg-brand-bg"}`}>
                  <td className="px-4 py-3">
                    {i === 0 ? <Trophy size={15} className="text-status-amber" /> : i + 1}
                  </td>
                  <td className="px-4 py-3 font-medium">{r.name}{r.id === employeeId ? " (я)" : ""}</td>
                  <td className="px-4 py-3 font-display text-xl font-semibold">{r.kpi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
