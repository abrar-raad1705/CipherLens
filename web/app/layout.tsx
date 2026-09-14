import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WorkspaceProvider } from "@/hooks/use-image";
import { ThemeProvider } from "@/hooks/use-theme";

export const metadata: Metadata = {
  title: "CipherLens | Computational Imaging Laboratory",
  description: "Minimalist 2D Signal Processing and Optical Image Encryption Platform",
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
      <body className="min-h-screen flex flex-col bg-white text-[#37352F] dark:bg-[#191919] dark:text-[#E6E5E3] antialiased selection:bg-[#2383E2]/20 selection:text-inherit">
        <ThemeProvider>
          <WorkspaceProvider>
            <Header />
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
              {children}
            </main>
            <Footer />
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
