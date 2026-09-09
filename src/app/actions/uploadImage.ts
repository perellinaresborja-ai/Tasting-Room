"use server";

import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

export async function uploadImageAction(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No se encontró ningún archivo." };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: "Faltan credenciales de Supabase." };
    }

    // Usamos service_role para saltarnos las políticas RLS del storage
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Convert File to ArrayBuffer for Supabase upload via node
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminSupabase.storage
      .from('tastings')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      return { success: false, error: `Error subiendo imagen: ${uploadError.message}` };
    }

    const { data: { publicUrl } } = adminSupabase.storage
      .from('tastings')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) || "Error desconocido" };
  }
}
