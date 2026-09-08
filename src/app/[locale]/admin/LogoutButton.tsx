"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export default function LogoutButton() {
  const supabase = createClient();
  const router = useRouter();
  const locale = useLocale();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  };

  return (
    <button 
      onClick={handleLogout}
      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-black transition-colors rounded-sm uppercase tracking-wider"
    >
      Cerrar Sesión
    </button>
  );
}
