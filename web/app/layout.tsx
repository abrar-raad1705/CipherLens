import React from "react";
import type { Metadata } from "next";
import { DM_Serif_Display, Caveat, Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { WorkspaceProvider } from "@/hooks/use-image";
import { ThemeProvider } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const dmSerifDisplay = DM_Serif_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const doodleFont = Caveat({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-doodle",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CipherLens | Computational Imaging Laboratory",
  description: "Minimal computational imaging instrument for 2D signal processing and 4f optical DRPE encryption",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(dmSerifDisplay.variable, doodleFont.variable, "font-sans", geist.variable)}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('cipherlens_theme') || localStorage.getItem('bat_signal_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = saved ? saved : (prefersDark ? 'dark' : 'light');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${dmSerifDisplay.variable} h-screen flex flex-col bg-[#FAFAF8] text-[#181818] dark:bg-[#101010] dark:text-[#F2F2F0] antialiased selection:bg-[#2563EB]/15 dark:selection:bg-[#5B8CFF]/20 selection:text-inherit text-sm overflow-hidden`}>
        <ThemeProvider>
          <WorkspaceProvider>
            <React.Suspense fallback={null}>
              <NavigationProgress />
            </React.Suspense>
            <Header />
            <div className="flex flex-1 w-full min-h-0 overflow-hidden">
              <Sidebar />
              <div id="main-scroll-container" className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto overflow-x-hidden">
                <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 max-w-7xl w-full">
                  {children}
                </main>
                <Footer />
              </div>
            </div>
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
