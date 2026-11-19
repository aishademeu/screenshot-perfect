import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { AppRole, SessionContext } from '@/lib/roles';

/** Returns the current Supabase session and MILKONTROL role context. */
export function useSession(): SessionContext & { user: User | null; session: Session | null } {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadRole(userId: string) {
    const { data } = await supabase
      .from('user_roles')
      .select('role, region_id, employee_id')
      .eq('user_id', userId)
      .limit(1)
      .single();
    if (data) {
      setRole(data.role as AppRole);
      setRegionId(data.region_id);
      setEmployeeId(data.employee_id);
    } else {
      setRole(null);
      setRegionId(null);
      setEmployeeId(null);
    }
  }

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadRole(session.user.id).finally(() => setLoading(false));
      } else {
        // Check for local demo session if no real Supabase session
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('milkontrol_demo_session');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              setUser({ id: parsed.id, email: parsed.email } as any);
              setRole(parsed.role as AppRole);
              setRegionId(parsed.region_id ?? null);
              setEmployeeId(parsed.employee_id ?? null);
              setLoading(false);
              return;
            } catch {}
          }
        }
        setLoading(false);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadRole(session.user.id).finally(() => setLoading(false));
      } else {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('milkontrol_demo_session');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              setUser({ id: parsed.id, email: parsed.email } as any);
              setRole(parsed.role as AppRole);
              setRegionId(parsed.region_id ?? null);
              setEmployeeId(parsed.employee_id ?? null);
              setLoading(false);
              return;
            } catch {}
          }
        }
        setRole(null);
        setRegionId(null);
        setEmployeeId(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, userId: user?.id ?? null, role, regionId, employeeId, loading };
}
