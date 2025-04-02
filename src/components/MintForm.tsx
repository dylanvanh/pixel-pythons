"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useMintStore } from "@/store/mintStore";

export function MintForm() {
  const mintStep = useMintStore(state => state.mintStep);
  const isLoading = useMintStore(state => state.isLoading);
  const transactions = useMintStore(state => state.transactions);
  const startMintProcess = useMintStore(state => state.startMintProcess);
  const resetMintProcess = useMintStore(state => state.resetMintProcess);

  const renderStepContent = () => {
    switch (mintStep) {
      case "ready":
        return (
          <Button 
            onClick={startMintProcess}
            disabled={isLoading}
            className="w-full bg-black text-white border-4 border-black font-bold text-2xl py-8 hover:bg-white hover:text-black transition duration-200"
          >
            MINT
          </Button>
        );
      
      case "commit":
        return (
          <div className="space-y-4">
            <div className="p-4 border-4 border-black bg-white">
              <h3 className="text-lg font-bold mb-2">Step 1: Sign Commit Transaction</h3>
              <p className="text-sm mb-2">Please sign the commit transaction...</p>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-black h-full w-1/2 animate-pulse"></div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                disabled
                className="flex-1 bg-gray-400 text-white border-4 border-black font-bold text-lg"
              >
                Waiting for signature...
              </Button>
              <Button
                onClick={resetMintProcess}
                className="bg-white text-black border-4 border-black hover:bg-gray-100"
              >
                Reset
              </Button>
            </div>
          </div>
        );
      
      case "reveal":
        return (
          <div className="space-y-4">
            <div className="p-4 border-4 border-black bg-white">
              <h3 className="text-lg font-bold mb-2">Commit Transaction Signed ✓</h3>
              <p className="text-sm">Ready for next step</p>
            </div>
            <div className="p-4 border-4 border-black bg-white">
              <h3 className="text-lg font-bold mb-2">Step 2: Sign Reveal Transaction</h3>
              <p className="text-sm mb-2">Please sign the reveal transaction...</p>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-black h-full w-1/2 animate-pulse"></div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                disabled
                className="flex-1 bg-gray-400 text-white border-4 border-black font-bold text-lg"
              >
                Waiting for signature...
              </Button>
              <Button
                onClick={resetMintProcess}
                className="bg-white text-black border-4 border-black hover:bg-gray-100"
              >
                Reset
              </Button>
            </div>
          </div>
        );
      
      case "broadcasting":
        return (
          <div className="space-y-4">
            <div className="p-4 border-4 border-black bg-white">
              <h3 className="text-lg font-bold mb-2">Both Transactions Signed ✓</h3>
              <p className="text-sm">Now broadcasting to the Bitcoin network...</p>
              <div className="w-full bg-gray-200 h-2 mt-4 rounded-full overflow-hidden">
                <div className="bg-black h-full w-1/2 animate-pulse"></div>
              </div>
            </div>
            <Button 
              disabled
              className="w-full bg-gray-400 text-white border-4 border-black font-bold text-lg"
            >
              Broadcasting transactions...
            </Button>
          </div>
        );
      
      case "success":
        return (
          <div className="space-y-4">
            <div className="p-6 border-4 border-black bg-green-200">
              <h3 className="text-xl font-bold mb-4 text-center">Mint Successful! 🎉</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Commit TX:</span>
                  <a 
                    href={`https://mempool.space/tx/${transactions.commitTxid}`}
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
                    href={`https://mempool.space/tx/${transactions.revealTxid}`}
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
  };

  return (
    <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0)] transition duration-200">
      {mintStep === "ready" ? (
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      ) : (
        <>
          <CardHeader className="border-b-4 border-black bg-blue-400">
            <CardTitle className="text-center text-2xl font-bold">Mint Your Ordinal</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {renderStepContent()}
          </CardContent>
        </>
      )}
    </Card>
  );
} 