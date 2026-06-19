import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Shell from "./components/Shell";
import { auth } from "@/auth";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Agilizy.AI",
  description: "Marketing automation tools",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="pt-BR"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-primary text-txt">
        <Shell userName={session?.user?.name ?? null}>{children}</Shell>
      </body>
    </html>
  );
}
