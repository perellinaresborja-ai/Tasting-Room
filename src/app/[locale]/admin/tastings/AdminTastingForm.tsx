/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { translateEsToEn } from "@/app/actions/translate";
import { uploadImageAction } from "@/app/actions/uploadImage";
import { saveTastingAction } from "@/app/actions/saveTasting";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export type InitialTastingData = {
  id?: string;
  title_es?: string;
  title_en?: string;
  description_es?: string;
  description_en?: string;
  date?: string;
  start_time?: string;
  price?: number;
  capacity?: number;
  includes_alcohol?: boolean;
  cover_image?: string;
  gallery_images?: string[];
  seo_title?: string;
  seo_description?: string;
  slug?: string;
  status?: string;
  host?: string;
  category?: string;
  end_time?: string;
  subtitle_es?: string;
  subtitle_en?: string;
  guests?: { name: string; role: string; company?: string; photo?: string; avatar_url?: string }[];
};

export default function AdminTastingForm({ initialData = null }: { initialData?: InitialTastingData | null /* eslint-disable-line @typescript-eslint/no-explicit-any */ }) {
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
    cover_image: "",
    gallery_images: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();
  const locale = useLocale();

  const handleTranslateDesc = async () => {
    if (!formData.description_es) return;
    try {
      const res = await translateEsToEn(formData.description_es);
      if (res.success && res.translation) {
        setFormData((prev: InitialTastingData) => ({ ...prev, description_en: res.translation }));
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
    setUploadProgressText("Subiendo imagen de portada...");
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await uploadImageAction(data);
      if (res.success && res.url) {
        setFormData((prev: InitialTastingData) => ({ ...prev, cover_image: res.url }));
      } else {
        alert(res.error || "Error al subir la imagen");
      }
    } catch (error) {
      alert("Error de conexión al subir la imagen");
    } finally {
      setIsUploading(false);
      setUploadProgressText(null);
    }
  };

  const handleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgressText(`Subiendo foto ${i + 1} de ${files.length}...`);
        const data = new FormData();
        data.append('file', files[i]);
        const res = await uploadImageAction(data);
        if (res.success && res.url) {
          uploadedUrls.push(res.url);
        } else {
          alert(`Error al subir ${files[i].name}: ${res.error || 'Desconocido'}`);
        }
      }

      if (uploadedUrls.length > 0) {
        setFormData((prev: InitialTastingData) => ({
          ...prev,
          gallery_images: [...(prev.gallery_images || []), ...uploadedUrls]
        }));
      }
    } catch (err) {
      alert("Error al subir fotos de la galería");
    } finally {
      setIsUploading(false);
      setUploadProgressText(null);
      e.target.value = '';
    }
  };

  const removeGalleryImage = (indexToRemove: number) => {
    setFormData((prev: InitialTastingData) => ({
      ...prev,
      gallery_images: (prev.gallery_images || []).filter((_: any, idx: number) => idx !== indexToRemove)
    }));
  };

  const addGuest = () => {
    setFormData((prev: InitialTastingData) => ({ ...prev, guests: [...(prev.guests || []), { name: '', role: '', company: '', photo: '' }] }));
  };

  const updateGuest = (index: number, field: string, value: string) => {
    setFormData((prev: InitialTastingData) => {
      const newGuests = [...(prev.guests || [])];
      newGuests[index] = { ...newGuests[index], [field]: value };
      return { ...prev, guests: newGuests };
    });
  };

  const removeGuest = (index: number) => {
    setFormData((prev: InitialTastingData) => {
      const newGuests = [...(prev.guests || [])];
      newGuests.splice(index, 1);
      return { ...prev, guests: newGuests };
    });
  };

  const handleGuestPhotoChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    setUploadProgressText("Subiendo foto de invitado...");
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
      setUploadProgressText(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: InitialTastingData /* eslint-disable-line @typescript-eslint/no-explicit-any */) => ({
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
    if (!dataToSave.gallery_images || dataToSave.gallery_images.length === 0) {
      delete dataToSave.gallery_images;
    }

    const res = await saveTastingAction(dataToSave, initialData?.id);
  
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
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Imagen de Portada Principal</label>
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
        </div>

        {/* GALERÍA DE FOTOS ADICIONALES */}
        <div className="md:col-span-2 border-t border-[var(--color-charcoal)] pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400">
                Galería de Fotos Adicionales (Opcional)
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Sube fotos adicionales (botellas, platos, detalles) para que los clientes vean un carrusel interactivo en la web.
              </p>
            </div>
            <label className="cursor-pointer bg-[#1e1e1e] hover:bg-[var(--color-gold)] hover:text-black text-[var(--color-gold)] border border-[var(--color-gold)] px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
              <span>+ Añadir Fotos</span>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                disabled={isUploading} 
                onChange={handleGalleryFilesChange} 
                className="hidden" 
              />
            </label>
          </div>

          {(formData.gallery_images || []).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
              {(formData.gallery_images || []).map((imgUrl: string, idx: number) => (
                <div key={idx} className="relative group aspect-square border border-[var(--color-charcoal)] bg-black overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(idx)}
                    className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar foto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {uploadProgressText && (
          <div className="md:col-span-2">
            <p className="text-[var(--color-gold)] text-xs uppercase tracking-widest animate-pulse">
              ⏳ {uploadProgressText}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Host (Opcional)</label>
          <input type="text" name="host" value={formData.host} onChange={handleChange} className="w-full bg-black border border-[var(--color-charcoal)] p-3 text-white focus:border-[var(--color-gold)] outline-none" />
        </div>
        
        <div className="md:col-span-2 border-t border-[var(--color-charcoal)] pt-6 mt-2">
          <div className="flex justify-between items-center mb-4">
            <label className="block text-xs uppercase tracking-widest text-gray-500">Invitados / Expertos (Opcional)</label>
            <button type="button" onClick={addGuest} className="text-[var(--color-gold)] text-xs uppercase tracking-widest border border-[var(--color-gold)] px-3 py-1 hover:bg-[var(--color-gold)] hover:text-black transition-colors">+ Añadir Invitado</button>
          </div>
          
          {(formData.guests || []).map((guest: { name: string; role: string; company?: string; photo?: string; avatar_url?: string }, index: number) => (
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
