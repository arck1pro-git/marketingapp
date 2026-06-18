'use client';

import { usePathname } from 'next/navigation';

const TITLES: Record<string, string> = {
  '/': 'Decisor',
  '/pautas': 'Material',
  '/auditorias': 'Auditorias',
  '/roteiros': 'Roteiros',
  '/carrossel': 'Carrosséis',
  '/calendario': 'Calendário Editorial',
  // Páginas fora da sidebar, mas ainda acessíveis por URL:
  '/transcricao': 'Transcrever Vídeo',
  '/email': 'Gerar Email',
  '/contexto': 'Contexto',
};

export default function Header() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? 'Agilizy.AI';

  return (
    <header className="sticky top-0 z-40 bg-linear-to-r from-dark-darker via-dark to-dark-lighter m-2 flex rounded-full items-center gap-2.5 h-14 px-10">
      <span className="h-4 w-1 rounded-full bg-gold" />
      <h2 className="text-base text-white">{title}</h2>
    </header>
  );
}
