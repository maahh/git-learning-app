import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Git Learning App v5",
  description: "A local Git learning app backed by real bash and real git.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
