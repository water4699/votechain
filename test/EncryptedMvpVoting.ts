import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { EncryptedMvpVoting, EncryptedMvpVoting__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

const PLAYERS = ["Solar Ace", "Neon Pivot", "Crimson Wall"];

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedMvpVoting")) as EncryptedMvpVoting__factory;
  const contract = (await factory.deploy(PLAYERS)) as EncryptedMvpVoting;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("EncryptedMvpVoting", function () {
  let signers: Signers;
  let votingContract: EncryptedMvpVoting;
  let contractAddress: string;

  before(async function () {
    const ethSigners = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("Tests require the local FHE mock chain");
      this.skip();
    }

    ({ contract: votingContract, contractAddress } = await deployFixture());
  });

  it("initializes the roster on deployment", async function () {
    const totalPlayers = await votingContract.totalPlayers();
    expect(totalPlayers).to.equal(BigInt(PLAYERS.length));

    const playersList = await votingContract.listPlayers();
    for (let i = 0; i < PLAYERS.length; i++) {
      expect(playersList[0][i]).to.equal(PLAYERS[i]); // names
      expect(playersList[2][i]).to.equal(0); // ballots
    }
  });

  it("allows a fan to cast an encrypted vote", async function () {
    const encryptedVote = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(1)
      .encrypt();

    const tx = await votingContract
      .connect(signers.alice)
      .voteFor(0, encryptedVote.handles[0], encryptedVote.inputProof);
    await tx.wait();

    const playersListAfter = await votingContract.listPlayers();
    expect(playersListAfter[2][0]).to.equal(1); // Check ballots for player 0

    const playerAfter = await votingContract.getPlayer(0);
    const clearVotes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      playerAfter,
      contractAddress,
      signers.alice,
    );
    expect(clearVotes).to.equal(1);
  });

  it("prevents a user from voting twice", async function () {
    const encryptedVote = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(1)
      .encrypt();

    await votingContract
      .connect(signers.alice)
      .voteFor(1, encryptedVote.handles[0], encryptedVote.inputProof);

    await expect(
      votingContract.connect(signers.alice).voteFor(1, encryptedVote.handles[0], encryptedVote.inputProof),
    ).to.be.revertedWith("Already voted");
  });

  it("aggregates encrypted votes from multiple fans", async function () {
    const ballotWriters = [
      { signer: signers.alice, weight: 1 },
      { signer: signers.bob, weight: 2 },
    ];

    for (const ballot of ballotWriters) {
      const encryptedVote = await fhevm
        .createEncryptedInput(contractAddress, ballot.signer.address)
        .add32(ballot.weight)
        .encrypt();

      await votingContract
        .connect(ballot.signer)
        .voteFor(2, encryptedVote.handles[0], encryptedVote.inputProof);
    }

    const playersList = await votingContract.listPlayers();
    expect(playersList[2][2]).to.equal(ballotWriters.length); // Check ballots for player 2

    const player = await votingContract.getPlayer(2);
    const clearVotes = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      player,
      contractAddress,
      signers.deployer,
    );
    expect(clearVotes).to.equal(ballotWriters.reduce((sum, { weight }) => sum + weight, 0));
  });
});

