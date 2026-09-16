import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import TeamsProvider from "@/components/TeamsProvider";

export const metadata: Metadata = {
  title: "AlgoLMS - Enterprise Learning & Verification Platform",
  description: "Modern, gatekept learning management system with anti-skip video tracking and real-time skill assessments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased">
        <TeamsProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
            AlgoLMS Enterprise • Powered by FastAPI & Next.js
          </footer>
        </TeamsProvider>
      </body>
    </html>
  );
}
