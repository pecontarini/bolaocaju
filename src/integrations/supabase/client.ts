import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://atolxisdfsnjqiitczbd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Dt6sGCl9qKrzr9p4tK4SvQ_ngCL-CQG";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "bolao-caju-limao-auth",
  },
});