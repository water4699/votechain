import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("🚀 Deploying SimpleVoting contract for local demo...");

  const deployedVoting = await deploy("SimpleVoting", {
    from: deployer,
    log: true,
    args: [["Astra Striker", "Midnight Playmaker", "Guardian Titan"]],
  });

  console.log(`✅ SimpleVoting contract deployed at:`, deployedVoting.address);
};

export default func;
func.id = "deploy_simpleVoting";
func.tags = ["SimpleVoting"];
