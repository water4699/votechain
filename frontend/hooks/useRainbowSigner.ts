"use client";

import { ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import type { WalletClient } from "viem";

type RainbowSignerState = {
  address?: `0x${string}`;
  chainId?: number;
  isConnected: boolean;
  ethersSigner?: ethers.JsonRpcSigner;
  ethersProvider?: ethers.BrowserProvider;
  eip1193Provider?: ethers.Eip1193Provider;
  publicClient: ReturnType<typeof usePublicClient>;
};

function walletClientToProvider(walletClient: WalletClient): ethers.Eip1193Provider {
  return {
    request: async ({ method, params }) => {
      return walletClient.request({ method, params } as any);
    },
  };
}

export function useRainbowSigner(): RainbowSignerState {
  const { address, chain, status } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [ethersProvider, setEthersProvider] = useState<ethers.BrowserProvider | undefined>(undefined);
  const [ethersSigner, setEthersSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);
  const [eip1193Provider, setEip1193Provider] = useState<ethers.Eip1193Provider | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSigner(client: WalletClient) {
      const provider = walletClientToProvider(client);
      // Remove the second parameter to let ethers auto-detect the network
      const browserProvider = new ethers.BrowserProvider(provider);
      const signer = await browserProvider.getSigner(client.account?.address);

      if (!cancelled) {
        setEthersProvider(browserProvider);
        setEthersSigner(signer);
        setEip1193Provider(provider);
      }
    }

    if (walletClient) {
      hydrateSigner(walletClient);
    } else {
      setEthersProvider(undefined);
      setEthersSigner(undefined);
      setEip1193Provider(undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [walletClient]);

  return useMemo(
    () => ({
      address: address as `0x${string}` | undefined,
      chainId: chain?.id,
      isConnected: status === "connected",
      ethersSigner,
      ethersProvider,
      eip1193Provider,
      publicClient,
    }),
    [address, chain?.id, ethersProvider, ethersSigner, eip1193Provider, publicClient, status],
  );
}

