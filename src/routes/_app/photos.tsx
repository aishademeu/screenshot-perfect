import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { canReviewPhotos } from "@/lib/roles";
import { formatDate, formatTime } from "@/lib/format";
import { Camera, CheckCircle, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/photos")({
  component: PhotosPage,
});

interface PhotoReport {
  id: string; outlet_id: number; visit_id: string | null; user_id: string;
  storage_path: string; status: string; rejection_reason: string | null;
  created_at: string; outletName?: string; url?: string;
}

function PhotosPage() {
  const { role, regionId } = useSession();
  const canReview = canReviewPhotos(role);
  const [photos, setPhotos] = useState<PhotoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { if (role) load(); }, [role, regionId]);

  async function load() {
    setLoading(true);
    let oq = supabase.from("retail_outlets").select("id, name");
    if (role === "rd" && regionId) oq = oq.eq("region_id", regionId);
    const { data: outlets, error: outletsError } = await oq;
    if (outletsError) {
      setActionError("Не удалось загрузить торговые точки: " + outletsError.message);
      setLoading(false);
      return;
    }
    const oMap = new Map((outlets ?? []).map((o) => [o.id, o.name]));
    const oids = (outlets ?? []).map((o) => o.id);

    const { data: pData, error: photosError } = await supabase
      .from("photo_reports").select("*")
      .in("outlet_id", oids.length ? oids : [0])
      .order("created_at", { ascending: false }).limit(50);
    if (photosError) {
      setActionError("Не удалось загрузить фотоотчёты: " + photosError.message);
      setLoading(false);
      return;
    }

    const withUrls = await Promise.all((pData ?? []).map(async (p) => {
      const { data } = await supabase.storage.from("photo-reports").createSignedUrl(p.storage_path, 3600);
      return { ...p, outletName: oMap.get(p.outlet_id), url: data?.signedUrl };
    }));
    setPhotos(withUrls);
    setLoading(false);
  }

  async function approve(id: string) {
    setActionError(null);
    setSavingId(id);
    const { error } = await supabase.from("photo_reports").update({ status: "approved" }).eq("id", id);
    if (error) setActionError("Не удалось подтвердить фото: " + error.message);
    else setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, status: "approved" } : p));
    setSavingId(null);
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) return;
    setActionError(null);
    setSavingId(id);
    const reason = rejectReason.trim();
    const { error } = await supabase.from("photo_reports").update({ status: "rejected", rejection_reason: reason }).eq("id", id);
    if (error) setActionError("Не удалось отклонить фото: " + error.message);
    else {
      setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, status: "rejected", rejection_reason: reason } : p));
      setRejectModal(null);
      setRejectReason("");
    }
    setSavingId(null);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;

  const statusBadge: Record<string, string> = {
    pending: "bg-orange-50 text-status-amber border border-orange-200",
    approved: "bg-green-50 text-status-green border border-green-200",
    rejected: "bg-red-50 text-status-red border border-red-200",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-semibold">Фото-отчёты</h1>
        <p className="text-brand-muted text-sm mt-1">Проверка фотографий с торговых точек</p>
      </div>

      {actionError && <p role="alert" className="text-sm text-status-red bg-red-50 border border-red-200 rounded-xl px-4 py-3">{actionError}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.length === 0 && <p className="text-brand-muted text-sm col-span-3 text-center py-8">Нет фото-отчётов</p>}
        {photos.map((p) => (
          <div key={p.id} className="bg-white border border-brand-border rounded-2xl overflow-hidden">
            {p.url ? (
              <img src={p.url} alt={p.outletName} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-brand-bg flex items-center justify-center">
                <Camera size={32} className="text-brand-muted" />
              </div>
            )}
            <div className="p-4">
              <div className="font-medium text-sm">{p.outletName ?? "—"}</div>
              <div className="text-xs text-brand-muted mt-1">{formatDate(p.created_at)} {formatTime(p.created_at)}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[p.status] ?? statusBadge.pending}`}>{p.status}</span>
                {canReview && p.status === "pending" && (
                  <div className="flex gap-1">
                    <button onClick={() => approve(p.id)} disabled={savingId === p.id} className="p-1.5 rounded-lg bg-green-50 text-status-green hover:bg-green-100 border border-green-200 disabled:opacity-50">
                      <CheckCircle size={15} />
                    </button>
                    <button onClick={() => { setRejectModal(p.id); setRejectReason(""); }} className="p-1.5 rounded-lg bg-red-50 text-status-red hover:bg-red-100 border border-red-200">
                      <XCircle size={15} />
                    </button>
                  </div>
                )}
              </div>
              {p.rejection_reason && (
                <p className="text-xs text-status-red mt-2">{p.rejection_reason}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold">Причина отклонения</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-brand-border rounded-xl text-sm bg-brand-bg resize-none h-24"
              placeholder="Укажите причину..." />
            <div className="flex gap-2">
              <button onClick={() => reject(rejectModal)} disabled={!rejectReason.trim() || savingId === rejectModal}
                className="flex-1 bg-status-red text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">Отклонить</button>
              <button onClick={() => setRejectModal(null)}
                className="flex-1 border border-brand-border py-2.5 rounded-xl text-sm">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
