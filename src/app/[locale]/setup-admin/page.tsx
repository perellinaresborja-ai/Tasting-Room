"use client";

import { useState } from "react";
import { setupAdminAction } from "@/app/actions/setupAdmin";
import { useRouter } from "next/navigation";

export default function SetupAdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await setupAdminAction(formData);
    
    if (result.success) {
      setMessage({ type: 'success', text: '¡Administrador creado con éxito! Redirigiendo al login...' });
      setTimeout(() => {
        router.push('/es/login');
      }, 3000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Error desconocido' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8 max-w-md w-full">
        <h1 className="text-2xl font-serif text-[var(--color-gold)] mb-2 text-center uppercase tracking-widest">
          Setup Inicial
        </h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
          Crea tu usuario Administrador desde aquí.
        </p>

        {message && (
          <div className={`p-4 mb-6 border ${message.type === 'success' ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-red-900/20 border-red-500 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Clave Secreta de Instalación</label>
            <input 
              type="password" 
              name="secret"
              required 
              placeholder="Ej: MiClaveSecreta123"
              className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors"
            />
          </div>
          <div className="pt-4 border-t border-[var(--color-charcoal)]">
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Email del Admin</label>
            <input 
              type="email" 
              name="email"
              required 
              defaultValue="perellinaresborja@gmail.com"
              placeholder="admin@tastingroom.es"
              className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Contraseña</label>
            <input 
              type="password" 
              name="password"
              required 
              className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:outline-none focus:border-[var(--color-gold)] transition-colors"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[var(--color-gold)] text-black px-4 py-4 uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] transition-colors mt-6 disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear Administrador"}
          </button>
        </form>
        
        <div className="mt-8 text-xs text-gray-600 text-center">
          <p>Debes configurar SETUP_ADMIN_SECRET en tu archivo .env.local para usar esta pantalla.</p>
        </div>
      </div>
    </div>
  );
}
