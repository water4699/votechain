//////////////////////////////////////////////////////////////////////////
//
// WARNING!!
// ALWAY USE DYNAMICALLY IMPORT THIS FILE TO AVOID INCLUDING THE ENTIRE 
// FHEVM MOCK LIB IN THE FINAL PRODUCTION BUNDLE!!
//
//////////////////////////////////////////////////////////////////////////

import { JsonRpcProvider } from "ethers";
// Temporarily disabled mock due to version compatibility issues
// import { MockFhevmInstance } from "@fhevm/mock-utils";
// import { FhevmInstance } from "../../fhevmTypes";

// Temporarily disabled due to version compatibility issues
export const fhevmMockCreateInstance = async (parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: {
    ACLAddress: `0x${string}`;
    InputVerifierAddress: `0x${string}`;
    KMSVerifierAddress: `0x${string}`;
  };
}): Promise<any> => {
  throw new Error("FHEVM Mock is temporarily disabled due to version compatibility issues");
};
