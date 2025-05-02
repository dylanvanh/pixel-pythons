"use client";

import { useLaserEyes } from "@omnisat/lasereyes";

export function AddressDebug() {
  const { address, paymentAddress, publicKey, paymentPublicKey } =
    useLaserEyes();

  if (process.env.NODE_ENV === "production") return null;

  const logAddresses = () => {
    console.log({
      ordinalsAddress: address,
      paymentAddress: paymentAddress,
      ordinalsPublicKey: publicKey,
      paymentPublicKey: paymentPublicKey,
    });
  };

  return (
    <div className="fixed bottom-4 right-4">
      <button
        onClick={logAddresses}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
      >
        Debug Addresses
      </button>
    </div>
  );
}

