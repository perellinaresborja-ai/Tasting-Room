import { requireAdmin } from "@/lib/supabase/adminAuth";
import { LogOut } from "lucide-react";
import LogoutButton from "./LogoutButton";

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const {locale} = await params;
  const { profile } = await requireAdmin(locale);
  
  const navItems = [
    { name: "Dashboard", href: `/${locale}/admin` },
    { name: "Catas", href: `/${locale}/admin/tastings` },
    { name: "Reservas", href: `/${locale}/admin/reservations` },
    { name: "Clientes", href: `/${locale}/admin/clients` },
    { name: "Suscriptores", href: `/${locale}/admin/subscribers` },
    { name: "Scanner", href: `/${locale}/admin/scanner` },
    { name: "Estadísticas", href: `/${locale}/admin/statistics` },
    { name: "Comunicaciones", href: `/${locale}/admin/communications` },
    { name: "Inteligencia", href: `/${locale}/admin/intelligence` },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-[#141414] border-r border-[var(--color-charcoal)] flex flex-col">
        <div className="p-6 border-b border-[var(--color-charcoal)]">
          <h2 className="text-xl font-serif text-[var(--color-gold)] uppercase tracking-widest">Admin</h2>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{profile.first_name ? `${profile.first_name} ${profile.last_name || ''}` : profile.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <a 
              key={item.href} 
              href={item.href}
              className="block px-4 py-3 text-sm text-gray-300 hover:text-[var(--color-gold)] hover:bg-black transition-colors rounded-sm uppercase tracking-wider"
            >
              {item.name}
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-[var(--color-charcoal)]">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
