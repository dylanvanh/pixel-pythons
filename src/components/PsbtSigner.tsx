"use client";

import { useState } from "react";
import { useLaserEyes } from "@omnisat/lasereyes";
import { Button } from "@/components/ui/button";
import { bitcoin } from "@/lib/bitcoin/core/bitcoin-config";

interface RevealResponse {
  revealPsbt: string;
  revealFee?: number;
  expectedInscriptionId?: string;
  inputSigningMap: { index: number; address: string }[];
}

export default function PsbtSigner() {
  const { signPsbt, address, paymentAddress, publicKey, paymentPublicKey } =
    useLaserEyes();
  const [psbt, setPsbt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [txid, setTxid] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [signingType, setSigningType] = useState<"commit" | "reveal" | null>(null);
  const [transactionHex, setTransactionHex] = useState<string | undefined>();
  const [commitTxid, setCommitTxid] = useState<string>("");
  const [inputSigningMap, setInputSigningMap] = useState<{ index: number; address: string }[]>([]);
  const [preparingReveal, setPreparingReveal] = useState<boolean>(false);
  const [expectedInscriptionId, setExpectedInscriptionId] = useState<string | undefined>();

  // Prepare the reveal transaction using the commit txid
  const prepareRevealTransaction = async () => {
    if (!commitTxid) {
      setError("Please enter a commit transaction ID");
      return;
    }

    if (!address || !publicKey || !paymentAddress || !paymentPublicKey) {
      setError("Missing wallet information. Please ensure your wallet is connected.");
      return;
    }

    setPreparingReveal(true);
    setError(undefined);
    
    try {
      const response = await fetch("/api/prepare-reveal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commitTxid: commitTxid,
          ordinalsAddress: address,
          ordinalsPublicKey: publicKey,
          paymentAddress: paymentAddress,
          paymentPublicKey: paymentPublicKey
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to prepare reveal transaction");
      }
      
      const data = await response.json() as RevealResponse;
      
      // Set the PSBT for signing
      setPsbt(data.revealPsbt);
      
      // Save the input signing map
      if (data.inputSigningMap) {
        setInputSigningMap(data.inputSigningMap);
        console.log("Input signing map:", data.inputSigningMap);
      }

      // Save expected inscription ID if available
      if (data.expectedInscriptionId) {
        setExpectedInscriptionId(data.expectedInscriptionId);
      }
      
      return data;
    } catch (error) {
      console.error("Error preparing reveal transaction:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
      return null;
    } finally {
      setPreparingReveal(false);
    }
  };

  const handleSignTransaction = async (type: "commit" | "reveal") => {
    if (!psbt) {
      setError("PSBT is missing");
      return;
    }

    setIsLoading(true);
    setError(undefined);
    setTxid(undefined);
    setSigningType(type);

    try {
      // Determine which inputs to sign based on the input signing map
      let inputsToSign: { index: number; address: string }[] = [];
      
      if (inputSigningMap.length > 0) {
        const ourAddresses = [address, paymentAddress].filter(Boolean);
        
        // Find which inputs we can sign with our available addresses
        inputsToSign = inputSigningMap.filter((input) => 
          ourAddresses.includes(input.address)
        );
        
        if (inputsToSign.length === 0) {
          throw new Error(
            `None of your available addresses (${ourAddresses.join(', ')}) match the required signing addresses in the input map.`
          );
        }
        
        console.log(`Found ${inputsToSign.length} inputs to sign:`, inputsToSign);
      } else {
        // Default to signing the first input with the default address
        const defaultSigningAddress = type === "commit" ? paymentAddress : address;
        inputsToSign = [{ index: 0, address: defaultSigningAddress! }];
      }
      
      // Sign and broadcast in a single operation
      const result = await signPsbt({
        tx: psbt,
        finalize: true,
        broadcast: true,
        inputsToSign: inputsToSign,
      });
      
      if (!result?.signedPsbtHex) {
        throw new Error(`Failed to sign transaction inputs`);
      }
      
      // Update the PSBT with all signed inputs
      const signedPsbtBase64 = bitcoin.Psbt.fromHex(result.signedPsbtHex).toBase64();
      setPsbt(signedPsbtBase64);
      
      // Extract the transaction hex for manual broadcasting if needed
      try {
        const finalPsbt = bitcoin.Psbt.fromBase64(signedPsbtBase64);
        const tx = finalPsbt.extractTransaction();
        const txHex = tx.toHex();
        setTransactionHex(txHex);
        console.log("Finalized Transaction Hex:", txHex);
      } catch (extractError) {
        console.warn("Could not extract transaction hex:", extractError);
      }
      
      if (result?.txId) {
        setTxid(result.txId);
      } else {
        throw new Error("Transaction was signed but no txid was returned");
      }
    } catch (error) {
      console.error(`Error signing ${type} transaction:`, error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPublicKey = (pubKey?: string) => {
    if (!pubKey) return "Not available";
    return pubKey.length > 16
      ? `${pubKey.slice(0, 8)}...${pubKey.slice(-8)}`
      : pubKey;
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <h2 className="text-xl font-bold">Bitcoin Ordinal Inscription</h2>

      <div className="flex flex-col gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
        <h3 className="text-lg font-semibold">Step 1: Prepare Reveal Transaction</h3>
        
        <div className="mt-2">
          <label htmlFor="commitTxid" className="text-sm font-medium">
            Commit Transaction ID
          </label>
          <input
            id="commitTxid"
            value={commitTxid}
            onChange={(e) => setCommitTxid(e.target.value)}
            className="w-full p-2 mt-1 border rounded-md bg-white dark:bg-gray-700 text-sm"
            placeholder="Enter commit transaction ID for reveal..."
          />
        </div>
        
        <Button
          onClick={prepareRevealTransaction}
          disabled={preparingReveal || !commitTxid || !address || !publicKey}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
        >
          {preparingReveal ? "Preparing..." : "Prepare Reveal Transaction"}
        </Button>
        
        {expectedInscriptionId && (
          <div className="mt-2 text-sm text-green-600 dark:text-green-400">
            Expected Inscription ID: {expectedInscriptionId}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
        <h3 className="text-lg font-semibold">Step 2: Sign Transaction</h3>

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

        {inputSigningMap.length > 0 && (
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-md text-sm">
            <p className="font-medium">Input Signing Map:</p>
            <ul className="mt-1 text-xs space-y-1">
              {inputSigningMap.map((input, idx) => (
                <li key={idx}>
                  Input {input.index}: Sign with{" "}
                  <span className="font-mono break-all">{input.address}</span>
                  {input.address === address && (
                    <span className="ml-1 text-green-600 font-semibold">
                      (Your Ordinals Address)
                    </span>
                  )}
                  {input.address === paymentAddress && (
                    <span className="ml-1 text-blue-600 font-semibold">
                      (Your Payment Address)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={() => handleSignTransaction("reveal")}
            disabled={isLoading || !psbt || !address}
            className="w-full mt-2 bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? "Signing..." : "Sign & Broadcast Reveal Transaction"}
          </Button>
        </div>
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

      {transactionHex && (
        <div className="p-3 mt-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-sm">
          <p className="font-medium">
            Transaction Hex (for manual broadcasting):
          </p>
          <textarea
            readOnly
            value={transactionHex}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            className="w-full h-24 mt-2 text-xs bg-white dark:bg-gray-800 p-2 border rounded"
          />
          <button
            onClick={() => navigator.clipboard.writeText(transactionHex)}
            className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded"
          >
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}
