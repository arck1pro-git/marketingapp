'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const links = [
  {
    href: '/',
    label: 'Decisor',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6z" />
      </svg>
    ),
  },
  {
    href: '/auditorias',
    label: 'Auditorias',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 4h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1V5a1 1 0 0 1 1-1z" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/roteiros',
    label: 'Roteiros',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="7" y="4" width="10" height="16" rx="2" />
        <path d="M4 7v10M20 7v10" />
      </svg>
    ),
  },
  {
    href: '/calendario',
    label: 'Calendário',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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

export default function Sidebar({ userName }: { userName: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-52 bg-dark z-50 flex flex-col gap-2 py-6 px-3">
      <div className="px-2 mb-8">
        <span className="text-white font-bold text-lg tracking-tight">
          ARCK1PRO
        </span>
        <p className="text-white/40 text-xs mt-0.5 tracking-wide uppercase">Marketing tools</p>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/55 hover:text-white hover:bg-white/5'
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

      <div className="mt-auto flex flex-col gap-1 pt-3 border-t border-white/10">
        {userName && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-white text-xs font-bold uppercase">
              {userName.charAt(0)}
            </span>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-white text-sm font-medium truncate">{userName}</span>
              <span className="text-white/40 text-[11px]">Conectado</span>
            </div>
          </div>
        )}

        <button
          onClick={() => signOut({ redirectTo: '/login' })}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 4h3a2 2 0 0 1 2 2v14" />
            <path d="M2 20h3" />
            <path d="M13 20h9" />
            <path d="M10 12v.01" />
            <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z" />
          </svg>
          Sair
        </button>
      </div>
    </aside>
  );
}
