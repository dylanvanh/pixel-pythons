import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LaserEyesProvider } from "@omnisat/lasereyes";
import { AddressDebug } from "@/components/dev/AddressDebug";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ordinal Mint",
  description: "Mint Bitcoin Ordinals with a minimalist interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const commit = env.VERCEL_GIT_COMMIT_SHA;
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LaserEyesProvider>
          {children}
          <AddressDebug />
          <Toaster />

          <footer>
            <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-300 p-1.5 text-center opacity-70 hover:opacity-100 transition-opacity">
              <div className="flex justify-center items-center max-w-xl mx-auto">
                <p className="text-[10px] text-gray-600">
                  Use at your own risk.
                </p>
                <div className="h-3 mx-3 border-r border-gray-300"></div>
                <a
                  href="https://github.com/dylanvanh/ordinal-mint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="GitHub"
                >
                  GitHub
                </a>
                {commit && (
                  <>
                    <div className="h-3 mx-3 border-r border-gray-300"></div>
                    <a
                      href={`https://github.com/dylanvanh/ordinal-mint/commit/${commit}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Commit: {commit}
                    </a>
                  </>
                )}
              </div>
            </div>
          </footer>
        </LaserEyesProvider>
      </body>
    </html>
  );
}
