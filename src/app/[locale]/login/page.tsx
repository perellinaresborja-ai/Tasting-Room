"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();
  const locale = useLocale();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Use hard reload to ensure server components get the latest cookie headers
      window.location.href = `/${locale}/admin`;
    }
  };

  const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://dummy.supabase.co";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8 max-w-md w-full">
        <h1 className="text-3xl font-serif text-[var(--color-gold)] mb-6 text-center uppercase tracking-widest">
          The Church
        </h1>
        <h2 className="text-gray-400 text-center mb-8 uppercase tracking-widest text-sm">
          Staff Login
        </h2>

        {!isConfigured && (
          <div className="bg-orange-900/20 border-l-4 border-orange-500 p-4 mb-6">
            <p className="text-orange-400 text-sm">Supabase no está configurado. Faltan variables de entorno.</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input 
              type="email" 
              placeholder="Email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors"
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Contraseña / Password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-black border border-[var(--color-charcoal)] p-4 text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button 
            type="submit" 
            disabled={loading || !isConfigured}
            className="w-full bg-[var(--color-gold)] text-black px-4 py-4 uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Entrar / Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
