import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/AuthProvider";
import GlobalNavWrapper from "@/components/GlobalNavWrapper";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://weclout.example"),
  title: "WeClout — Your Region. Your Clout.",
  description:
    "Compete with your state and district. Donate, rank up, and build real clout.",
  openGraph: {
    title: "WeClout — Your Region. Your Clout.",
    description:
      "Compete with your state and district. Donate, rank up, and build real clout.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          <GlobalNavWrapper />
          {children}
          <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
