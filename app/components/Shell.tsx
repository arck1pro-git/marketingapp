'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

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
    <>
      <Sidebar userName={userName} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header />
        <div className="flex-1">{children}</div>
      </div>
    </>
  );
}
