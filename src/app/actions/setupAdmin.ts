"use server";

import { createClient } from "@supabase/supabase-js";

export async function setupAdminAction(formData: FormData) {
  const secret = formData.get("secret") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validSecret = process.env.SETUP_ADMIN_SECRET;
  if (!validSecret || secret !== validSecret) {
    return { success: false, error: "Clave secreta incorrecta o no configurada." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-supabase-project-url')) {
    return { success: false, error: "Supabase no está configurado. Revisa tu archivo .env.local (falta URL o SERVICE_ROLE_KEY)." };
  }

  // Use service role key to bypass RLS and create user directly
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    let userId = "";

    // 1. Try to create user in auth
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        // Find existing user
        const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers();
        if (listError) return { success: false, error: `Error listUsers: ${listError.message}` };
        
        const existingUser = usersData.users.find(u => u.email === email);
        if (!existingUser) {
          return { success: false, error: "El email existe pero no se pudo encontrar su ID." };
        }
        
        // Ensure password is updated if they provided one
        await adminSupabase.auth.admin.updateUserById(existingUser.id, { password });
        userId = existingUser.id;
      } else {
        return { success: false, error: `Error Auth: ${authError.message}` };
      }
    } else {
      userId = authData.user.id;
    }

    const randomToken = `admin-${Math.random().toString(36).substring(2, 10)}`;

    // 2. Upsert into public.profiles
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        first_name: "Administrador",
        role: "ADMIN",
        public_token: randomToken
      }, { onConflict: 'id' });

    if (profileError) {
      return { success: false, error: `Error BD Perfil: ${profileError.message}` };
    }

    return { success: true };

  } catch (error: unknown) {
    return { success: false, error: (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) || "Error desconocido" };
  }
}
