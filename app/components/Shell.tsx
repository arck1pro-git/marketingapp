'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import PageTitle from './PageTitle';

// Esconde a sidebar/header em telas sem layout de app (ex.: /login).
const BARE_ROUTES = ['/login'];

export default function Shell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string | null;
}) {
  const pathname = usePathname();

  if (BARE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <Header userName={userName} />
      <PageTitle />
      <div className="flex-1 px-40">{children}</div>
    </div>
  );
}
