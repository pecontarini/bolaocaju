import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AdminAuthState =
  | { status: "loading" }
  | { status: "in"; session: Session }
  | { status: "out" };

export function useAdminSession(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({ status: "loading" });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session ? { status: "in", session } : { status: "out" });
    });
    supabase.auth.getSession().then(({ data }) => {
      setState(
        data.session ? { status: "in", session: data.session } : { status: "out" },
      );
    });
    return () => subscription.unsubscribe();
  }, []);

  return state;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}