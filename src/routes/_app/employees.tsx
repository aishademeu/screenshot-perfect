import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { calculateKPI, calculateBonus } from "@/lib/roles";
import { fPct } from "@/lib/format";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/employees")({
  component: EmployeesPage,
});

interface EmpRow { id: number; name: string; region: string; planPct: number; visitsPct: number; photoPct: number; kpi: number; bonus: number }

function BarCell({ v, warn = 70 }: { v: number; warn?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-brand-border rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: Math.min(v, 100) + "%", backgroundColor: v < warn ? "#C0505A" : "#3E9468" }} />
      </div>
      <span className="text-sm">{fPct(v)}</span>
    </div>
  );
}

function EmployeesPage() {
  const { role, regionId } = useSession();
  const [rows, setRows] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (role) load(); }, [role, regionId]);

  async function load() {
    setLoading(true);
    const now = new Date();
    const curP = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    let q = supabase.from("employees").select("id, name, region_id, photo_discipline");
    if (role === "rd" && regionId) q = q.eq("region_id", regionId);
    const { data: emps } = await q;
    const { data: regs } = await supabase.from("regions").select("id, name");
    const rMap = new Map((regs ?? []).map((r) => [r.id, r.name]));

    const empRows: EmpRow[] = [];
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
      const kpi = calculateKPI(planPct, visitsPct, photoPct);
      empRows.push({ id: emp.id, name: emp.name, region: rMap.get(emp.region_id) ?? "—", planPct, visitsPct, photoPct, kpi, bonus: calculateBonus(kpi) });
    }
    empRows.sort((a, b) => b.kpi - a.kpi);
    setRows(empRows);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl font-semibold">Сотрудники</h1>
        <p className="text-brand-muted text-sm mt-1">KPI = 50% план + 30% визиты + 20% дисциплина фото</p>
      </div>
      <div className="bg-white border border-brand-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>{["Торгпред", "Регион", "План %", "Визиты %", "Фото %", "KPI", "Премия ₸"].map((h) => (
                <th key={h} className="text-left text-xs font-medium text-brand-muted px-4 py-3 border-b border-brand-border whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-brand-border last:border-0 hover:bg-brand-bg">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-brand-muted">{r.region}</td>
                  <td className="px-4 py-3"><BarCell v={r.planPct} /></td>
                  <td className="px-4 py-3"><BarCell v={r.visitsPct} /></td>
                  <td className="px-4 py-3"><BarCell v={r.photoPct} /></td>
                  <td className="px-4 py-3 font-display text-xl font-semibold">{r.kpi}</td>
                  <td className="px-4 py-3">{r.bonus > 0 ? r.bonus.toLocaleString("ru") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-brand-muted italic">Премия: KPI × 3 000 ₸ при KPI ≥ 70. Настраиваемые коэффициенты.</p>
    </div>
  );
}
