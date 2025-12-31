import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import NavbarWithSidebar from "./components/sidebar-navabr";

/* Nunito Font Setup */
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "AIVerse App",
  description: "AIVerse Dashboard and CRM/ERP System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} antialiased bg-white text-black`}
      >
        <NavbarWithSidebar>
          {children}
        </NavbarWithSidebar>
      </body>
    </html>
  );
}

