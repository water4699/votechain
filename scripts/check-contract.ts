import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Checking contract on Sepolia...");
  console.log("Deployer address:", deployer.address);

  // Contract address from the ABI - check hardhat network
  const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  console.log("Checking contract on Hardhat network...");
  console.log("Contract address:", contractAddress);

  try {
    // Try to get contract code
    const code = await ethers.provider.getCode(contractAddress);
    console.log("Contract code length:", code.length);

    if (code === "0x") {
      console.log("❌ Contract does not exist at this address!");
      return;
    }

    console.log("✅ Contract exists at this address");

    // Try to call a view function
    const contract = await ethers.getContractAt("EncryptedMvpVoting", contractAddress);

    try {
      const admin = await contract.admin();
      console.log("Admin address:", admin);

      const totalPlayers = await contract.totalPlayers();
      console.log("Total players:", totalPlayers);

      console.log("✅ Contract is responding correctly");
    } catch (error) {
      console.log("❌ Contract exists but functions are not accessible:", error);
    }

  } catch (error) {
    console.log("❌ Error checking contract:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
