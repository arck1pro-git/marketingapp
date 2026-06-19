'use client';

import { usePathname } from 'next/navigation';
import { TITLES } from './Header';

export default function PageTitle() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? 'Agilizy.AI';

  return (
    <div className="flex items-center gap-2.5 px-6 pt-4">
      <span className="h-4 w-1 rounded-full bg-gold" />
      <h2 className="text-base font-semibold text-txt">{title}</h2>
    </div>
  );
}
