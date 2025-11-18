"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";

export function TopNav() {
  return (
    <header className="flex items-center justify-between py-8">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <Image alt="Votechain Ballot logo" src="/votechain-icon.svg" width={40} height={40} priority />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-wide text-white">Votechain Ballot</p>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[--muted]">Encrypted MVP Voting</p>
        </div>
      </div>
      <div className="pulse-ring rounded-2xl border border-white/10 bg-black/30 px-3 py-1">
        <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
      </div>
    </header>
  );
}

