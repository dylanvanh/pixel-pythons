"use client";

import { bitcoinAdapter, projectId, networks } from "@/config";
import { createAppKit } from "@reown/appkit/react";
import React, { type ReactNode } from "react";

if (!projectId) {
  throw new Error("Project ID is not defined");
}

// Set up metadata
const metadata = {
  name: "Ordinal Mint",
  description: "Mint your Bitcoin Ordinals",
  url: typeof window !== "undefined" ? window.location.origin : "", // origin will match your domain & subdomain
  icons: ["/logo.png"],
};

// Create the modal
export const modal = createAppKit({
  adapters: [bitcoinAdapter],
  projectId,
  networks,
  metadata,
  themeMode: "light",
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
    socials: [],
    email: false,
  },
  themeVariables: {
    "--w3m-accent": "#000000",
  },
});

function AppKitProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default AppKitProvider;

