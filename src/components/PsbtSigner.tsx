"use client";

import { useState } from "react";
import { useLaserEyes } from "@omnisat/lasereyes";
import { Button } from "@/components/ui/button";

export default function PsbtSigner() {
  const { signPsbt, address, paymentAddress, publicKey, paymentPublicKey } =
    useLaserEyes();
  const [psbt, setPsbt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [txid, setTxid] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [signingType, setSigningType] = useState<"commit" | "reveal" | null>(
    null,
  );

  const handleSignTransaction = async (type: "commit" | "reveal") => {
    const signingAddress = type === "commit" ? paymentAddress : address;

    if (!signingAddress || !psbt) {
      setError(
        `${type === "commit" ? "Payment address" : "Ordinals address"} or PSBT is missing`,
      );
      return;
    }

    setIsLoading(true);
    setError(undefined);
    setTxid(undefined);
    setSigningType(type);

    try {
      console.log(`Signing ${type} transaction with address:`, signingAddress);

      const result = await signPsbt({
        tx: psbt,
        finalize: true,
        broadcast: true,
        inputsToSign: [{ index: 0, address: signingAddress }],
      });

      console.log(`Signed ${type} transaction result:`, result);

      if (result && result.txId) {
        setTxid(result.txId);
      }
    } catch (error) {
      console.error(`Error signing ${type} transaction:`, error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format public keys for display
  const formatPublicKey = (pubKey?: string) => {
    if (!pubKey) return "Not available";
    return pubKey.length > 16
      ? `${pubKey.slice(0, 8)}...${pubKey.slice(-8)}`
      : pubKey;
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <h2 className="text-xl font-bold">Sign PSBT</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="psbt" className="text-sm font-medium">
          PSBT (Base64)
        </label>
        <textarea
          id="psbt"
          value={psbt}
          onChange={(e) => setPsbt(e.target.value)}
          className="min-h-[100px] p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
          placeholder="Paste your PSBT here..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => handleSignTransaction("commit")}
          disabled={isLoading || !psbt || !paymentAddress}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
        >
          {isLoading && signingType === "commit"
            ? "Signing..."
            : "Sign Commit (Payment)"}
        </Button>

        <Button
          onClick={() => handleSignTransaction("reveal")}
          disabled={isLoading || !psbt || !address}
          className="w-full mt-2 bg-orange-500 hover:bg-orange-600"
        >
          {isLoading && signingType === "reveal"
            ? "Signing..."
            : "Sign Reveal (Ordinals)"}
        </Button>
      </div>

      <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
          <p className="font-medium text-blue-600 dark:text-blue-400">
            Payment Address Info:
          </p>
          <p className="text-xs mt-1">
            <strong>Address:</strong>{" "}
            <span className="break-all">
              {paymentAddress || "Not connected"}
            </span>
          </p>
          <p className="text-xs mt-1">
            <strong>Public Key:</strong>{" "}
            <span className="break-all">
              {formatPublicKey(paymentPublicKey)}
            </span>
          </p>
          {paymentPublicKey && (
            <button
              onClick={() => navigator.clipboard.writeText(paymentPublicKey)}
              className="text-xs text-blue-500 hover:text-blue-700 mt-1"
            >
              Copy full public key
            </button>
          )}
        </div>

        <div>
          <p className="font-medium text-orange-500 dark:text-orange-400">
            Ordinals Address Info:
          </p>
          <p className="text-xs mt-1">
            <strong>Address:</strong>{" "}
            <span className="break-all">{address || "Not connected"}</span>
          </p>
          <p className="text-xs mt-1">
            <strong>Public Key:</strong>{" "}
            <span className="break-all">{formatPublicKey(publicKey)}</span>
          </p>
          {publicKey && (
            <button
              onClick={() => navigator.clipboard.writeText(publicKey)}
              className="text-xs text-orange-500 hover:text-orange-700 mt-1"
            >
              Copy full public key
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 mt-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md text-sm">
          {error}
        </div>
      )}

      {txid && (
        <div className="p-3 mt-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md text-sm break-all">
          <p className="font-medium">Transaction Signed & Broadcast:</p>
          <p className="text-xs mt-1">{txid}</p>
          <p className="text-xs mt-1 italic">
            {signingType === "commit"
              ? "Commit transaction signed with payment address"
              : "Reveal transaction signed with ordinals address"}
          </p>
        </div>
      )}
    </div>
  );
}

