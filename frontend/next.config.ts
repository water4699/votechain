import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove COOP/COEP headers that conflict with WalletConnect and Base Account SDK
  // These headers are not needed for FHEVM functionality
  // async headers() {
  //   return [
  //     {
  //       source: '/',
  //       headers: [
  //         {
  //           key: 'Cross-Origin-Opener-Policy',
  //           value: 'same-origin',
  //         },
  //         {
  //           key: 'Cross-Origin-Embedder-Policy',
  //           value: 'require-corp',
  //         },
  //       ],
  //     },
  //   ];
  // },
};

export default nextConfig;