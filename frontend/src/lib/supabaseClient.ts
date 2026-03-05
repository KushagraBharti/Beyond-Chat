import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const mvpBypassEnabled = import.meta.env.VITE_ENABLE_MVP_BYPASS === "true";

export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);
export const isMvpBypassEnabled = mvpBypassEnabled || !isSupabaseEnabled;

export const supabase = isSupabaseEnabled
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
