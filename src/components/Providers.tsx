"use client";

import React, { ReactNode } from "react";
import { LaserEyesProvider } from "@omnisat/lasereyes-react";

export function Providers({ children }: { children: ReactNode }) {
  return <LaserEyesProvider>{children}</LaserEyesProvider>;
} 