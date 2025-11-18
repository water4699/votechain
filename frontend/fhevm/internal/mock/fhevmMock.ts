//////////////////////////////////////////////////////////////////////////
//
// WARNING!!
// ALWAY USE DYNAMICALLY IMPORT THIS FILE TO AVOID INCLUDING THE ENTIRE
// FHEVM MOCK LIB IN THE FINAL PRODUCTION BUNDLE!!
//
////////////////////////////////////////////////////////////////////////

// This is a stub implementation for production builds
// Mock functionality is not available in production environments

export const fhevmMockCreateInstance = async (parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: {
    ACLAddress: `0x${string}`;
    InputVerifierAddress: `0x${string}`;
    KMSVerifierAddress: `0x${string}`;
  };
}): Promise<any> => {
  throw new Error("FHEVM Mock is not available in production environment");
};
