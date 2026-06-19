'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

const links = [
  {
    href: '/decisor',
    label: 'Decisor',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="8" y1="22" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    href: '/pautas',
    label: 'Material',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6z" />
      </svg>
    ),
  },
  {
    href: '/auditorias',
    label: 'Auditorias',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 4h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1V5a1 1 0 0 1 1-1z" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/roteiros',
    label: 'Roteiros',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    href: '/carrossel',
    label: 'Carrosséis',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="4" width="10" height="16" rx="2" />
        <path d="M4 7v10M20 7v10" />
      </svg>
    ),
  },
  {
    href: '/calendario',
    label: 'Calendário',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="16" y1="2" x2="16" y2="6" />
      </svg>
    ),
  },
  {
    href: '/contexto',
    label: 'Contexto',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <circle cx="9" cy="6" r="2" fill="currentColor" />
        <circle cx="15" cy="12" r="2" fill="currentColor" />
        <circle cx="10" cy="18" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

export const TITLES: Record<string, string> = {
  '/': 'Início',
  '/decisor': 'Decisor',
  '/pautas': 'Material',
  '/auditorias': 'Auditorias',
  '/roteiros': 'Roteiros',
  '/carrossel': 'Carrosséis',
  '/calendario': 'Calendário Editorial',
  // Páginas fora da navegação, mas ainda acessíveis por URL:
  '/transcricao': 'Transcrever Vídeo',
  '/email': 'Gerar Email',
  '/contexto': 'Contexto',
};

// Itens que ficam no menu do toggle (em vez dos índices centralizados).
const MENU_HREFS = ['/auditorias', '/contexto'];

export default function Header({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = links.filter((l) => !MENU_HREFS.includes(l.href));
  const menuLinks = links.filter((l) => MENU_HREFS.includes(l.href));

  return (
    <header className="sticky top-0 z-40 bg-linear-to-r from-dark-darker via-dark to-dark-lighter border-4 border-sky-200 m-2 rounded-2xl px-6 py-2.5 flex items-center gap-4">
      <span className="text-white font-bold text-lg tracking-tight shrink-0">ARCK1PRO</span>

      <nav className="flex items-center justify-center gap-1 flex-wrap flex-1 min-w-0">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={isActive ? 'text-gold-light' : 'text-white/70 group-hover:text-white'}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Usuário + toggle (canto direito) */}
        <div className="flex items-center gap-3 shrink-0">
          {userName && (
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-white text-xs font-bold uppercase">
                {userName.charAt(0)}
              </span>
              <span className="text-white text-sm font-medium hidden sm:block max-w-32 truncate">
                {userName}
              </span>
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="flex items-center justify-center h-9 w-9 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>

            {menuOpen && (
              <>
                {/* clique fora fecha */}
                <button
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div className="absolute right-0 mt-2 w-44 bg-primary border border-txt/10 rounded-xl shadow-xl py-1 z-50">
                  {menuLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                          isActive ? 'text-gold' : 'text-txt/70 hover:text-txt hover:bg-txt/5'
                        }`}
                      >
                        {link.icon}
                        {link.label}
                      </Link>
                    );
                  })}

                  <div className="my-1 border-t border-txt/10" />

                  <button
                    onClick={() => signOut({ redirectTo: '/login' })}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-txt/70 hover:text-txt hover:bg-txt/5 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 4h3a2 2 0 0 1 2 2v14" />
                      <path d="M2 20h3" />
                      <path d="M13 20h9" />
                      <path d="M10 12v.01" />
                      <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z" />
                    </svg>
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
    </header>
  );
}
