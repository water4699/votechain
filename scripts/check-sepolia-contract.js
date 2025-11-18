const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x957C469fcfdF9eD0a558406318B767a21B13bB49";

  console.log("Checking contract at:", contractAddress);

  try {
    // Try to get code at the address
    const code = await ethers.provider.getCode(contractAddress);

    if (code === "0x") {
      console.log("❌ No contract found at this address");
      return;
    }

    console.log("✅ Contract found at this address");
    console.log("Code length:", code.length);

    // Try to create contract instance and call a simple method
    const EncryptedMvpVoting = await ethers.getContractFactory("EncryptedMvpVoting");
    const contract = EncryptedMvpVoting.attach(contractAddress);

    try {
      const playerCount = await contract.totalPlayers();
      console.log("✅ Contract is responding. Total players:", playerCount.toString());
    } catch (error) {
      console.log("❌ Contract exists but method call failed:", error.message);
    }

  } catch (error) {
    console.log("❌ Error checking contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
