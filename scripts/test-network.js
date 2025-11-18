const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 检查网络连接和合约功能...");

  // 检查当前网络
  const network = await ethers.provider.getNetwork();
  console.log(`📡 当前网络: ${network.name} (Chain ID: ${network.chainId})`);

  // 检查是否能读取区块号
  try {
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`📦 当前区块号: ${blockNumber}`);
  } catch (error) {
    console.error("❌ 无法读取区块号:", error.message);
    return;
  }

  // 检查合约是否已部署
  try {
    const contractAddress = process.env.CONTRACT_ADDRESS ||
                           process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_LOCALHOST;
    if (contractAddress) {
      console.log(`🎯 检查合约地址: ${contractAddress}`);

      const SimpleVoting = await ethers.getContractFactory("SimpleVoting");
      const contract = SimpleVoting.attach(contractAddress);

      // 测试基本读取功能
      const totalPlayers = await contract.totalPlayers();
      console.log(`👥 合约中的玩家总数: ${totalPlayers}`);

      if (totalPlayers > 0) {
        const playersList = await contract.listPlayers();
        console.log(`📋 玩家列表:`);
        for (let i = 0; i < Math.min(Number(totalPlayers), 3); i++) {
          console.log(`  - 玩家 ${i}: ${playersList[0][i]} (投票数: ${playersList[2][i]})`);
        }
      }

      console.log("✅ 合约读取功能正常");
    } else {
      console.log("ℹ️  未设置 CONTRACT_ADDRESS 环境变量，跳过合约检查");
    }
  } catch (error) {
    console.error("❌ 合约检查失败:", error.message);
  }

  // 检查网络类型和跨链能力
  if (network.chainId === 11155111n) {
    console.log("🌐 当前在 Sepolia 测试网");
    console.log("📝 注意: 测试网合约无法直接向主网发送交易");
    console.log("🔄 如需跨链交互，需要使用桥接协议或预言机服务");
  } else if (network.chainId === 1n) {
    console.log("🌐 当前在 Ethereum 主网");
  } else if (network.chainId === 31337n) {
    console.log("🧪 当前在本地 Hardhat 网络");
    console.log("💡 本地网络用于测试，不支持真实跨链交互");
  } else {
    console.log(`🌐 当前在未知网络 (Chain ID: ${network.chainId})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });
