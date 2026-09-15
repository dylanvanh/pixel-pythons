import { LaserEyesProvider } from "@omnisat/lasereyes";
import { WalletInfo } from "./components/WalletInfo";
import { MintForm } from "./components/mint/MintForm";

export default function BitcoinWalletPanel() {
  return (
    <LaserEyesProvider>
      <WalletInfo className="mb-4" />
      <MintForm />
    </LaserEyesProvider>
  );
}
