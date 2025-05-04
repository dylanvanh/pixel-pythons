"use client";

import { useLaserEyes } from "@omnisat/lasereyes";

export function AddressDebug() {
  const laserEyes = useLaserEyes();
  const { address, paymentAddress, publicKey, paymentPublicKey, provider } =
    laserEyes;

  const logAddresses = () => {
    console.log("LaserEyes Hook State:", {
      isConnected: !!provider,
      provider,
      ordinalsAddress: address,
      paymentAddress: paymentAddress,
      ordinalsPublicKey: publicKey,
      paymentPublicKey: paymentPublicKey,
      fullHookState: laserEyes,
    });
  };

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={logAddresses}
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
      >
        Debug Addresses
      </button>
    </div>
  );
}
