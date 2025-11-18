const { ethers } = require("hardhat");

async function main() {
  // Get the contract interface
  const EncryptedMvpVoting = await ethers.getContractFactory("EncryptedMvpVoting");

  // Get method signatures
  console.log("voteFor(uint256,uint8) signature:", EncryptedMvpVoting.interface.getFunction("voteFor").selector);
  console.log("voteFor(uint256,uint8,uint256,bytes) signature (old):", ethers.keccak256(ethers.toUtf8Bytes("voteFor(uint256,uint8,uint256,bytes)")).substring(0, 10));

  // Check what 0x85db3669 corresponds to
  console.log("Unknown method 0x85db3669");

  // Try to call the method
  const contractAddress = "0x957C469fcfdF9eD0a558406318B767a21B13bB49";
  const contract = EncryptedMvpVoting.attach(contractAddress);

  try {
    // Try calling voteFor with test parameters
    console.log("Testing voteFor(0, 5)...");
    const tx = await contract.voteFor(0, 5, { gasLimit: 100000 });
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ voteFor call successful");
  } catch (error) {
    console.log("❌ voteFor call failed:", error.message);

    // Try to estimate gas to see what's wrong
    try {
      const gasEstimate = await contract.voteFor.estimateGas(0, 5);
      console.log("Gas estimate successful:", gasEstimate);
    } catch (estimateError) {
      console.log("Gas estimate failed:", estimateError.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
