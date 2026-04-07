import type { Metadata } from "next";
import "./globals.css";
import NextAuthProvider from "@/components/NextAuthProvider";
import ReduxProvider from "@/redux/ReduxProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CoWork - Coworking Space Booking",
  description: "Book your coworking space easily",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          <NextAuthProvider>
            <Navbar />
            {children}
          </NextAuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
