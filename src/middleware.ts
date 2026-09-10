import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { createServerClient } from "@supabase/ssr";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. Get intl response
  const response = intlMiddleware(request);

  // --- UTM & Analytics Tracking ---
  const url = request.nextUrl;
  const utmSource = url.searchParams.get("utm_source");
  const utmMedium = url.searchParams.get("utm_medium");
  const utmCampaign = url.searchParams.get("utm_campaign");
  const utmContent = url.searchParams.get("utm_content");
  const utmTerm = url.searchParams.get("utm_term");
  const referrer = request.headers.get("referer");

  // Options for analytics cookies (30 days)
  const cookieOptions = { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" as const, httpOnly: true };

  if (utmSource) response.cookies.set("utm_source", utmSource, cookieOptions);
  if (utmMedium) response.cookies.set("utm_medium", utmMedium, cookieOptions);
  if (utmCampaign) response.cookies.set("utm_campaign", utmCampaign, cookieOptions);
  if (utmContent) response.cookies.set("utm_content", utmContent, cookieOptions);
  if (utmTerm) response.cookies.set("utm_term", utmTerm, cookieOptions);
  
  // Only set referrer if it's external (doesn't contain our own domain) to avoid overwriting original source
  if (referrer && !referrer.includes(url.host)) {
    // Only set if we don't already have one, to preserve the first-touch referrer
    if (!request.cookies.has("referrer")) {
      response.cookies.set("referrer", referrer, cookieOptions);
    }
  }

  // 2. Supabase session handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Fetch the user
  const { data: { user } } = await supabase.auth.getUser();

  // Check if admin route
  const isAdminRoute = request.nextUrl.pathname.match(/^\/(es|en)\/admin/);

  if (isAdminRoute && !user) {
    const locale = request.nextUrl.pathname.split('/')[1] || 'en';
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/login`;
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/auth`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)']
};
