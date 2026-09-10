"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { requestMagicLink, getMemberData } from '@/app/actions/member';
import { useTranslations, useLocale } from 'next-intl';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  public_token: string;
  member_number?: number;
  [key: string]: unknown;
}

interface Tasting {
  title_es: string;
  title_en: string;
  date: string;
  start_time: string;
  status: string;
  [key: string]: unknown;
}

interface Reservation {
  id: string;
  tasting?: Tasting;
  status: string;
  payment_status: string;
  tickets: number;
  reservation_type: string;
  [key: string]: unknown;
}

export default function MemberPortal() {
  const t = useTranslations('Member');
  const locale = useLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [loginStep, setLoginStep] = useState<'IDLE' | 'SENT'>('IDLE');
  
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function loadData(user: { id: string; email?: string }) {
      if (!user || !user.email) return;

      const res = await getMemberData(user.id, user.email);
      if (res.success && res.profile) {
        if (active) {
          setProfile(res.profile as Profile);
          setReservations((res.reservations as unknown as Reservation[]) || []);
          // Track access
          import('@/app/actions/analytics').then(m => m.trackAnalyticsEvent({ event_name: 'member_access', profile_id: res.profile?.id })).catch(() => {});
        }
      } else {
        console.error("Error loading profile:", res.error);
        if (active) setProfile(null); 
      }
      
      if (active) setLoading(false);
    }

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && active) {
        await loadData(session.user);
      } else if (active) {
        setLoading(false);
      }
    }
    
    checkAuth();

    return () => { active = false; };
  }, [supabase]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    const res = await requestMagicLink(email, locale);

    if (!res.success) {
      if (res.code === 'NOT_FOUND' || res.code === 'NOT_CLIENT') {
        // Fake success for security
        setLoginStep('SENT');
      } else {
        if (res.rateLimit) {
          alert(locale === 'es' ? 'Has solicitado varios accesos recientemente. Espera unos minutos antes de intentarlo de nuevo.' : 'You have requested access recently. Please wait a few minutes before trying again.');
        } else {
          alert(locale === 'es' ? 'No hemos podido enviarte el acceso. Inténtalo de nuevo en unos minutos.' : 'We could not send your access link. Please try again in a few minutes.');
        }
      }
      setLoading(false);
      return;
    }
    
    setLoginStep('SENT');
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setProfile(null);
    setReservations([]);
    setLoginStep('IDLE');
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-32 text-center">
        <p className="text-[var(--color-gold)] uppercase tracking-widest text-sm">{t('loading')}</p>
      </div>
    );
  }

  if (!profile || !profile.public_token) {
    return (
      <div className="max-w-md mx-auto px-4 py-32">
        <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8 text-center">
          <h1 className="text-2xl font-serif text-[var(--color-gold)] mb-6 uppercase tracking-widest leading-relaxed">
            {t('title_1')}<br />{t('title_2')}
          </h1>
          
          {loginStep === 'IDLE' ? (
            <>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                {t('login_desc')}
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  required
                  className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-center text-white focus:border-[var(--color-gold)] outline-none" 
                />
                <button type="submit" className="w-full bg-[var(--color-gold)] text-black px-6 py-4 uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] transition-colors">
                  {t('send_link')}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-4xl text-[var(--color-gold)] mb-6">✉</div>
              <p className="text-gray-400 text-sm">
                {t('sent_msg')}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const upcoming = reservations.filter(r => r.tasting && new Date(r.tasting.date) >= new Date() && r.status !== 'CANCELLED' && r.status !== 'REJECTED');
  const past = reservations.filter(r => r.tasting && (new Date(r.tasting.date) < new Date() || r.status === 'CANCELLED' || r.status === 'REJECTED'));

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center mb-12 border-b border-[var(--color-charcoal)] pb-6">
        <div>
          <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-wider mb-2">{t('title_1')} {t('title_2')}</h1>
          <p className="text-gray-400">{t('welcome')}, {profile.first_name || profile.email}</p>
        </div>
        <button onClick={handleLogout} className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors border border-[var(--color-charcoal)] px-4 py-2">
          {t('logout')}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <div className="md:col-span-1">
          <div className="bg-[#0a0a0a] border border-[var(--color-charcoal)] p-8 text-center flex flex-col items-center sticky top-24">
            <h2 className="text-xl text-[var(--color-warm-white)] mb-4 font-serif">{t('qr_title')}</h2>
            <p className="text-xs text-gray-500 mb-8 uppercase tracking-widest leading-relaxed">
              {t('qr_desc')}
            </p>
            
            <div className="bg-white p-4 inline-block mb-6 shadow-[0_0_30px_rgba(197,160,89,0.1)]">
              {profile.public_token && <QRCodeSVG value={`${process.env.NEXT_PUBLIC_SITE_URL || "https://tastingroom.es"}/q/${profile.public_token}`} size={200} />}
            </div>
            
            {profile.member_number !== undefined && profile.member_number !== null && (
              <div className="mb-4">
                <p className="text-xl text-[var(--color-gold)] font-serif mb-1">
                  Tasting Room {profile.member_number.toString().padStart(4, '0')}
                </p>
                <p className="text-sm text-gray-400 uppercase tracking-widest">
                  {profile.first_name} {profile.last_name || ''}
                </p>
              </div>
            )}
            
            <p className="text-[10px] font-mono text-gray-600 break-all">{profile.public_token}</p>
          </div>
        </div>
        
        <div className="md:col-span-2 space-y-8">
          
          <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8">
            <h2 className="text-xl font-serif text-[var(--color-gold)] mb-6">{t('upcoming')}</h2>
            
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500">{t('no_upcoming')}</p>
            ) : (
              <div className="space-y-4">
                {upcoming.map(res => (
                  <div key={res.id} className="border border-[var(--color-charcoal)] bg-black p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-serif text-lg">{res.tasting?.title_es}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                        {res.tasting && new Date(res.tasting.date).toLocaleDateString('es-ES')} • {res.tasting?.start_time?.slice(0,5)}
                      </p>
                      {res.reservation_type === 'INVITATION' && (
                        <span className="inline-block mt-2 text-[10px] bg-white text-black px-2 py-1 uppercase tracking-widest font-bold">INVITACIÓN</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--color-gold)] text-lg">{res.tickets} {res.tickets > 1 ? t('tickets') : t('ticket')}</p>
                      <p className={`text-[10px] uppercase tracking-widest ${res.payment_status === 'PAID' ? 'text-green-500' : 'text-orange-500'}`}>
                        {res.payment_status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8">
            <h2 className="text-xl font-serif text-gray-400 mb-6">{t('history')}</h2>
            
            {past.length === 0 ? (
              <p className="text-sm text-gray-500">{t('no_history')}</p>
            ) : (
              <div className="space-y-2">
                {past.map(res => (
                  <div key={res.id} className="flex justify-between items-center text-sm py-2 border-b border-[var(--color-charcoal)] opacity-70">
                    <span className="text-gray-300">{res.tasting?.title_es}</span>
                    <div className="text-right">
                      <span className="text-gray-500 block">{res.tasting && new Date(res.tasting.date).toLocaleDateString('es-ES')}</span>
                      <span className="text-[10px] text-gray-600 uppercase tracking-widest">{res.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
