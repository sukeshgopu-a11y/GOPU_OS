import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Social Content Automation',
  description: 'Daily poster, approval, and publishing automation.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.11),transparent_34%),#0b1120]">
          <header className="border-b border-slate-800/80 bg-slate-950/65 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
              <Link href="/" className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
                Content Automation
              </Link>
              <nav className="flex items-center gap-2 text-sm text-slate-300">
                <Link className="rounded-lg px-3 py-2 hover:bg-slate-800" href="/">
                  Daily Runs
                </Link>
                <Link className="rounded-lg px-3 py-2 hover:bg-slate-800" href="/settings">
                  Settings
                </Link>
              </nav>
            </div>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
