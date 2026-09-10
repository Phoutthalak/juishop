import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Outfit, Noto_Sans_Lao } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const plex = IBM_Plex_Mono({
  variable: "--font-plex",
  weight: ["400", "500"],
  subsets: ["latin"],
});

const notoLao = Noto_Sans_Lao({
  variable: "--font-lao",
  weight: ["400", "500", "600"],
  subsets: ["lao"],
});

export const metadata: Metadata = {
  title: "AllNew Shop POS",
  description: "POS for clothes, gifts, and empty boxes — Cash & QR, THB & LAK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="lo">
      <body
        className={`${outfit.variable} ${fraunces.variable} ${plex.variable} ${notoLao.variable} antialiased font-lao`}
      >
        <div className="mx-auto flex min-h-dvh max-w-[1400px] flex-col px-3 py-3 sm:px-5">
          <AppNav />
          <main className="mt-3 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
