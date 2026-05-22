import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Politiek voor Iedereen",
  description:
    "Plenaire debatten van de Tweede Kamer, uitgelegd in gewone taal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl flex-col px-6 py-5">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight text-slate-900"
            >
              Politiek voor Iedereen
            </Link>
            <p className="text-sm text-slate-500">
              Kamerdebatten in gewone taal
            </p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-3xl px-6 py-6 text-sm text-slate-500">
            Politiek voor Iedereen vat openbare verslagen van de Tweede Kamer
            samen. De samenvattingen worden automatisch gemaakt — raadpleeg bij
            twijfel altijd het officiële verslag.
          </div>
        </footer>
      </body>
    </html>
  );
}
