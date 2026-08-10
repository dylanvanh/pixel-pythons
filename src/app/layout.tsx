import type { Metadata } from "next";
import "./globals.css";
import { LaserEyesProvider } from "@omnisat/lasereyes";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Pixel Pythons | Bitcoin Ordinals Minting Platform",
  description:
    "Mint Bitcoin Ordinals with a simple, secure, and user-friendly interface. Create and collect unique digital assets on the Bitcoin blockchain.",
  keywords: [
    "Bitcoin",
    "Ordinals",
    "NFT",
    "Digital Assets",
    "Blockchain",
    "Pixel Pythons",
  ],
  authors: [{ name: "https://github.com/dylanvanh" }],
  openGraph: {
    title: "Pixel Pythons | Bitcoin Ordinals Minting Platform",
    description:
      "Create and collect unique digital assets on the Bitcoin blockchain",
    url: "https://pixelpythons.com",
    siteName: "Pixel Pythons",
    images: [
      {
        url: "/pixel-python.png",
        width: 1200,
        height: 1200,
        alt: "Pixel Python - Bitcoin Ordinals Minting Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gradient-to-b from-blue-50 to-blue-100">
        <LaserEyesProvider>
          {children}
          <Toaster />
          <Footer />
        </LaserEyesProvider>
      </body>
    </html>
  );
}
