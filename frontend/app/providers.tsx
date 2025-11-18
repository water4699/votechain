"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { sepolia } from "wagmi/chains";

import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";

type Props = {
  children: ReactNode;
};

const hardhatChain = {
  id: 31337,
  name: "FHE Hardhat",
  iconUrl: "/votechain-icon.svg",
  iconBackground: "transparent",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
  blockExplorers: {
    default: { name: "Hardhat Explorer", url: "https://hardhat.org" },
  },
  testnet: true,
} as const;

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "ef3325a718834a2b1b4134d3f520933d";
// Use Infura Sepolia RPC with provided API key
const sepoliaRpc =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC ?? "https://sepolia.infura.io/v3/b18fb7e6ca7045ac83c41157ab93f990";

const queryClient = new QueryClient();

const wagmiConfig = getDefaultConfig({
  appName: "Votechain Ballot",
  projectId,
  chains: [hardhatChain, sepolia],
  transports: {
    [hardhatChain.id]: http(hardhatChain.rpcUrls.default.http[0]!),
    [sepolia.id]: http(sepoliaRpc),
  },
  ssr: true,
});

export function Providers({ children }: Props) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale="en-US"
          modalSize="compact"
          theme={darkTheme({
            accentColor: "#57f5bd",
            borderRadius: "medium",
          })}
        >
        <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
