const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking network connection and contract functionality...");

  // Check current network
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Current network: ${network.name} (Chain ID: ${network.chainId})`);

  // Check if we can read block number
  try {
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`📦 Current block number: ${blockNumber}`);
  } catch (error) {
    console.error("❌ Unable to read block number:", error.message);
    return;
  }

  // Check if contract is deployed
  try {
    const contractAddress = process.env.CONTRACT_ADDRESS ||
                           process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_LOCALHOST;
    if (contractAddress) {
      console.log(`🎯 Checking contract address: ${contractAddress}`);

      const SimpleVoting = await ethers.getContractFactory("SimpleVoting");
      const contract = SimpleVoting.attach(contractAddress);

      // Test basic read functionality
      const totalPlayers = await contract.totalPlayers();
      console.log(`👥 Total players in contract: ${totalPlayers}`);

      if (totalPlayers > 0) {
        const playersList = await contract.listPlayers();
        console.log(`📋 Player list:`);
        for (let i = 0; i < Math.min(Number(totalPlayers), 3); i++) {
          console.log(`  - Player ${i}: ${playersList[0][i]} (votes: ${playersList[2][i]})`);
        }
      }

      console.log("✅ Contract read functionality working");
    } else {
      console.log("ℹ️ CONTRACT_ADDRESS environment variable not set, skipping contract check");
    }
  } catch (error) {
    console.error("❌ Contract check failed:", error.message);
  }

  // Check network type and cross-chain capabilities
  if (network.chainId === 11155111n) {
    console.log("🌐 Currently on Sepolia testnet");
    console.log("📝 Note: Testnet contracts cannot directly send transactions to mainnet");
    console.log("🔄 For cross-chain interactions, use bridge protocols or oracle services");
  } else if (network.chainId === 1n) {
    console.log("🌐 Currently on Ethereum mainnet");
  } else if (network.chainId === 31337n) {
    console.log("🧪 Currently on local Hardhat network");
    console.log("💡 Local network for testing, does not support real cross-chain interactions");
  } else {
    console.log(`🌐 Currently on unknown network (Chain ID: ${network.chainId})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script execution failed:", error);
    process.exit(1);
  });
