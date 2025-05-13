import type { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-4 shadow-md bg-primary">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">
            Letter Leap
          </h1>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} Letter Leap. Learn to type, one leap at a time!
      </footer>
    </div>
  );
}
