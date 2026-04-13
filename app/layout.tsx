import type { Metadata } from "next";
import { Geist } from "next/font/google";
import AppNav from "../components/AppNav";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist"
});

export const metadata: Metadata = {
  title: "Maharashtra PFZ Map",
  description: "Leaflet map for INCOIS Potential Fishing Zone advisory locations in Maharashtra"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={geist.variable}>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
