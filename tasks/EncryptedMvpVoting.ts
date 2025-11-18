import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const CONTRACT_NAME = "EncryptedMvpVoting";

task("task:address", `Prints the ${CONTRACT_NAME} deployment address`).setAction(async (_args: TaskArguments, hre) => {
  const contract = await hre.deployments.get(CONTRACT_NAME);
  console.log(`${CONTRACT_NAME} address: ${contract.address}`);
});

task("task:list-players", "Lists all registered MVP candidates").setAction(async (_args: TaskArguments, hre) => {
  const { ethers, deployments } = hre;
  const contractDeployment = await deployments.get(CONTRACT_NAME);
  const voting = await ethers.getContractAt(CONTRACT_NAME, contractDeployment.address);

  const total = await voting.totalPlayers();
  console.log(`Registered players: ${total}`);

  for (let i = 0n; i < total; i++) {
    const player = await voting.getPlayer(i);
    console.log(`- #${i} ${player[0]} (ballots: ${player[2]})`);
  }
});

task("task:vote", "Casts an encrypted MVP ballot")
  .addParam("player", "Target player id (uint)")
  .addOptionalParam("weight", "Voting weight, defaults to 1", "1")
  .addOptionalParam("address", "Optional contract address override")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;
    const playerId = BigInt(args.player);
    const weight = parseInt(args.weight ?? "1");
    if (!Number.isInteger(weight) || weight <= 0) {
      throw new Error("--weight must be a positive integer");
    }

    await fhevm.initializeCLIApi();

    const deployment = args.address ? { address: args.address } : await deployments.get(CONTRACT_NAME);
    const voting = await ethers.getContractAt(CONTRACT_NAME, deployment.address);
    const signer = (await ethers.getSigners())[0];

    const encryptedVote = await fhevm
      .createEncryptedInput(deployment.address, signer.address)
      .add32(weight)
      .encrypt();

    const tx = await voting
      .connect(signer)
      .voteFor(playerId, encryptedVote.handles[0], encryptedVote.inputProof);
    console.log(`Submitting vote tx: ${tx.hash}`);
    await tx.wait();
    console.log(`Successfully voted for player #${playerId}`);
  });

task("task:decrypt-player", "Decrypts the aggregated votes for a player (local mock only)")
  .addParam("player", "Player id")
  .addOptionalParam("address", "Optional contract address override")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments, fhevm } = hre;

    if (!fhevm.isMock) {
      console.warn("Direct user decryption only works on the local mock network.");
    }

    await fhevm.initializeCLIApi();
    const deployment = args.address ? { address: args.address } : await deployments.get(CONTRACT_NAME);
    const voting = await ethers.getContractAt(CONTRACT_NAME, deployment.address);
    const player = await voting.getPlayer(BigInt(args.player));
    const signer = (await ethers.getSigners())[0];

    const clearVotes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      player[1],
      deployment.address,
      signer,
    );

    console.log(`Player ${player[0]} -> decrypted total votes: ${clearVotes}`);
  });

