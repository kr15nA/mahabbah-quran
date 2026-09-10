import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mahabbah Qur'an — Yayasan Rumah Tahfizh",
  description: "Sistem Informasi & Laporan Pembelajaran Santri Rumah Tahfizh Mahabbah Qur'an",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F0EDF9]">{children}</body>
    </html>
  );
}
