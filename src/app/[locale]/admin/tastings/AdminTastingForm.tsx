/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { translateEsToEn } from "@/app/actions/translate";
import { uploadImageAction } from "@/app/actions/uploadImage";
import { saveTastingAction } from "@/app/actions/saveTasting";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export default function AdminTastingForm({ initialData = null }: { initialData?: unknown /* eslint-disable-line @typescript-eslint/no-explicit-any */ }) {
  const [formData, setFormData] = useState(initialData || {
    title_es: "",
    title_en: "",
    subtitle_es: "",
    subtitle_en: "",
    description_es: "",
    description_en: "",
    slug: "",
    category: "",
    date: "",
    start_time: "",
    end_time: "",
    location: "The Church Tasting Room",
    price: 0,
    capacity: 12,
    host: "",
    guests: [],
    includes_alcohol: true,
    status: "DRAFT",
    cover_image: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();
  const locale = useLocale();

  const handleTranslateDesc = async () => {
    if (!formData.description_es) return;
    try {
      const res = await translateEsToEn(formData.description_es);
      if (res.success && res.translation) {
        setFormData((prev: unknown) => ({ ...prev, description_en: res.translation }));
      } else {
        alert(res.error || "Error al traducir");
      }
    } catch (e) {
      alert("Error en la traducción");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await uploadImageAction(data);
      if (res.success && res.url) {
        setFormData((prev: unknown) => ({ ...prev, cover_image: res.url }));
      } else {
        alert(res.error || "Error al subir la imagen");
      }
    } catch (error) {
      alert("Error de conexión al subir la imagen");
    } finally {
      setIsUploading(false);
    }
  };

  const addGuest = () => {
    setFormData((prev: unknown) => ({ ...prev, guests: [...(prev.guests || []), { name: '', role: '', company: '', photo: '' }] }));
  };

  const updateGuest = (index: number, field: string, value: string) => {
    setFormData((prev: unknown) => {
      const newGuests = [...(prev.guests || [])];
      newGuests[index] = { ...newGuests[index], [field]: value };
      return { ...prev, guests: newGuests };
    });
  };

  const removeGuest = (index: number) => {
    setFormData((prev: unknown) => {
      const newGuests = [...(prev.guests || [])];
      newGuests.splice(index, 1);
      return { ...prev, guests: newGuests };
    });
  };

  const handleGuestPhotoChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      const data = new FormData();
      data.append('file', e.target.files[0]);
      const res = await uploadImageAction(data);
      if (res.success && res.url) {
        updateGuest(index, 'photo', res.url);
      } else {
        alert('Error al subir foto de invitado');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: unknown /* eslint-disable-line @typescript-eslint/no-explicit-any */) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const dataToSave = { ...formData }; console.log('SAVING DATA:', dataToSave);
    if (!dataToSave.end_time) delete dataToSave.end_time;
    if (!dataToSave.subtitle_es) delete dataToSave.subtitle_es;
    if (!dataToSave.subtitle_en) delete dataToSave.subtitle_en;
    if (!dataToSave.host) delete dataToSave.host;
    if (!dataToSave.cover_image) delete dataToSave.cover_image;

    const res = await saveTastingAction(dataToSave, (initialData as any)?.id);
  
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push(`/${locale}/admin/tastings`);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl bg-[#141414] p-8 border border-[var(--color-charcoal)]">
      {error && <div className="bg-red-900/50 border border-red-500 text-red-200 p-4">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Título (ES)</label>
          <input required type="text" name="title_es" value={formData.title_es} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Título (EN)</label>
          <input required type="text" name="title_en" value={formData.title_en} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Subtítulo (ES)</label>
          <input type="text" name="subtitle_es" value={formData.subtitle_es} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Subtítulo (EN)</label>
          <input type="text" name="subtitle_en" value={formData.subtitle_en} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Descripción (ES)</label>
        <textarea required name="description_es" value={formData.description_es} onChange={handleChange} rows={4} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs uppercase tracking-widest text-gray-500">Descripción (EN)</label>
          <button 
            type="button" 
            onClick={handleTranslateDesc} 
            className="text-xs text-[var(--color-gold)] hover:underline flex items-center gap-1"
          >
            <span>✨</span> Traducir auto desde Castellano
          </button>
        </div>
        <textarea required name="description_en" value={formData.description_en} onChange={handleChange} rows={4} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Slug (URL)</label>
          <input required type="text" name="slug" value={formData.slug} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Categoría</label>
          <input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Estado</label>
          <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none">
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="SOLD_OUT">SOLD_OUT</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Fecha</label>
          <input required type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none [color-scheme:dark]" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Hora Inicio</label>
          <input required type="time" name="start_time" value={formData.start_time} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none [color-scheme:dark]" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Precio (€)</label>
          <input required type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Capacidad</label>
          <input required type="number" name="capacity" value={formData.capacity} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Imagen de Portada</label>
          <div className="flex items-center gap-4">
            {formData.cover_image && (
              <div className="w-16 h-16 relative flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={formData.cover_image} alt="Preview" className="w-full h-full object-cover border border-[var(--color-charcoal)]" />
              </div>
            )}
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileChange} 
              disabled={isUploading}
              className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-transparent focus:border-[var(--color-gold)] outline-none file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-[var(--color-gold)] file:text-black hover:file:bg-[var(--color-gold-hover)] cursor-pointer" 
            />
          </div>
          {isUploading && <p className="text-[var(--color-gold)] text-xs mt-2 uppercase tracking-widest">Subiendo imagen...</p>}
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Host (Opcional)</label>
          <input type="text" name="host" value={formData.host} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
        </div>
        
        <div className="md:col-span-2 border-t border-[var(--color-charcoal)] pt-6 mt-2">
          <div className="flex justify-between items-center mb-4">
            <label className="block text-xs uppercase tracking-widest text-gray-500">Invitados / Expertos (Opcional)</label>
            <button type="button" onClick={addGuest} className="text-[var(--color-gold)] text-xs uppercase tracking-widest border border-[var(--color-gold)] px-3 py-1 hover:bg-[var(--color-gold)] hover:text-black transition-colors">+ Añadir Invitado</button>
          </div>
          
          {(formData.guests || []).map((guest: unknown, index: number) => (
            <div key={index} className="bg-[#0a0a0a] border border-[var(--color-charcoal)] p-4 mb-4 relative">
              <button type="button" onClick={() => removeGuest(index)} className="absolute top-2 right-2 text-red-500 text-xs uppercase tracking-widest hover:underline">Eliminar</button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                  <input type="text" value={guest.name} onChange={e => updateGuest(index, 'name', e.target.value)} className="w-full bg-black border border-[var(--color-charcoal)] p-2 text-white focus:border-[var(--color-gold)] outline-none text-sm" placeholder="Ej. Joan Roca" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cargo / Especialidad</label>
                  <input type="text" value={guest.role} onChange={e => updateGuest(index, 'role', e.target.value)} className="w-full bg-black border border-[var(--color-charcoal)] p-2 text-white focus:border-[var(--color-gold)] outline-none text-sm" placeholder="Ej. Sumiller" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Empresa / Proyecto</label>
                  <input type="text" value={guest.company} onChange={e => updateGuest(index, 'company', e.target.value)} className="w-full bg-black border border-[var(--color-charcoal)] p-2 text-white focus:border-[var(--color-gold)] outline-none text-sm" placeholder="Ej. El Celler de Can Roca" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Foto</label>
                  <div className="flex items-center gap-2">
                    {guest.photo && <img src={guest.photo} className="w-10 h-10 object-cover border border-[var(--color-charcoal)]" alt="foto" />}
                    <input type="file" accept="image/*" disabled={isUploading} onChange={e => handleGuestPhotoChange(index, e)} className="text-xs text-transparent w-full file:mr-2 file:py-1 file:px-2 file:border-0 file:text-xs file:font-bold file:uppercase file:bg-[var(--color-gold)] file:text-black hover:file:bg-[var(--color-gold-hover)] cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 py-4">
        <input type="checkbox" name="includes_alcohol" checked={formData.includes_alcohol} onChange={handleChange} id="alcohol" className="w-5 h-5 accent-[var(--color-gold)]" />
        <label htmlFor="alcohol" className="text-sm text-gray-300">Incluye Alcohol (+18)</label>
      </div>

      <div className="pt-6 border-t border-[var(--color-charcoal)] flex justify-end gap-4">
        <button type="button" onClick={() => router.back()} className="px-6 py-3 text-sm text-gray-400 uppercase tracking-widest hover:text-white transition-colors">Cancelar</button>
        <button type="submit" disabled={loading || isUploading} className="bg-[var(--color-gold)] text-black px-8 py-3 uppercase tracking-widest font-bold hover:bg-[var(--color-gold-hover)] transition-colors disabled:opacity-50">
          {loading ? "Guardando..." : "Guardar Cata"}
        </button>
      </div>
    </form>
  );
}
