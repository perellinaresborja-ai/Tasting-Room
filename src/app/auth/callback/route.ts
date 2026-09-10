import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  
  // Return URL allows redirecting to specific locale path
  // If not provided, goes to root
  const next = searchParams.get('next') ?? '/'
  let errorMsg = 'auth-callback-failed';

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return doRedirect(request, origin, next)
    }
  } else if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    
    if (!error) {
      return doRedirect(request, origin, next)
    } else {
      errorMsg = 'expired';
    }
  }

  // Handle errors
  if (errorMsg === 'expired') {
    return NextResponse.redirect(`${origin}${next.split('?')[0]}?error=expired`)
  }
  return NextResponse.redirect(`${origin}/?error=${errorMsg}`)
}

function doRedirect(request: Request, origin: string, next: string) {
  const forwardedHost = request.headers.get('x-forwarded-host') 
  const isLocalEnv = process.env.NODE_ENV === 'development'
  
  if (isLocalEnv) {
    // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
    return NextResponse.redirect(`${origin}${next}`)
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`)
  } else {
    return NextResponse.redirect(`${origin}${next}`)
  }
}
