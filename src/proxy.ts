import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/*
 * Keeps Supabase auth sessions fresh: if the request carries an auth cookie,
 * refresh the access token and pass updated cookies to the page and browser.
 * Visitors without a session cookie skip this entirely.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!hasSession || !url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        for (const [header, value] of Object.entries(headers ?? {})) response.headers.set(header, value);
      },
    },
  });
  try {
    await supabase.auth.getUser();
  } catch {
    // Network/auth errors: continue; pages treat the visitor as signed out.
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/places|sw.js|offline.html|manifest.webmanifest|pwa-icon).*)"],
};
