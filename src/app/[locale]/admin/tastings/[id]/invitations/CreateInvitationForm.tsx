"use client";

import { useState } from "react";
import { checkExistingProfile, createInvitationAction } from "@/app/actions/createInvitation";

export default function CreateInvitationForm({ tastingId, locale, tastingTitle }: { tastingId: string, locale: string, tastingTitle: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tickets, setTickets] = useState(1);
  const [loading, setLoading] = useState(false);
  const [existingProfile, setExistingProfile] = useState<{id: string; first_name: string; last_name: string} | null>(null);
  const [error, setError] = useState("");

  async function handleCheckProfile() {
    if (!email && !phone) return;
    const { profile } = await checkExistingProfile(email, phone);
    setExistingProfile(profile);
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("tasting_id", tastingId);
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("tickets", tickets.toString());
    if (existingProfile) {
      formData.append("profile_id", existingProfile.id);
    }

    const res = await createInvitationAction(formData);
    if (res.error) {
      setError(res.error);
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setTickets(1);
      setExistingProfile(null);
    }
    setLoading(false);
  }

  return (
    <div className="bg-[#141414] border border-[var(--color-charcoal)] p-8">
      <h2 className="text-xl font-serif text-[var(--color-gold)] mb-6">Nueva Invitación</h2>
      
      {error && <div className="bg-red-900/30 text-red-500 p-4 text-sm mb-6">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-gray-400 mb-2 uppercase tracking-widest text-xs">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={handleCheckProfile}
            className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-gray-400 mb-2 uppercase tracking-widest text-xs">Teléfono / WhatsApp *</label>
          <input 
            type="tel" 
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onBlur={handleCheckProfile}
            required
            className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none transition-colors"
          />
        </div>

        {existingProfile && (
          <div className="bg-green-900/20 border border-green-900/50 p-4 my-4">
            <p className="text-green-500 uppercase tracking-widest text-xs mb-1 font-bold">Cliente Existente</p>
            <p className="text-white">{existingProfile.first_name} {existingProfile.last_name}</p>
            <p className="text-gray-400 text-xs">QR Activo. Se vinculará a su perfil actual.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 mb-2 uppercase tracking-widest text-xs">Nombre *</label>
            <input 
              type="text" 
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              disabled={!!existingProfile}
              className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none transition-colors disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2 uppercase tracking-widest text-xs">Apellidos *</label>
            <input 
              type="text" 
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              disabled={!!existingProfile}
              className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-400 mb-2 uppercase tracking-widest text-xs">Número de plazas *</label>
          <input 
            type="number" 
            min="1"
            value={tickets}
            onChange={e => setTickets(parseInt(e.target.value) || 1)}
            required
            className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none transition-colors"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[var(--color-gold)] text-black px-6 py-4 uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] transition-colors disabled:opacity-50 mt-6"
        >
          {loading ? 'Creando...' : 'Crear Invitación'}
        </button>
      </form>
    </div>
  );
}
