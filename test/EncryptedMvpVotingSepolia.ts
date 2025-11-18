import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { EncryptedMvpVoting } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("EncryptedMvpVotingSepolia", function () {
  let signers: Signers;
  let votingContract: EncryptedMvpVoting;
  let votingAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("EncryptedMvpVoting");
      votingAddress = deployment.address;
      votingContract = await ethers.getContractAt("EncryptedMvpVoting", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("submits an encrypted vote on Sepolia", async function () {
    steps = 8;

    this.timeout(8 * 40000);

    progress("Reading initial encrypted tally for player 0...");
    const playerBefore = await votingContract.getPlayer(0);

    progress("Encrypting vote weight '1'...");
    const encryptedOne = await fhevm
      .createEncryptedInput(votingAddress, signers.alice.address)
      .add32(1)
      .encrypt();

    progress("Submitting voteFor(0)...");
    const tx = await votingContract
      .connect(signers.alice)
      .voteFor(0, encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    progress("Fetching encrypted tally after vote...");
    const playerAfter = await votingContract.getPlayer(0);

    progress("Decrypting tallies (requires FHE KMS access)...");
    const clearBefore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      playerBefore[1],
      votingAddress,
      signers.alice,
    );
    const clearAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      playerAfter[1],
      votingAddress,
      signers.alice,
    );
    progress(`Clear votes before: ${clearBefore}, after: ${clearAfter}`);

    expect(clearAfter - clearBefore).to.eq(1);
  });
});
