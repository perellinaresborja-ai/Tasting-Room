"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { ensureProfile } from '@/app/actions/member';

export default function MemberPortal() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [loginStep, setLoginStep] = useState<'IDLE' | 'SENT'>('IDLE');
  
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    async function loadData(user: any) {
      if (!user || !user.email) return;

      // 1. Ensure profile exists (bypasses RLS to insert if missing)
      const res = await ensureProfile(user.id, user.email);
      if (res.success && res.profile) {
        if (active) setProfile(res.profile);
      } else {
        console.error("Error loading profile:", res.error);
        if (active) setProfile(user); // fallback
      }
      
      const { data: reservations } = await supabase
        .from("reservations")
        .select("*, tasting:tastings(title_es, title_en, date, start_time, status)")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false });
      
      if (reservations) setReservations(reservations);
      
      if (active) setLoading(false);
    }

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && active) {
        await loadData(user);
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/es/member`,
      }
    });

    if (!error) {
      setLoginStep('SENT');
    } else {
      alert("Error enviando el enlace de acceso.");
    }
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
        <p className="text-[var(--color-gold)] uppercase tracking-widest text-sm">Cargando...</p>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!profile || !profile.public_token) {
    return (
      <div className="max-w-md mx-auto px-4 py-32">
        <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8 text-center">
          <h1 className="text-2xl font-serif text-[var(--color-gold)] mb-6 uppercase tracking-widest">Área de Cliente</h1>
          
          {loginStep === 'IDLE' ? (
            <>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Accede a tu cuenta para ver tu código QR personal, historial de reservas y próximas catas.
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Tu correo electrónico"
                  required
                  className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-center text-white focus:border-[var(--color-gold)] outline-none" 
                />
                <button type="submit" className="w-full bg-[var(--color-gold)] text-black px-6 py-4 uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] transition-colors">
                  Enviar Enlace de Acceso
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-4xl text-[var(--color-gold)] mb-6">✉</div>
              <p className="text-white text-lg mb-2">Revisa tu correo</p>
              <p className="text-gray-400 text-sm">
                Hemos enviado un enlace mágico a <strong>{email}</strong>. Haz clic en él para iniciar sesión de forma segura sin contraseñas.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const upcoming = reservations.filter(r => new Date(r.tasting?.date) >= new Date() && r.status !== 'CANCELLED');
  const past = reservations.filter(r => new Date(r.tasting?.date) < new Date() || r.status === 'CANCELLED');

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex justify-between items-center mb-12 border-b border-[var(--color-charcoal)] pb-6">
        <div>
          <h1 className="text-3xl font-serif text-[var(--color-gold)] uppercase tracking-wider mb-2">Área de Cliente</h1>
          <p className="text-gray-400">Bienvenido, {profile.first_name || profile.email}</p>
        </div>
        <button onClick={handleLogout} className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors border border-[var(--color-charcoal)] px-4 py-2">
          Cerrar Sesión
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* QR COLUMN */}
        <div className="md:col-span-1">
          <div className="bg-[#0a0a0a] border border-[var(--color-charcoal)] p-8 text-center flex flex-col items-center sticky top-24">
            <h2 className="text-xl text-[var(--color-warm-white)] mb-4 font-serif">Tu QR Personal</h2>
            <p className="text-xs text-gray-500 mb-8 uppercase tracking-widest leading-relaxed">
              Úsalo para acceder a todas tus catas y eventos.
            </p>
            
            <div className="bg-white p-4 inline-block mb-6 shadow-[0_0_30px_rgba(197,160,89,0.1)]">
              {profile.public_token && <QRCodeSVG value={`https://tastingroom.es/q/${profile.public_token}`} size={200} />}
            </div>
            
            <p className="text-[10px] font-mono text-gray-600 break-all">{profile.public_token}</p>
          </div>
        </div>
        
        {/* RESERVATIONS COLUMN */}
        <div className="md:col-span-2 space-y-8">
          
          <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8">
            <h2 className="text-xl font-serif text-[var(--color-gold)] mb-6">Próximas Reservas</h2>
            
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500">No tienes próximas catas programadas.</p>
            ) : (
              <div className="space-y-4">
                {upcoming.map(res => (
                  <div key={res.id} className="border border-[var(--color-charcoal)] bg-black p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-serif text-lg">{res.tasting?.title_es}</p>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                        {new Date(res.tasting?.date).toLocaleDateString('es-ES')} • {res.tasting?.start_time?.slice(0,5)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--color-gold)] text-lg">{res.tickets} {res.tickets > 1 ? 'plazas' : 'plaza'}</p>
                      <p className={`text-[10px] uppercase tracking-widest ${res.payment_status === 'PAID' ? 'text-green-500' : 'text-orange-500'}`}>
                        {res.payment_status === 'PAID' ? 'PAGADO ✓' : 'PENDIENTE'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8">
            <h2 className="text-xl font-serif text-gray-400 mb-6">Historial</h2>
            
            {past.length === 0 ? (
              <p className="text-sm text-gray-500">Aún no has asistido a ninguna cata.</p>
            ) : (
              <div className="space-y-2">
                {past.map(res => (
                  <div key={res.id} className="flex justify-between items-center text-sm py-2 border-b border-[var(--color-charcoal)] opacity-70">
                    <span className="text-gray-300">{res.tasting?.title_es}</span>
                    <div className="text-right">
                      <span className="text-gray-500 block">{new Date(res.tasting?.date).toLocaleDateString('es-ES')}</span>
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
