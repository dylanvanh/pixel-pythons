import type { Transactions } from "@/store/mint-store";

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
        <button
          onClick={signCommitTransaction}
          disabled={isLoading || !paymentAddress}
          className="inline-flex flex-1 items-center justify-center bg-black text-white border-4 border-black font-bold text-lg hover:bg-white hover:text-black transition duration-200 disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading ? "Signing..." : "Sign"}
        </button>
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
        <button
          onClick={resetMintProcess}
          disabled={isLoading}
          className="inline-flex items-center justify-center bg-white text-black border-4 border-black px-4 py-2 hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
