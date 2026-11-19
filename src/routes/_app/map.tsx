import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { fPercent } from "@/lib/format";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/map")({
  component: MapPage,
});

interface Outlet {
  id: number; name: string; address: string;
  latitude: number | null; longitude: number | null;
  region_id: number; employee_id: number;
  employeeName?: string; regionName?: string;
  curAmount: number; prevAmount: number;
  equipmentStatus?: string; problems: string[];
}

function statusColor(o: Outlet): string {
  if (!o.prevAmount) return "#5B6B88";
  const pct = o.curAmount / o.prevAmount - 1;
  if (pct < -0.1) return "#C0505A";
  if (pct < 0) return "#D18B2A";
  return "#3E9468";
}

function MapPage() {
  const { role, regionId } = useSession();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
  const [selOutlet, setSelOutlet] = useState<Outlet | null>(null);
  const [filterRegion, setFilterRegion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (role !== undefined) load(); }, [role, regionId]);
  useEffect(() => { if (!loading) initMap(); return () => { mapRef.current?.remove(); mapRef.current = null; }; }, [loading]);
  useEffect(() => { if (mapRef.current) drawMarkers(); }, [outlets, filterRegion, selOutlet]);

  async function load() {
    setLoading(true);
    const now = new Date();
    const curP = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevP = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-01`;

    let q = supabase.from("retail_outlets").select("id, name, address, latitude, longitude, region_id, employee_id");
    if (role === "rd" && regionId) q = q.eq("region_id", regionId);
    const [{ data: oData }, { data: eData }, { data: rData }, { data: sData }, { data: eqData }] = await Promise.all([
      q,
      supabase.from("employees").select("id, name"),
      supabase.from("regions").select("id, name"),
      supabase.from("sales_records").select("outlet_id, period, amount").in("period", [curP, prevP]),
      supabase.from("equipment").select("outlet_id, status"),
    ]);

    setRegions(rData ?? []);
    const eMap = new Map((eData ?? []).map((e) => [e.id, e.name]));
    const rMap = new Map((rData ?? []).map((r) => [r.id, r.name]));
    const sMap = new Map<number, { cur: number; prev: number }>();
    for (const s of sData ?? []) {
      const x = sMap.get(s.outlet_id) ?? { cur: 0, prev: 0 };
      if (s.period === curP) x.cur += Number(s.amount);
      else x.prev += Number(s.amount);
      sMap.set(s.outlet_id, x);
    }
    const eqMap = new Map((eqData ?? []).map((e) => [e.outlet_id, e.status]));

    const mapped = (oData ?? []).map((o) => {
      const s = sMap.get(o.id) ?? { cur: 0, prev: 0 };
      const eq = eqMap.get(o.id);
      const problems: string[] = [];
      if (eq === "missing") problems.push("Нет ларя");
      if (eq === "installed" && s.cur === 0) problems.push("Ларь без продаж");
      if (s.prev > 0 && s.cur < s.prev * 0.7) problems.push("Падение продаж");
      return { ...o, employeeName: eMap.get(o.employee_id), regionName: rMap.get(o.region_id), curAmount: s.cur, prevAmount: s.prev, equipmentStatus: eq, problems } as Outlet;
    });
    setOutlets(mapped);
    setLoading(false);
  }

  function initMap() {
    if (!containerRef.current || mapRef.current) return;
    import("leaflet").then((L) => {
      const map = L.map(containerRef.current!, { center: [48, 68], zoom: 5 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      mapRef.current = map;
      drawMarkers();
    });
  }

  function drawMarkers() {
    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      mapRef.current.eachLayer((l: any) => { if (!l._url) mapRef.current!.removeLayer(l); });
      const visible = outlets.filter((o) => o.latitude && o.longitude && (filterRegion == null || o.region_id === filterRegion));
      for (const o of visible) {
        const c = statusColor(o);
        const hasProblem = ["missing", "idle"].includes(o.equipmentStatus ?? "");
        if (hasProblem) {
          L.circle([o.latitude!, o.longitude!], { radius: 2000, color: "#192338", weight: 1.5, dashArray: "4 4", fill: false }).addTo(mapRef.current!);
        }
        L.circleMarker([o.latitude!, o.longitude!], {
          radius: selOutlet?.id === o.id ? 12 : 9,
          fillColor: c, color: "#fff", weight: 2, opacity: 1, fillOpacity: 1,
        }).addTo(mapRef.current!).on("click", () => setSelOutlet(o));
      }
    });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl font-semibold">Карта</h1>
        <p className="text-brand-muted text-sm mt-1">Торговые точки · DairyMilk</p>
      </div>

      {(role === "sd" || role === "ceo") && (
        <div className="flex flex-wrap gap-2">
          {[{ id: null, name: "Все регионы" }, ...regions].map((r) => (
            <button key={r.id ?? "all"} onClick={() => setFilterRegion(r.id as number | null)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${filterRegion === r.id ? "bg-brand-primary text-white border-brand-primary" : "border-brand-border text-foreground"}`}>
              {r.name}
            </button>
          ))}
        </div>
      )}

      <div className={`grid gap-4 ${selOutlet ? "md:grid-cols-[1fr_320px]" : ""}`}>
        <div className="bg-white border border-brand-border rounded-2xl overflow-hidden">
          <div ref={containerRef} style={{ height: 500 }} />
          <div className="px-4 py-2 text-xs text-brand-muted flex gap-4 flex-wrap">
            <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-status-red mr-1 align-middle" />падение &gt;10%</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-status-amber mr-1 align-middle" />−10…0%</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-status-green mr-1 align-middle" />рост</span>
            <span>◌ проблема с ларём</span>
          </div>
        </div>

        {selOutlet && (
          <div className="bg-white border border-brand-border rounded-2xl p-5 self-start">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-base">{selOutlet.name}</h3>
              <button onClick={() => setSelOutlet(null)} className="text-brand-muted text-xl leading-none ml-2">×</button>
            </div>
            <p className="text-xs text-brand-muted mb-4">{selOutlet.regionName} · {selOutlet.employeeName}</p>
            <div className="space-y-3 mb-4">
              <BarRow label="Прошлый" width={100} color="#8FB3E2" />
              <BarRow label="Сейчас" width={selOutlet.prevAmount ? Math.min(100, (selOutlet.curAmount / selOutlet.prevAmount) * 100) : 0} color={statusColor(selOutlet)} />
              {selOutlet.prevAmount > 0 && (
                <div className="text-sm font-medium" style={{ color: statusColor(selOutlet) }}>{fPercent(selOutlet.curAmount / selOutlet.prevAmount - 1)}</div>
              )}
            </div>
            <div className="text-xs text-brand-muted mb-1">Ларь</div>
            <div className="text-sm font-medium mb-3">
              {({ installed: "Установлен ✓", missing: "Нет ларя", under_inspection: "На проверке", not_verified: "Не проверен" } as Record<string, string>)[selOutlet.equipmentStatus ?? ""] ?? "—"}
            </div>
            {selOutlet.problems.length > 0
              ? selOutlet.problems.map((p) => <div key={p} className="border-l-2 border-status-red pl-2 text-sm mb-1">{p}</div>)
              : <div className="text-sm text-status-green font-medium">Проблем нет ✓</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function BarRow({ label, width, color }: { label: string; width: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-brand-muted w-14">{label}</span>
      <div className="flex-1 h-2 bg-brand-border rounded-full overflow-hidden">
        <div className="h-full rounded-full progress-bar-animate" style={{ width: width + "%", backgroundColor: color }} />
      </div>
    </div>
  );
}
