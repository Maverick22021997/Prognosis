import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";

import Header from "@/components/Header";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "PROGNOSIS.IO — платформа коллективного прогнозирования",
  description:
    "prognosis.io — платформа коллективного прогнозирования. Оценивайте вероятность событий, проверяйте точность своих прогнозов и соревнуйтесь с другими участниками.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased`}
      >
        <Header />

        {children}
      </body>
    </html>
  );
}