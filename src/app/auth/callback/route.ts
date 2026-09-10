import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'
import { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) { next = '/' + next; }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tastingroom.es'
  const redirectUrl = new URL(next, appUrl)
  
  // Construct the final successful redirect response upfront so we can attach cookies to it
  let response = NextResponse.redirect(redirectUrl)
  let errorMsg = 'auth-callback-failed'

  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
              response.cookies.set(name, value, options)
            })
          } catch (error) {
            console.error("Failed to set cookie in callback:", error)
          }
        }
      }
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return response
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return response
    errorMsg = 'expired'
  }

  // Handle errors
  const errorUrl = new URL(next.split('?')[0], appUrl)
  if (errorMsg === 'expired') {
    errorUrl.searchParams.set('error', 'expired')
  } else {
    errorUrl.pathname = '/'
    errorUrl.searchParams.set('error', errorMsg)
  }
  return NextResponse.redirect(errorUrl)
}
