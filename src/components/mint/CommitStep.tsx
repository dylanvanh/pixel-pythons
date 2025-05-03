import { Button } from "@/components/ui/button";
import { Transactions } from "./types";

interface CommitStepProps {
  isLoading: boolean;
  transactions: Transactions;
  paymentAddress: string | null;
  signCommitTransaction: () => Promise<void>;
  resetMintProcess: () => void;
}

export function CommitStep({
  isLoading,
  transactions,
  paymentAddress,
  signCommitTransaction,
  resetMintProcess,
}: CommitStepProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 border-4 border-black bg-white">
        <h3 className="text-lg font-bold mb-2">
          Step 1: Commit Transaction
        </h3>
        <p className="text-sm mb-2">
          Please sign the commit transaction to proceed.
        </p>
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div className="bg-black h-full w-1/2 animate-pulse"></div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button
          onClick={signCommitTransaction}
          disabled={isLoading || !paymentAddress}
          className="flex-1 bg-black text-white border-4 border-black font-bold text-lg hover:bg-white hover:text-black transition duration-200"
        >
          {isLoading ? "Signing..." : "Sign"}
        </Button>
        {transactions.commitSigned &&
          transactions.commitTxid &&
          !isLoading && (
            <a
              href={`https://ordiscan.com/tx/${transactions.commitTxid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 border-4 border-black font-bold text-black hover:bg-blue-300 transition-colors"
            >
              View TX
            </a>
          )}
        <Button
          onClick={resetMintProcess}
          disabled={isLoading}
          className="bg-white text-black border-4 border-black hover:bg-gray-100"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
