import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { WorkspaceProvider } from "@/hooks/use-image";
import { ThemeProvider } from "@/hooks/use-theme";

export const metadata: Metadata = {
  title: "Bat Signal | Computational Imaging Laboratory",
  description: "Minimal computational imaging instrument for 2D signal processing and 4f optical DRPE encryption",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
      <body className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#181818] dark:bg-[#101010] dark:text-[#F2F2F0] antialiased selection:bg-[#2563EB]/15 dark:selection:bg-[#5B8CFF]/20 selection:text-inherit">
        <ThemeProvider>
          <WorkspaceProvider>
            <Header />
            <div className="flex flex-1 w-full">
              <Sidebar />
              <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 max-w-6xl">
                {children}
              </main>
            </div>
            <Footer />
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
