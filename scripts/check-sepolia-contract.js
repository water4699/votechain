async function main() {
  console.log("🔍 Checking Sepolia contract deployment...");

  // Check SimpleVoting contract
  const simpleVotingAddress = "0xF51dA7a6fa07913DfDc9345aC04fC837Bdf23aF6";
  console.log("🎯 Checking SimpleVoting at:", simpleVotingAddress);

  try {
    const simpleVotingCode = await ethers.provider.getCode(simpleVotingAddress);
    if (simpleVotingCode === "0x") {
      console.log("❌ SimpleVoting contract not found");
    } else {
      console.log("✅ SimpleVoting contract found");

      const SimpleVoting = await ethers.getContractFactory("SimpleVoting");
      const simpleContract = SimpleVoting.attach(simpleVotingAddress);
      const playerCount = await simpleContract.totalPlayers();
      console.log("👥 SimpleVoting players:", playerCount.toString());
    }
  } catch (error) {
    console.log("❌ Error checking SimpleVoting:", error.message);
  }

  // Check EncryptedMvpVoting contract
  const encryptedVotingAddress = "0xA6a13408Cf2F5B5C713F84Fa42290817E61b1338";
  console.log("🎯 Checking EncryptedMvpVoting at:", encryptedVotingAddress);

  try {
    const encryptedVotingCode = await ethers.provider.getCode(encryptedVotingAddress);
    if (encryptedVotingCode === "0x") {
      console.log("❌ EncryptedMvpVoting contract not found");
    } else {
      console.log("✅ EncryptedMvpVoting contract found");

      const EncryptedMvpVoting = await ethers.getContractFactory("EncryptedMvpVoting");
      const encryptedContract = EncryptedMvpVoting.attach(encryptedVotingAddress);
      const playerCount = await encryptedContract.totalPlayers();
      console.log("👥 EncryptedMvpVoting players:", playerCount.toString());
    }
  } catch (error) {
    console.log("❌ Error checking EncryptedMvpVoting:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
