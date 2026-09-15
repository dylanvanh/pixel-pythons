import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Footer } from "../features/bitcoin/components/Footer";
import { Toaster } from "../features/bitcoin/components/ui/sonner";

export const Route = createFileRoute("/bitcoin")({
  head: () => ({
    meta: [
      { title: "Pixel Pythons · Bitcoin" },
      { name: "description", content: "Create and collect Pixel Pythons inscriptions on Bitcoin." },
    ],
  }),
  component: () => (
    <>
      <Outlet />
      <Toaster />
      <Footer />
    </>
  ),
});
