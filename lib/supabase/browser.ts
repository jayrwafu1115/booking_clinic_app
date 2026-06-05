"use client";

import { createBrowserClient } from "@supabase/ssr";
import { assertSupabasePublicEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = assertSupabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
