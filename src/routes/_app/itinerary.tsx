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
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  checkedIn: boolean;
  plannedVisitId: string | null;
  checkinDistance?: number;
  photoSubmitted: boolean;
}

function RoutePage() {
  const { user, employeeId } = useSession();
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState<number | null>(null);
  const [camModal, setCamModal] = useState<Stop | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (employeeId) load();
    else setLoading(false);
  }, [employeeId]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data: outlets, error: outletsError } = await supabase
        .from("retail_outlets")
        .select("id, name, address, latitude, longitude")
        .eq("employee_id", employeeId!);
      if (outletsError) throw outletsError;

      const outletIds = (outlets ?? []).map((outlet) => outlet.id);
      if (!outletIds.length) {
        setStops([]);
        return;
      }

      const { data: visits, error: visitsError } = await supabase
        .from("planned_visits")
        .select("id, outlet_id, scheduled_at, completed_at")
        .in("outlet_id", outletIds)
        .order("scheduled_at", { ascending: true });
      if (visitsError) throw visitsError;

      const { data: photos, error: photosError } = await supabase
        .from("photo_reports")
        .select("outlet_id, status")
        .in("outlet_id", outletIds)
        .eq("user_id", user?.id ?? "");
      if (photosError) throw photosError;

      const visitMap = new Map<number, { completed: boolean; plannedVisitId: string | null }>();
      for (const visit of visits ?? []) {
        const current = visitMap.get(visit.outlet_id);
        if (!current || (!visit.completed_at && current.completed)) {
          visitMap.set(visit.outlet_id, {
            completed: !!visit.completed_at,
            plannedVisitId: visit.completed_at ? null : visit.id,
          });
        }
      }
      const photoMap = new Map((photos ?? []).map((photo) => [photo.outlet_id, true]));

      setStops((outlets ?? []).map((outlet) => ({
        ...outlet,
        checkedIn: visitMap.get(outlet.id)?.completed ?? false,
        plannedVisitId: visitMap.get(outlet.id)?.plannedVisitId ?? null,
        photoSubmitted: photoMap.get(outlet.id) ?? false,
      })));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось загрузить маршрут.");
    } finally {
      setLoading(false);
    }
  }

  async function checkIn(stop: Stop) {
    setGpsError(null);
    setActionError(null);
    if (!user) {
      setGpsError("Для регистрации визита необходимо войти в аккаунт.");
      return;
    }
    if (stop.latitude === null || stop.longitude === null) {
      setGpsError("У этой торговой точки не указаны координаты. Визит не зарегистрирован.");
      return;
    }

    setGpsLoading(stop.id);
    if (!navigator.geolocation) {
      setGpsError("Этот браузер не поддерживает геолокацию.");
      setGpsLoading(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          const dist = Math.round(haversineMeters(lat, lng, stop.latitude!, stop.longitude!));
          const { data: settings, error: settingsError } = await supabase
            .from("detection_settings")
            .select("geofence_meters")
            .single();
          if (settingsError) throw settingsError;
          const fence = settings?.geofence_meters ?? 150;

          if (dist > fence) {
            setGpsError(`Вы находитесь в ${dist} м от точки. Допустимо: ${fence} м.`);
            return;
          }

          // The browser supplies coordinates, so this client-side check is not
          // sufficient proof of location. Keep verified=false until the server
          // validates the visit independently.
          const { error: visitError } = await supabase.from("visits").insert({
            outlet_id: stop.id,
            user_id: user.id,
            latitude: lat,
            longitude: lng,
            accuracy,
            verified: false,
          });
          if (visitError) throw visitError;

          if (stop.plannedVisitId) {
            const { data: completedVisit, error: planError } = await supabase
              .from("planned_visits")
              .update({ completed_at: new Date().toISOString() })
              .eq("id", stop.plannedVisitId)
              .is("completed_at", null)
              .select("id")
              .maybeSingle();
            if (planError) throw planError;
            if (!completedVisit) {
              throw new Error("Плановый визит уже завершён или больше недоступен. Обновите маршрут.");
            }
          }
          setStops((prev) => prev.map((item) => item.id === stop.id
            ? { ...item, checkedIn: true, plannedVisitId: null, checkinDistance: dist }
            : item));
        } catch (error) {
          setActionError(error instanceof Error ? error.message : "Не удалось сохранить визит.");
        } finally {
          setGpsLoading(null);
        }
      },
      (err) => {
        setGpsError(`GPS недоступен: ${err.message}`);
        setGpsLoading(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function openCamera(stop: Stop) {
    setActionError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setActionError("Камера недоступна в этом браузере.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCamModal(stop);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {
            setActionError("Не удалось запустить камеру. Разрешите доступ к камере и попробуйте снова.");
          });
        }
      });
    } catch {
      setActionError("Не удалось открыть камеру. Проверьте разрешение на её использование.");
      stopCamera();
    }
  }

  async function capturePhoto(stop: Stop) {
    setActionError(null);
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setActionError("Камера ещё не готова. Подождите немного и попробуйте снова.");
      return;
    }
    if (!user) {
      setActionError("Для отправки фото необходимо войти в аккаунт.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setActionError("Не удалось подготовить фото.");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const stampHeight = Math.max(36, Math.round(canvas.height * 0.08));
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, canvas.height - stampHeight, canvas.width, stampHeight);
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(12, Math.round(canvas.width * 0.022))}px sans-serif`;
    ctx.fillText(`${stop.name} · ${new Date().toLocaleString("ru-KZ")}`, 12, canvas.height - Math.round(stampHeight * 0.35));

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setActionError("Не удалось получить изображение с камеры.");
        return;
      }
      const path = `${user.id}/${stop.id}-${Date.now()}.jpg`;
      try {
        const { error: uploadError } = await supabase.storage
          .from("photo-reports")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase.from("photo_reports").insert({
          outlet_id: stop.id,
          user_id: user.id,
          storage_path: path,
          status: "pending",
        });
        if (insertError) {
          await supabase.storage.from("photo-reports").remove([path]);
          throw insertError;
        }

        setStops((prev) => prev.map((item) => item.id === stop.id
          ? { ...item, photoSubmitted: true }
          : item));
        stopCamera();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Не удалось отправить фотоотчёт.");
      }
    }, "image/jpeg", 0.85);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamModal(null);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl font-semibold">Маршрут</h1>
        <p className="text-brand-muted text-sm mt-1">Плановые визиты на сегодня</p>
      </div>
      {(gpsError || actionError) && (
        <div className="flex gap-2 items-center bg-red-50 border border-red-200 text-status-red text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} /> {gpsError || actionError}
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
