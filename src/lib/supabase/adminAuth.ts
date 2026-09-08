import { createClient } from "./server";
import { redirect } from "next/navigation";

export async function requireAdmin(locale: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Fetch profile to check role
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  console.log("requireAdmin check:", { userId: user.id, profile, error });

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "STAFF")) {
    // If not authorized, could redirect to a not-authorized page or home
    redirect(`/${locale}/`);
  }

  return { user, profile };
}
