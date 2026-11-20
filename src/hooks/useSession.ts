import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { AppRole, SessionContext } from "@/lib/roles";

/** Returns the authenticated Supabase user and their server-assigned role. */
export function useSession(): SessionContext & { user: User | null; session: Session | null } {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function applySession(nextSession: Session | null) {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setRole(null);
      setRegionId(null);
      setEmployeeId(null);

      if (!nextSession?.user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, region_id, employee_id")
        .eq("user_id", nextSession.user.id)
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error("[Auth] Could not load the user's assigned role:", error.message);
      } else if (data) {
        setRole(data.role as AppRole);
        setRegionId(data.region_id);
        setEmployeeId(data.employee_id);
      }
      setLoading(false);
    }

    void supabase.auth.getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (error) console.error("[Auth] Could not restore session:", error.message);
        return applySession(initialSession);
      })
      .catch((error) => {
        console.error("[Auth] Session initialization failed:", error);
        if (active) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, userId: user?.id ?? null, role, regionId, employeeId, loading };
}
