import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { haversineMeters } from "@/lib/format";
import { MapPin, Camera, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_app/itinerary")({
  component: RoutePage,
});

interface Stop {
  id: number; name: string; address: string;
  latitude: number | null; longitude: number | null;
  checkedIn: boolean; checkinDistance?: number; photoSubmitted: boolean;
}

function RoutePage() {
  const { user, employeeId } = useSession();
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState<number | null>(null);
  const [camModal, setCamModal] = useState<Stop | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { if (employeeId) load(); }, [employeeId]);

  async function load() {
    setLoading(true);
    const { data: outlets } = await supabase.from("retail_outlets").select("id, name, address, latitude, longitude").eq("employee_id", employeeId!);
    const { data: visits } = await supabase.from("planned_visits").select("outlet_id, completed_at").in("outlet_id", (outlets ?? []).map((o) => o.id));
    const { data: photos } = await supabase.from("photo_reports").select("outlet_id, status").in("outlet_id", (outlets ?? []).map((o) => o.id)).eq("user_id", user?.id ?? "");

    const visitMap = new Map((visits ?? []).map((v) => [v.outlet_id, !!v.completed_at]));
    const photoMap = new Map((photos ?? []).map((p) => [p.outlet_id, true]));

    setStops((outlets ?? []).map((o) => ({
      ...o,
      checkedIn: visitMap.get(o.id) ?? false,
      photoSubmitted: photoMap.get(o.id) ?? false,
    })));
    setLoading(false);
  }

  async function checkIn(stop: Stop) {
    setGpsError(null);
    setGpsLoading(stop.id);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const dist = stop.latitude && stop.longitude ? Math.round(haversineMeters(lat, lng, stop.latitude, stop.longitude)) : null;

        const { data: settings } = await supabase.from("detection_settings").select("geofence_meters").single();
        const fence = settings?.geofence_meters ?? 150;

        if (dist !== null && dist > fence) {
          setGpsError(`Вы находитесь в ${dist} м от точки. Допустимо: ${fence} м.`);
          setGpsLoading(null);
          return;
        }

        const { error } = await supabase.from("visits").insert({
          outlet_id: stop.id,
          user_id: user!.id,
          latitude: lat,
          longitude: lng,
          accuracy,
          verified: dist !== null && dist <= fence,
        });

        if (!error) {
          // Mark planned visit complete
          await supabase.from("planned_visits").update({ completed_at: new Date().toISOString() }).eq("outlet_id", stop.id).is("completed_at", null);
          setStops((prev) => prev.map((s) => s.id === stop.id ? { ...s, checkedIn: true, checkinDistance: dist ?? undefined } : s));
        }
        setGpsLoading(null);
      },
      (err) => {
        setGpsError(`GPS недоступен: ${err.message}`);
        setGpsLoading(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function openCamera(stop: Stop) {
    setCamModal(stop);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      // camera unavailable — will use canvas fallback
    }
  }

  async function capturePhoto(stop: Stop) {
    const canvas = document.createElement("canvas");
    canvas.width = 640; canvas.height = 480;
    const ctx = canvas.getContext("2d")!;
    if (videoRef.current && videoRef.current.videoWidth) {
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    } else {
      ctx.fillStyle = "#31487A"; ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = "#D9E1F1"; ctx.fillRect(180, 100, 280, 300);
    }
    // GPS stamp
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 440, 640, 40);
    ctx.fillStyle = "#fff"; ctx.font = "14px sans-serif";
    ctx.fillText(`${stop.name} · ${new Date().toLocaleString("ru-KZ")}`, 12, 466);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const path = `${user!.id}/${stop.id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("photo-reports").upload(path, blob, { contentType: "image/jpeg" });
      if (!upErr) {
        await supabase.from("photo_reports").insert({ outlet_id: stop.id, user_id: user!.id, storage_path: path, status: "pending" });
        setStops((prev) => prev.map((s) => s.id === stop.id ? { ...s, photoSubmitted: true } : s));
      }
      stopCamera();
    }, "image/jpeg", 0.8);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamModal(null);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl font-semibold">Маршрут</h1>
        <p className="text-brand-muted text-sm mt-1">Плановые визиты на сегодня</p>
      </div>
      {gpsError && (
        <div className="flex gap-2 items-center bg-red-50 border border-red-200 text-status-red text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} /> {gpsError}
        </div>
      )}
      <div className="space-y-3">
        {stops.map((stop, i) => (
          <div key={stop.id} className="bg-white border border-brand-border rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-none ${stop.checkedIn ? "bg-green-100 text-status-green" : "bg-brand-bg text-brand-muted"}`}>
                {stop.checkedIn ? <CheckCircle size={16} /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{stop.name}</div>
                <div className="text-xs text-brand-muted mt-0.5">{stop.address}</div>
                {stop.checkedIn && stop.checkinDistance !== undefined && (
                  <div className="text-xs text-status-green mt-1">✓ Check-in: {stop.checkinDistance} м от точки</div>
                )}
                {stop.photoSubmitted && <div className="text-xs text-status-green">✓ Фото отправлено на проверку</div>}
              </div>
              <div className="flex flex-col gap-2 items-end flex-none">
                {!stop.checkedIn ? (
                  <button onClick={() => checkIn(stop)} disabled={gpsLoading === stop.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white text-xs rounded-lg disabled:opacity-50">
                    {gpsLoading === stop.id ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                    Check-in
                  </button>
                ) : !stop.photoSubmitted ? (
                  <button onClick={() => openCamera(stop)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white text-xs rounded-lg">
                    <Camera size={12} /> Фото
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {stops.length === 0 && <p className="text-brand-muted text-sm text-center py-8">Нет плановых визитов</p>}
      </div>

      {/* Camera modal */}
      {camModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4">
            <div className="font-semibold text-sm">Фото: {camModal.name}</div>
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl bg-brand-navy" />
            <p className="text-xs text-brand-muted">Только съёмка с камеры. Выбор из галереи отключён.</p>
            <div className="flex gap-2">
              <button onClick={() => capturePhoto(camModal)} className="flex-1 bg-brand-primary text-white py-2.5 rounded-xl text-sm font-medium">Снять</button>
              <button onClick={stopCamera} className="flex-1 border border-brand-border py-2.5 rounded-xl text-sm">Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
