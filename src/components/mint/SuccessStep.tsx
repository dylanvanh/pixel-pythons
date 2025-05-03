import { Button } from "@/components/ui/button";
import { Transactions } from "./types";

interface SuccessStepProps {
  transactions: Transactions;
  resetMintProcess: () => void;
}

export function SuccessStep({
  transactions,
  resetMintProcess,
}: SuccessStepProps) {
  return (
    <div className="space-y-4">
      <div className="p-6 border-4 border-black bg-green-200">
        <h3 className="text-xl font-bold mb-4 text-center">
          Mint Successful! 🎉
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-bold">Commit TX:</span>
            <a
              href={`https://ordiscan.com/tx/${transactions.commitTxid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-2 decoration-black underline-offset-4 font-medium hover:bg-blue-300 transition-colors px-2"
            >
              View
            </a>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-bold">Reveal TX:</span>
            <a
              href={`https://ordiscan.com/tx/${transactions.revealTxid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-2 decoration-black underline-offset-4 font-medium hover:bg-blue-300 transition-colors px-2"
            >
              View
            </a>
          </div>
        </div>
      </div>

      <Button
        onClick={resetMintProcess}
        className="w-full bg-black text-white border-4 border-black font-bold text-lg hover:bg-white hover:text-black transition duration-200"
      >
        Mint Another
      </Button>
    </div>
  );
}
