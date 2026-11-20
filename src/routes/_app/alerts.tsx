import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { canAssignTasks } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_app/alerts")({
  component: AlertsPage,
});

interface Alert {
  id: string; condition_key: string; kind: string; title: string;
  priority: string; region_id: number; employee_id: number; outlet_id: number | null;
  evidence: any; status: string; detected_at: string;
  employeeName?: string; regionName?: string; outletName?: string;
}

interface Task {
  id: string; alert_id: string; assigned_employee_id: number;
  deadline: string; status: string; resolution: string | null;
  employeeName?: string;
}

const KIND_LABEL: Record<string, string> = {
  missed_visits: "Пропущенные визиты",
  sales_drop: "Падение продаж",
  missing_freezer: "Отсутствие ларя",
  freezer_without_sales: "Ларь без продаж",
  low_plan: "Невыполнение плана",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-50 text-status-red border border-red-200",
  high: "bg-orange-50 text-status-amber border border-orange-200",
  medium: "bg-blue-50 text-brand-primary border border-blue-200",
};

function AlertsPage() {
  const { role, regionId } = useSession();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"alerts" | "tasks">("alerts");
  const [assignModal, setAssignModal] = useState<Alert | null>(null);
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);
  const [taskForm, setTaskForm] = useState({ employeeId: 0, deadline: "" });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { if (role) load(); }, [role, regionId]);

  async function load() {
    setLoading(true);
    let aq = supabase.from("alerts").select("*").order("detected_at", { ascending: false });
    if (role === "rd" && regionId) aq = aq.eq("region_id", regionId);

    let eq = supabase.from("employees").select("id, name");
    if (role === "rd" && regionId) eq = eq.eq("region_id", regionId);

    const [{ data: aData }, { data: eData }, { data: rData }, { data: oData }, { data: tData }] = await Promise.all([
      aq, eq,
      supabase.from("regions").select("id, name"),
      supabase.from("retail_outlets").select("id, name"),
      supabase.from("tasks").select("*"),
    ]);

    const eMap = new Map((eData ?? []).map((e) => [e.id, e.name]));
    const rMap = new Map((rData ?? []).map((r) => [r.id, r.name]));
    const oMap = new Map((oData ?? []).map((o) => [o.id, o.name]));

    setAlerts((aData ?? []).map((a) => ({
      ...a,
      employeeName: eMap.get(a.employee_id),
      regionName: rMap.get(a.region_id),
      outletName: a.outlet_id ? oMap.get(a.outlet_id) : undefined,
    })));
    setTasks((tData ?? []).map((t) => ({ ...t, employeeName: eMap.get(t.assigned_employee_id) })));
    setEmployees(eData ?? []);
    setLoading(false);
  }

  async function resolveAlert(id: string) {
    setActionError(null);
    const { error } = await supabase.from("alerts").update({ status: "resolved" }).eq("id", id);
    if (error) {
      setActionError("Не удалось закрыть сигнал: " + error.message);
      return;
    }
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "resolved" } : a));
  }

  async function assignTask() {
    if (!assignModal || !taskForm.employeeId || !taskForm.deadline) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const { error: alertError } = await supabase
        .from("alerts")
        .update({ status: "in_progress" })
        .eq("id", assignModal.id);
      if (alertError) throw alertError;

      const { error: taskError } = await supabase.from("tasks").upsert({
        alert_id: assignModal.id,
        assigned_employee_id: taskForm.employeeId,
        deadline: new Date(taskForm.deadline).toISOString(),
        status: "assigned",
      }, { onConflict: "alert_id" });
      if (taskError) throw taskError;

      setAssignModal(null);
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось назначить задачу.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-semibold">Сигналы</h1>
        <p className="text-brand-muted text-sm mt-1">Автоматически обнаруженные проблемы</p>
      </div>

      {actionError && <p role="alert" className="text-sm text-status-red bg-red-50 border border-red-200 rounded-xl px-4 py-3">{actionError}</p>}

      <div className="flex gap-2 border-b border-brand-border">
        {[["alerts", "Сигналы"], ["tasks", "Задачи"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-brand-primary text-brand-primary" : "border-transparent text-brand-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "alerts" && (
        <div className="space-y-3">
          {alerts.length === 0 && <p className="text-brand-muted text-sm text-center py-8">Нет активных сигналов</p>}
          {alerts.map((a) => (
            <div key={a.id} className={`bg-white border border-brand-border rounded-2xl p-4 ${a.status === "resolved" ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${PRIORITY_BADGE[a.priority] ?? PRIORITY_BADGE.medium}`}>{a.priority}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-brand-muted mt-1">
                    {KIND_LABEL[a.kind] ?? a.kind} · {a.regionName} · {a.employeeName}
                    {a.outletName && ` · ${a.outletName}`}
                  </div>
                  <div className="text-xs text-brand-muted mt-0.5">Обнаружен: {formatDate(a.detected_at)}</div>
                  {a.evidence && typeof a.evidence === "object" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(a.evidence as Record<string, any>).map(([k, v]) => (
                        <span key={k} className="text-xs bg-brand-bg border border-brand-border rounded-lg px-2 py-0.5">
                          {k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end flex-none">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${a.status === "resolved" ? "bg-green-50 text-status-green border-green-200" : "bg-brand-bg border-brand-border text-brand-muted"}`}>
                    {a.status}
                  </span>
                  {canAssignTasks(role) && a.status !== "resolved" && (
                    <button onClick={() => { setAssignModal(a); setTaskForm({ employeeId: a.employee_id, deadline: "" }); }}
                      className="text-xs px-3 py-1.5 bg-brand-primary text-white rounded-lg hover:opacity-90">
                      Назначить
                    </button>
                  )}
                  {canAssignTasks(role) && a.status !== "resolved" && (
                    <button onClick={() => resolveAlert(a.id)}
                      className="text-xs px-3 py-1.5 border border-brand-border rounded-lg text-brand-muted hover:border-brand-primary">
                      Решено
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-3">
          {tasks.length === 0 && <p className="text-brand-muted text-sm text-center py-8">Нет задач</p>}
          {tasks.map((t) => (
            <div key={t.id} className="bg-white border border-brand-border rounded-2xl p-4 flex items-center gap-3">
              {t.status === "resolved" ? <CheckCircle size={18} className="text-status-green flex-none" /> : <AlertCircle size={18} className="text-status-amber flex-none" />}
              <div className="flex-1">
                <div className="text-sm font-medium">{t.employeeName}</div>
                <div className="text-xs text-brand-muted">Срок: {formatDate(t.deadline)} · Статус: {t.status}</div>
                {t.resolution && <div className="text-xs text-brand-muted mt-1">Решение: {t.resolution}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-base">Назначить задачу</h3>
            <p className="text-sm text-brand-muted">{assignModal.title}</p>
            <div>
              <label className="text-xs text-brand-muted block mb-1">Исполнитель</label>
              <select value={taskForm.employeeId} onChange={(e) => setTaskForm((f) => ({ ...f, employeeId: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-brand-border rounded-xl text-sm bg-brand-bg">
                <option value={0}>Выберите сотрудника</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-brand-muted block mb-1">Срок</label>
              <input type="date" value={taskForm.deadline} onChange={(e) => setTaskForm((f) => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2 border border-brand-border rounded-xl text-sm bg-brand-bg" />
            </div>
            <div className="flex gap-2">
              <button onClick={assignTask} disabled={submitting || !taskForm.employeeId || !taskForm.deadline}
                className="flex-1 bg-brand-primary text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90">
                {submitting ? "..." : "Назначить"}
              </button>
              <button onClick={() => setAssignModal(null)}
                className="flex-1 border border-brand-border py-2.5 rounded-xl text-sm text-foreground hover:bg-brand-bg">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
