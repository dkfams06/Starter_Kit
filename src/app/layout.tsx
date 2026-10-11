import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Work Management Starter Kit",
  description: "Next.js, Prisma, and PostgreSQL starter foundation",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
