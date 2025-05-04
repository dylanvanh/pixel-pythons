"use client";

import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface DisclaimerModalProps {
  children: React.ReactNode;
}

export function DisclaimerModal({ children }: DisclaimerModalProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const disclaimerContent = (
    <div className="p-4 text-left">
      <p className="mb-4 font-bold">Important Notice:</p>
      <ul className="space-y-2 mb-4">
        <li>Always verify transaction details before signing.</li>
        <li>
          The owner is not responsible for any incorrect transactions you sign.
        </li>
        <li>Use this platform at your own risk.</li>
      </ul>
      <p className="font-bold border-t-2 border-black pt-4">
        By using this platform, you agree to these terms.
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button className="text-xs font-bold bg-white text-black px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            {children}
          </button>
        </DrawerTrigger>
        <DrawerContent className="px-0 pt-0 pb-0 border-t-4 border-black">
          <DrawerHeader className="px-6 pt-5 pb-3 border-b-4 border-black bg-blue-400">
            <DrawerTitle className="text-center text-2xl font-bold">
              Disclaimer
            </DrawerTitle>
          </DrawerHeader>
          {disclaimerContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs font-bold bg-white text-black px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] rounded-none max-w-xl">
        <DialogHeader className="px-6 pt-5 pb-3 border-b-4 border-black bg-blue-400">
          <DialogTitle className="text-center text-2xl font-bold">
            Disclaimer
          </DialogTitle>
        </DialogHeader>
        {disclaimerContent}
      </DialogContent>
    </Dialog>
  );
}
