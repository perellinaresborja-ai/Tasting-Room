/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function saveTastingAction(dataToSave: Record<string, unknown>, id?: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: "Faltan credenciales de Supabase." };
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Clean up immutable fields if present
    const payload = { ...dataToSave };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    let res;
    if (id) {
      res = await adminSupabase.from('tastings').update(payload).eq('id', id);
    } else {
      res = await adminSupabase.from('tastings').insert([payload]);
    }

    if (res.error) {
      if (res.error.message?.includes('gallery_images')) {
        return { 
          success: false, 
          error: "Para guardar fotos en la galería, ejecuta primero en el SQL Editor de Supabase: ALTER TABLE tastings ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}'::TEXT[];" 
        };
      }
      return { success: false, error: res.error?.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) || "Error desconocido" };
  }
}

export async function deleteTastingAction(id: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: "Faltan credenciales de Supabase." };
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
    const res = await adminSupabase.from('tastings').delete().eq('id', id);

    if (res.error) {
      // Si hay error por foreign key (reservas asociadas), devolvemos un mensaje más claro
      if (res.error.code === '23503') {
         return { success: false, error: "No se puede eliminar la cata porque tiene reservas o asistentes asociados." };
      }
      return { success: false, error: res.error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
