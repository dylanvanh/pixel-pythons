"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/features/bitcoin/components/ui/dialog";

interface DisclaimerModalProps {
  children: React.ReactNode;
}

export function DisclaimerModal({ children }: DisclaimerModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-bold bg-white text-black px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0)] max-md:top-auto max-md:bottom-0 max-md:w-full max-md:max-w-none max-md:translate-y-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b-4 border-black bg-blue-400">
            <DialogTitle className="text-center text-2xl font-bold">Disclaimer</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-left">
            <p className="mb-4 font-bold">Important Notice:</p>
            <ul className="space-y-2 mb-4">
              <li>Always verify transaction details before signing.</li>
              <li>The owner is not responsible for any incorrect transactions you sign.</li>
              <li>Use this platform at your own risk.</li>
            </ul>
            <p className="font-bold border-t-2 border-black pt-4">
              By using this platform, you agree to these terms.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
