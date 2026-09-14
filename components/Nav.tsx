"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBox, IconChart, IconMegaphone, IconRoute } from "./icons";

const ITEMS = [
  { href: "/", label: "Pedidos", icon: IconRoute },
  { href: "/inventario", label: "Inventario", icon: IconBox },
  { href: "/publicidad", label: "Publicidad", icon: IconMegaphone },
  { href: "/resumen", label: "Resumen", icon: IconChart },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Escritorio: barra lateral fija */}
      <nav
        aria-label="Secciones"
        className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:border-r md:border-line md:bg-surface md:py-8 md:px-4 md:gap-1"
      >
        <div className="px-3 pb-6">
          <p className="font-display text-2xl text-ink">Panel de ventas</p>
          <p className="text-sm text-ink-muted">Chaquetas · Jellycat</p>
        </div>
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-3 text-[15px] font-medium transition-colors ${
                active
                  ? "bg-accent-soft text-accent-strong"
                  : "text-ink-muted hover:bg-paper hover:text-ink"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Celular: barra inferior fija */}
      <nav
        aria-label="Secciones"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface md:hidden"
      >
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 min-h-16 text-xs font-medium ${
                active ? "text-accent-strong" : "text-ink-muted"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={22} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
