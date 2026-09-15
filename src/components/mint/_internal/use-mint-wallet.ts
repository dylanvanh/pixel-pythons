import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  BaseError,
  createWalletClient,
  custom,
  isAddress,
  type Address,
  type EIP1193Provider,
  type Hash,
} from "viem";
import {
  chain,
  collectionAbi,
  contractAddress,
  getCollection,
  publicClient,
} from "@/lib/collection";
import { getMintedTokenId, isUnknownChainError } from "@/lib/mint";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

const PENDING_TRANSACTION_STORAGE_KEY = `pixel-pythons:${chain.id}:${contractAddress}:pending`;
const TRANSACTION_CONFIRMATION_TIMEOUT_1_MINUTE_MS = 60_000;

export function useMintWallet() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<Address>();
  const [walletChainId, setWalletChainId] = useState<number>();
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingTransactionHash, setPendingTransactionHash] = useState<Hash>();
  const [mintedTokenId, setMintedTokenId] = useState<number>();

  useEffect(() => {
    try {
      const storedHash = sessionStorage.getItem(PENDING_TRANSACTION_STORAGE_KEY);

      if (storedHash && /^0x[\da-f]{64}$/i.test(storedHash)) {
        // oxlint-disable-next-line react/set-state-in-effect -- Browser storage is restored only after SSR hydration.
        setPendingTransactionHash(storedHash as Hash);
      }
    } catch {
      /* The current tab can still track a transaction if storage is unavailable. */
    }
  }, []);

  useEffect(() => {
    const provider = window.ethereum;

    if (!provider || !walletAddress) {
      return;
    }

    function handleAccountsChanged(accounts: Address[]) {
      setWalletAddress(accounts.find((account) => isAddress(account)));
    }

    function handleChainChanged(chainId: string) {
      setWalletChainId(Number(chainId));
    }

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    provider.on("disconnect", disconnectWallet);

    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
      provider.removeListener("disconnect", disconnectWallet);
    };
  }, [walletAddress]);

  async function connectWallet() {
    if (!window.ethereum) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      const walletClient = createWalletClient({ transport: custom(window.ethereum) });
      const [account] = await walletClient.requestAddresses();

      if (!account || !isAddress(account)) {
        throw new Error("The wallet did not provide an address.");
      }

      setWalletChainId(await walletClient.getChainId());
      setWalletAddress(account);
    } catch (cause) {
      setErrorMessage(getWalletErrorMessage(cause));
    } finally {
      setIsBusy(false);
    }
  }

  function disconnectWallet() {
    setWalletAddress(undefined);
    setWalletChainId(undefined);
  }

  async function switchNetwork() {
    if (!window.ethereum) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      const walletClient = createWalletClient({ transport: custom(window.ethereum) });

      try {
        await walletClient.switchChain({ id: chain.id });
      } catch (cause) {
        if (!isUnknownChainError(cause)) {
          throw cause;
        }

        await walletClient.addChain({ chain });
        await walletClient.switchChain({ id: chain.id });
      }

      setWalletChainId(await walletClient.getChainId());
    } catch (cause) {
      setErrorMessage(getWalletErrorMessage(cause));
    } finally {
      setIsBusy(false);
    }
  }

  function savePendingTransaction(transactionHash?: Hash) {
    setPendingTransactionHash(transactionHash);

    try {
      if (transactionHash) {
        sessionStorage.setItem(PENDING_TRANSACTION_STORAGE_KEY, transactionHash);
        return;
      }

      sessionStorage.removeItem(PENDING_TRANSACTION_STORAGE_KEY);
    } catch {
      /* Keep the transaction visible even when browser storage is blocked. */
    }
  }

  async function confirmMint(transactionHash: Hash) {
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("Waiting for confirmation…");

    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
        timeout: TRANSACTION_CONFIRMATION_TIMEOUT_1_MINUTE_MS,
      });

      savePendingTransaction();

      if (!contractAddress) {
        throw new Error("The collection is not configured.");
      }

      setMintedTokenId(getMintedTokenId(receipt, contractAddress));
      setStatusMessage("Your Python is minted.");
      await router.invalidate();
    } catch (cause) {
      setStatusMessage("");
      setErrorMessage(getWalletErrorMessage(cause));
    } finally {
      setIsBusy(false);
    }
  }

  async function mintPython() {
    if (!window.ethereum || !walletAddress || !contractAddress || pendingTransactionHash) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setMintedTokenId(undefined);
    setStatusMessage("Confirm the mint in your wallet.");

    try {
      const walletClient = createWalletClient({ chain, transport: custom(window.ethereum) });

      if ((await walletClient.getChainId()) !== chain.id) {
        throw new Error(`Switch to ${chain.name} first.`);
      }

      const [account] = await walletClient.getAddresses();

      if (account !== walletAddress) {
        throw new Error("Your wallet account changed. Connect again.");
      }

      const freshCollection = await getCollection();

      if (freshCollection.status !== "ready" || !freshCollection.mintOpen) {
        throw new Error("Minting is not open.");
      }

      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: collectionAbi,
        functionName: "mint",
        account,
        value: freshCollection.mintPriceWei,
      });
      const transactionHash = await walletClient.writeContract(request);

      savePendingTransaction(transactionHash);
      await confirmMint(transactionHash);
    } catch (cause) {
      setErrorMessage(getWalletErrorMessage(cause));
      setStatusMessage("");
    } finally {
      setIsBusy(false);
    }
  }

  return {
    walletAddress,
    walletChainId,
    isBusy,
    statusMessage,
    errorMessage,
    pendingTransactionHash,
    mintedTokenId,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    confirmMint,
    mintPython,
  };
}

function getWalletErrorMessage(cause: unknown) {
  if (cause instanceof BaseError) {
    return cause.shortMessage;
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  return "The wallet request failed. Try again.";
}
