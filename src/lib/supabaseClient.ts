import { getSupabaseClient } from "./supabase";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Proxy-based supabase client export.
 * Safely accesses the dynamic client instance created in @/lib/supabase.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      console.warn("Supabase client is not yet configured or in local demo mode.");
      // Return a dummy chainable query builder to prevent unhandled crashes
      return () => ({
        select: () => ({
          gte: () => ({ lte: () => Promise.resolve({ data: [], error: null }) }),
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        upsert: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      });
    }
    const val = (client as any)[prop];
    if (typeof val === "function") {
      return val.bind(client);
    }
    return val;
  },
});

export default supabase;
