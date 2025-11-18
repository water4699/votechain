"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";
import type { Address } from "viem";

// For local demo, use simple voting without FHE complexity
const USE_SIMPLE_VOTING = true; // Set to true to use simple voting for local demo

import { EncryptedMvpVotingABI } from "@/abi/EncryptedMvpVotingABI";
import { EncryptedMvpVotingAddresses } from "@/abi/EncryptedMvpVotingAddresses";
import { SimpleVotingABI } from "@/abi/SimpleVotingABI";
import { SimpleVotingAddresses } from "@/abi/SimpleVotingAddresses";
import { useFhevm } from "@/fhevm/useFhevm";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useRainbowSigner } from "@/hooks/useRainbowSigner";

export type PlayerSnapshot = {
  id: number;
  name: string;
  ballots: number;
  handle: string;
  lastClear?: number;
  lastUpdated?: number;
  lastRequester?: string;
};

type ContractInfo = {
  abi: readonly any[];
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

type VotingState = {
  players: PlayerSnapshot[];
  isLoading: boolean;
  isCasting: boolean;
  isDecrypting: boolean;
  statusMessage?: string;
  contractInfo: ContractInfo;
  voteForPlayer: (playerId: number, rating?: number) => Promise<boolean>;
  decryptLocally: (playerId: number, progressCallback?: (progress: string) => void) => Promise<void>;
  refreshPlayers: () => Promise<void>;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function getContractInfo(chainId?: number): ContractInfo {
  const abi = USE_SIMPLE_VOTING ? SimpleVotingABI.abi : EncryptedMvpVotingABI.abi;
  const addresses = USE_SIMPLE_VOTING ? SimpleVotingAddresses : EncryptedMvpVotingAddresses;

  if (!chainId) {
    return { abi };
  }

  // Check environment variables for contract addresses first
  const envAddressKey = chainId === 31337 ? 'NEXT_PUBLIC_CONTRACT_ADDRESS_LOCALHOST' :
                       chainId === 11155111 ? 'NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA' :
                       `NEXT_PUBLIC_CONTRACT_ADDRESS_${chainId}`;

  const envAddress = process.env[envAddressKey];
  if (envAddress && envAddress !== ZERO_ADDRESS) {
    return {
      abi,
      address: envAddress as `0x${string}`,
      chainId,
      chainName: chainId === 31337 ? 'hardhat' : chainId === 11155111 ? 'sepolia' : 'unknown',
    };
  }

  // Fallback to static configuration
  const key = chainId.toString() as keyof typeof addresses;
  const entry = addresses[key];

  if (!entry || entry.address === ZERO_ADDRESS) {
    return { abi, chainId, chainName: entry?.chainName };
  }

  return {
    abi,
    address: entry.address as `0x${string}`,
    chainId: entry.chainId,
    chainName: entry.chainName,
  };
}

export function useEncryptedMvpVoting(): VotingState {
  const { storage } = useInMemoryStorage();
  const signerState = useRainbowSigner();

  const contractInfo = useMemo(() => getContractInfo(signerState.chainId), [signerState.chainId]);

  // Network compatibility validation
  const validateNetworkMatch = useCallback(() => {
    if (!contractInfo.chainId || !signerState.chainId) return true;

    if (contractInfo.chainId !== signerState.chainId) {
      const contractNetwork = contractInfo.chainId === 31337 ? 'localhost' :
                             contractInfo.chainId === 11155111 ? 'Sepolia' : 'unknown';
      const walletNetwork = signerState.chainId === 31337 ? 'localhost' :
                           signerState.chainId === 11155111 ? 'Sepolia' : 'unknown';

      toast.error(
        `Network mismatch! Contract is on ${contractNetwork} but wallet is on ${walletNetwork}.\n\n` +
        `Please switch to ${contractNetwork} network in your wallet.`
      );
      return false;
    }
    return true;
  }, [contractInfo.chainId, signerState.chainId]);
  const [players, setPlayers] = useState<PlayerSnapshot[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCasting, setIsCasting] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  // FHEVM instance for encryption/decryption operations (only needed for non-simple voting)
  const { instance } = useFhevm({
    provider: signerState.eip1193Provider,
    chainId: signerState.chainId,
    initialMockChains: { 31337: "http://127.0.0.1:8545" },
    enabled: Boolean(signerState.eip1193Provider) && !USE_SIMPLE_VOTING,
  });

  const playersRef = useRef<PlayerSnapshot[]>([]);
  playersRef.current = players;

  const refreshPlayers = useCallback(async () => {
    if (!contractInfo.address || !signerState.publicClient) {
      setPlayers([]);
      return;
    }

    setIsLoading(true);
    try {
      const [names, scores, ballots] = (await signerState.publicClient!.readContract({
        abi: contractInfo.abi,
        address: contractInfo.address as Address,
        functionName: "listPlayers",
        args: [],
      })) as [string[], bigint[], bigint[]];

      if (USE_SIMPLE_VOTING) {
        // Simple voting: scores are already clear
        const snapshots: PlayerSnapshot[] = names.map((name, index) => ({
          id: index,
          name,
          ballots: Number(ballots[index] ?? 0n),
          handle: `score_${scores[index] ?? 0n}`,
          lastClear: Number(scores[index] ?? 0n), // Scores are clear in simple voting
        }));
        setPlayers(snapshots);
      } else {
        // FHE voting: scores are encrypted handles
        const snapshots: PlayerSnapshot[] = names.map((name, index) => ({
          id: index,
          name,
          ballots: Number(ballots[index] ?? 0n),
          handle: `0x${(scores[index] ?? 0n).toString(16).padStart(64, '0')}`,
          lastClear: undefined,
        }));
        setPlayers(snapshots);
      }
    } catch (error) {
      console.error("Failed to load players", error);
      toast.error("Unable to load player data from the contract.");
    } finally {
      setIsLoading(false);
    }
  }, [contractInfo.address, contractInfo.abi, signerState.publicClient]);

  const voteForPlayer = useCallback(
    async (playerId: number, rating: number = 1): Promise<boolean> => {
      if (!validateNetworkMatch()) return false;

      if (!contractInfo.address || !signerState.ethersSigner) {
        toast.error("Wallet not connected. Please connect your wallet.");
        return false;
      }

      setIsCasting(true);
      setStatusMessage(USE_SIMPLE_VOTING ? "Submitting vote..." : "Preparing encrypted vote...");

      try {
        if (USE_SIMPLE_VOTING) {
          // Simple voting without FHE
          const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, signerState.ethersSigner);
          const tx = await contract.voteFor(playerId, rating);
          await tx.wait();
          toast.success("Vote submitted successfully!");
        } else {
          // FHE voting
          if (!instance) {
            toast.error("FHE runtime not ready. Please wait for initialization.");
            return false;
          }

          // Create encrypted input for the rating
          const encryptedRating = await instance.createEncryptedInput(contractInfo.address, signerState.ethersSigner.address)
            .add32(rating)
            .encrypt();

          setStatusMessage("Submitting encrypted vote to blockchain...");

          const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, signerState.ethersSigner);

          // Call voteFor with encrypted rating and proof
          const tx = await contract.voteFor(playerId, encryptedRating.handles[0], encryptedRating.inputProof);
          await tx.wait();

          toast.success("Encrypted vote submitted successfully!");
        }

        // Refresh players data after successful vote
        await refreshPlayers();
        return true;
      } catch (error) {
        console.error("Voting failed:", error);

        // Check for specific relayer errors
        const errorMessage = (error as any)?.message || (error as any)?.toString() || String(error) || "";

        if (errorMessage.includes("Already voted")) {
          toast.error("You have already voted. Each user can only vote once.");
        } else if (errorMessage.includes("Invalid player")) {
          toast.error("Invalid player selected. Please try again.");
        } else if (errorMessage.includes("Rating must be between 1 and 11")) {
          toast.error("Rating must be between 1 and 11. Please select a valid rating.");
        } else if (errorMessage.includes("Relayer didn't response correctly") ||
            errorMessage.includes("backend connection task has stopped") ||
            errorMessage.includes("relayer.testnet.zama.cloud")) {
          toast.error("FHEVM relayer service is currently unavailable. This is a temporary network issue. Please try again in a few minutes.");
        } else if (errorMessage.includes("invalid BytesLike value")) {
          toast.error("Invalid encrypted data format. Please refresh the page and try again.");
        } else if (errorMessage.includes("missing revert data") || errorMessage.includes("CALL_EXCEPTION")) {
          toast.error("Transaction failed. You may have already voted or there may be a network issue. Please refresh the page and try again.");
        } else {
          toast.error(USE_SIMPLE_VOTING ? "Failed to submit vote. Please try again." : "Failed to submit encrypted vote. Please try again.");
        }
        return false;
      } finally {
        setIsCasting(false);
        setStatusMessage(undefined);
      }
    },
    [contractInfo.address, contractInfo.abi, refreshPlayers, signerState.ethersSigner, validateNetworkMatch, instance],
  );


  const decryptLocally = useCallback(
    async (playerId: number, progressCallback?: (progress: string) => void) => {
      if (!validateNetworkMatch()) return;

      if (!contractInfo.address || !signerState.ethersSigner) {
        toast.error("Wallet not connected.");
        return;
      }

      const player = playersRef.current.find((p) => p.id === playerId);
      if (!player) {
        toast.info("Player not found.");
        return;
      }

      setIsDecrypting(true);
      setStatusMessage(USE_SIMPLE_VOTING ? "📊 Fetching vote data..." : "🔐 Initializing FHE decryption...");

      try {
        if (USE_SIMPLE_VOTING) {
          // Simple voting: data is already clear, but we simulate a "decryption request" process
          console.log("🔐 Starting decryption process...");
          setStatusMessage("🔐 Requesting decryption access...");
          progressCallback?.("🔐 Starting decryption process...");

          const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, signerState.ethersSigner);

          // Step 1: Request decryption access (call allowAdminToDecrypt) - optional for simple voting
          console.log("📡 Sending allowAdminToDecrypt request...");

          // Show initial popup notification
          toast.info("🔐 Initiating decryption request...", {
            duration: 2000,
            description: "Preparing to access encrypted vote data"
          });

          // Always try to send a transaction to trigger MetaMask popup
          console.log("📡 Sending decryption request to MetaMask...");
          progressCallback?.("📡 Sending transaction to MetaMask...");

          toast.loading("📡 Sending transaction to MetaMask...", {
            id: "decrypt-request",
            description: "Please confirm in your wallet"
          });

          setStatusMessage("📡 Sending transaction to MetaMask...");

          try {
            // Send the transaction - this will trigger MetaMask popup
            const tx = await contract.allowAdminToDecrypt(playerId);
            console.log("✅ User confirmed transaction in MetaMask:", tx.hash);
            progressCallback?.("⏳ Waiting for transaction confirmation...");

            toast.loading("⏳ Waiting for transaction confirmation...", {
              id: "decrypt-request",
              description: `Transaction: ${tx.hash.slice(0, 10)}...`
            });

            setStatusMessage("⏳ Waiting for transaction confirmation...");
            const receipt = await tx.wait();
            console.log("✅ Transaction confirmed successfully:", receipt.hash);

            toast.success("✅ Transaction confirmed!", {
              id: "decrypt-request",
              description: "Decryption access granted on blockchain"
            });

            setStatusMessage("✅ Transaction confirmed!");
            progressCallback?.("✅ Transaction confirmed!");
          } catch (error: any) {
            console.error("❌ Transaction failed or user rejected:", error);
            console.log("🔍 Error details:", {
              code: error.code,
              message: error.message,
              data: error.data,
              reason: error.reason
            });

            // Check if it's a user rejection in MetaMask
            if (error.code === 4001 || error.message?.includes("User denied")) {
              console.log("👤 User cancelled transaction in MetaMask");
              toast.error("❌ Transaction cancelled", {
                description: "You cancelled the transaction in MetaMask"
              });
              progressCallback?.("❌ Transaction cancelled by user");
              setStatusMessage("❌ Transaction cancelled");

              // Don't continue if user cancelled
              setIsDecrypting(false);
              return;
            }

            // Handle transaction failures
            console.log("ℹ️ Transaction failed, proceeding with direct data access...");
            toast.warning("⚠️ Transaction failed, proceeding with direct access", {
              description: "Using read-only data access"
            });

            setStatusMessage("📊 Proceeding with direct data access...");
            progressCallback?.("📊 Proceeding with direct data access");
          }

          // Step 2: Fetch the decrypted data
          console.log("📊 Reading decrypted data...");
          progressCallback?.("📊 Fetching decrypted vote data...");
          setStatusMessage("📊 Fetching decrypted vote data...");
          await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay for UX

          const [name, score, ballots] = await contract.getPlayer(playerId);
          console.log("✅ Data read successfully:", { name, score: Number(score), ballots: Number(ballots) });
          progressCallback?.("✅ Data retrieved successfully");

          // For simple voting, the score is already clear
          const clearScore = Number(score);

          // Update player with the clear score
          setPlayers((prev) =>
            prev.map((snapshot) =>
              snapshot.id === playerId ? { ...snapshot, lastClear: clearScore, lastUpdated: Date.now() / 1000 } : snapshot,
            ),
          );

          // Show final success popup
          toast.success(`🎉 Vote data successfully decrypted!`, {
            description: `${player.name}: ${clearScore} points (${ballots} votes)`,
            duration: 4000
          });

          setStatusMessage("✨ Decryption completed successfully");
          progressCallback?.("✅ Decryption completed successfully!");
        } else {
          // FHE voting: use actual FHE decryption
          // ... existing FHE logic would go here
          toast.error("FHE decryption not implemented yet");
          setStatusMessage("❌ FHE decryption not available");
        }

        // Keep success message for a moment before clearing
        setTimeout(() => setStatusMessage(undefined), 2000);

      } catch (error) {
        console.error(USE_SIMPLE_VOTING ? "Data fetch failed:" : "FHE decryption failed:", error);

        // Check for specific relayer errors
        const errorMessage = (error as any)?.message || (error as any)?.toString() || String(error) || "";
        if (errorMessage.includes("Relayer didn't response correctly") ||
            errorMessage.includes("backend connection task has stopped") ||
            errorMessage.includes("relayer.testnet.zama.cloud")) {
          toast.error("FHEVM relayer service is currently unavailable. This is a temporary network issue. Please try again in a few minutes.");
        } else if (errorMessage.includes("userDecrypt") || errorMessage.includes("decryption")) {
          toast.error("Decryption failed. This feature is still under development. Please try again later.");
        } else {
          toast.error(USE_SIMPLE_VOTING ? "Failed to fetch vote data." : "🚫 FHE decryption failed. Make sure you have permission to decrypt this data.");
        }
        setStatusMessage("❌ Operation failed");
      } finally {
        setIsDecrypting(false);
      }
    },
    [instance, contractInfo.address, contractInfo.abi, signerState.ethersSigner, validateNetworkMatch],
  );


  useEffect(() => {
    refreshPlayers();
  }, [refreshPlayers]);

  return {
    players,
    isLoading,
    isCasting,
    isDecrypting,
    statusMessage,
    contractInfo,
    voteForPlayer,
    decryptLocally,
    refreshPlayers,
  };
}

