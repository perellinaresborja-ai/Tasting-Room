import {defineRouting} from "next-intl/routing";
import {createNavigation} from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  pathnames: {
    '/admin/tastings/[id]': '/admin/tastings/[id]',
    '/admin/tastings/[id]/attendees': '/admin/tastings/[id]/attendees',
    '/admin/tastings/[id]/invitations': '/admin/tastings/[id]/invitations',
    '/admin/tastings/new': '/admin/tastings/new',
    "/": "/",
    "/tastings": { en: "/tastings", es: "/catas" },
    "/tastings/[slug]": { en: "/tastings/[slug]", es: "/catas/[slug]" },
    "/past-tastings": { en: "/past-tastings", es: "/catas-realizadas" },
    "/contact": { en: "/contact", es: "/contacto" },
    "/checkout": { en: "/checkout", es: "/reserva" },
    "/checkout/success": { en: "/checkout/success", es: "/reserva/exito" },
    "/checkout/cancel": { en: "/checkout/cancel", es: "/reserva/cancelada" },
    "/member": { en: "/member", es: "/cliente" },
    "/admin": "/admin",
    "/admin/communications": "/admin/communications",
    "/admin/intelligence": "/admin/intelligence",
    "/admin/statistics": "/admin/statistics",
    "/admin/reservations": "/admin/reservations",
    "/admin/clients": "/admin/clients",
    "/admin/subscribers": "/admin/subscribers",
    "/scanner": "/scanner",
    "/feedback/[id]": "/feedback/[id]"
  }
});

export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
