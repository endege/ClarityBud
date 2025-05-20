
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import SidebarNav from '@/components/layout/sidebar-nav';
import { Toaster } from "@/components/ui/toaster";
import { CurrencyProvider } from '@/contexts/currency-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ClarityBud',
  description: 'Budgeting and expense tracking made clear.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
<html lang="en" className="dark"><CurrencyProvider><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SidebarProvider>
          <Sidebar collapsible="icon">
            <SidebarHeader className="p-4 flex flex-col items-stretch justify-between gap-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-primary group-data-[collapsible=icon]:hidden">ClarityBud</h1>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarNav />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 md:hidden">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-lg font-semibold text-primary md:hidden">ClarityBud</h1>
            </header>
            <main className="flex-1 p-4 sm:p-6">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body></CurrencyProvider></html>
  );
}
