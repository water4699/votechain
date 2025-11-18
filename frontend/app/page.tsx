"use client";

import React from "react";
import type { ReactNode } from "react";
import { ArrowRight, BarChart3, Lock, RefreshCw, ShieldCheck } from "lucide-react";

import { useEncryptedMvpVoting } from "@/hooks/useEncryptedMvpVoting";
import { useRainbowSigner } from "@/hooks/useRainbowSigner";

const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export default function Home() {
  const signer = useRainbowSigner();
  const voting = useEncryptedMvpVoting();

  // Handle client-side only conditions to prevent hydration mismatch
  const [isClient, setIsClient] = React.useState(false);
  const [isLocalhost, setIsLocalhost] = React.useState(false);
  const [showDecryptModal, setShowDecryptModal] = React.useState(false);
  const [decryptProgress, setDecryptProgress] = React.useState<string>("");

  React.useEffect(() => {
    setIsClient(true);
    setIsLocalhost(typeof window !== 'undefined' && window.location.hostname === 'localhost');
  }, []);

  const connectedChain = voting.contractInfo.chainName ?? "Unsupported network";
  const contractBadge = voting.contractInfo.address
    ? `${voting.contractInfo.address.slice(0, 6)}...${voting.contractInfo.address.slice(-4)}`
    : "No deployment for this network";

  const allowActions = Boolean(signer.isConnected && voting.contractInfo.address);

  // State for rating selection
  const [selectedRatings, setSelectedRatings] = React.useState<{[playerId: number]: number}>({});

  // Track which players the user has voted for (per-player voting)
  const [votedPlayers, setVotedPlayers] = React.useState<Set<number>>(new Set());

  // Track which players' scores have been decrypted
  const [decryptedPlayers, setDecryptedPlayers] = React.useState<Set<number>>(new Set());

  return (
    <>
      <main className="space-y-10 pb-16">
      <section className="hero-grid frosted relative overflow-hidden rounded-3xl border border-white/5 p-8 md:p-12">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f3f]/60 via-transparent to-[#30ffb1]/10" />
        <div className="relative flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm uppercase tracking-[0.35em] text-[--muted]">
            Encrypted MVP Voting
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white md:text-5xl">
            Rate your match MVP with <span className="text-[--accent]">FHE-protected</span> scoring (1-11).
          </h1>
          <p className="max-w-3xl text-lg text-zinc-200">
            Rate players from 1 to 11 points using homomorphically encrypted scoring on the `EncryptedMvpVoting` smart contract.
            Fans can submit ratings, stewards can audit encrypted tallies, and aggregated scores are revealed.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-200">
            <StatusPill label="Active chain" value={connectedChain} icon={<ShieldCheck className="h-4 w-4" />} />
            <StatusPill label="Contract" value={contractBadge} icon={<Lock className="h-4 w-4" />} />
            <StatusPill
              label="Encryption runtime"
              value={voting.statusMessage ?? (allowActions ? "Ready for ballots" : "Connect a wallet")}
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InsightCard
          title="Rating submissions"
          metric={voting.players.reduce((sum, player) => sum + player.ballots, 0)}
          description="Total rating votes submitted across all players."
          accent="from-emerald-400/50 to-cyan-400/10"
        />
        <InsightCard
          title="Latest decrypted tally"
          metric={
            voting.players.filter((player) => typeof player.lastClear === "number").length > 0
              ? Math.max(...voting.players.map((player) => player.lastClear ?? 0))
              : 0
          }
          description="Clear-text score from the last local decrypt."
          accent="from-yellow-400/40 to-orange-400/5"
        />
        <InsightCard
          title="Oracle requests"
          metric={voting.players.filter((player) => player.lastRequester && player.lastRequester !== "0x0000000000000000000000000000000000000000").length}
          description="Tally reveals requested from the Zama oracle."
          accent="from-indigo-400/40 to-slate-900/60"
        />
      </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Team Rating Leaderboard</h2>
                <p className="text-sm text-[--muted]">
                  {isClient && process.env.NODE_ENV === 'development' && isLocalhost
                    ? 'Demo mode: Vote for players and view results instantly.'
                    : 'Vote for players, then click "Decrypt (MetaMask)" to trigger a wallet transaction and reveal the total scores.'
                  }
                </p>
              </div>
          <button
            onClick={voting.refreshPlayers}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/40"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh roster
          </button>
        </div>

        {voting.players.length === 0 ? (
          <div className="frosted flex flex-col items-center gap-3 rounded-2xl px-8 py-12 text-center">
            <p className="text-lg font-medium text-white">No encrypted votes recorded yet.</p>
            <p className="text-sm text-[--muted]">
              Deploy the contract to your connected network and place the first ballot to light up the scoreboard.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {voting.players.map((player) => (
              <article
                key={player.id}
                className="frosted flex flex-col justify-between rounded-3xl border border-white/5 p-6 transition hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-[--muted]">Player #{player.id + 1}</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">{player.name}</h3>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-200">
                    {player.ballots} ballots
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[--muted]">
                  <span>
                    Cipher handle: <code className="text-[--foreground]">{player.handle.slice(0, 10)}...</code>
                  </span>
                  <span className="text-xs uppercase tracking-[0.4em] text-white/50">
                    Clear votes: {decryptedPlayers.has(player.id) ? (player.lastClear ?? "•••") : "•••"}
                  </span>
                </div>
                <div className="mt-6 space-y-3">
                  {/* Rating Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Rate Player (1-11):</label>
                    <div className="grid grid-cols-4 gap-1">
                      {Array.from({ length: 11 }, (_, i) => i + 1).map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setSelectedRatings(prev => ({ ...prev, [player.id]: rating }))}
                          className={`w-8 h-8 rounded-lg border text-xs font-semibold transition ${
                            selectedRatings[player.id] === rating
                              ? 'bg-emerald-500 text-black border-emerald-400'
                              : 'border-white/20 text-white hover:border-white/40'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                    {selectedRatings[player.id] && (
                      <p className="text-xs text-emerald-300">
                        Selected rating: {selectedRatings[player.id]} ⭐
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    {votedPlayers.has(player.id) ? (
                      <div className="rounded-2xl bg-gray-600/50 px-4 py-3 text-center text-gray-300 border border-gray-500/30">
                        <p className="text-sm font-medium">✓ Vote submitted</p>
                        <p className="text-xs">Rating: {selectedRatings[player.id] || 'N/A'}</p>
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          const success = await voting.voteForPlayer(player.id, selectedRatings[player.id] || 1);
                          if (success) {
                            // Mark this player as voted for
                            setVotedPlayers(prev => new Set([...prev, player.id]));
                            // Clear any previously decrypted score for this player
                            setDecryptedPlayers(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(player.id);
                              return newSet;
                            });
                          }
                        }}
                        disabled={!allowActions || voting.isCasting || !selectedRatings[player.id]}
                        className="rounded-2xl bg-gradient-to-r from-emerald-400/80 to-cyan-500/70 px-4 py-3 font-semibold text-black transition hover:from-emerald-300 hover:to-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {voting.isCasting ? 'Submitting...' : 'Cast Rating Vote'}
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        setShowDecryptModal(true);
                        setDecryptProgress("🔐 Initiating MetaMask transaction...");

                        try {
                          await voting.decryptLocally(player.id, (progress: string) => {
                            setDecryptProgress(progress);
                          });
                          setDecryptedPlayers(prev => new Set([...prev, player.id]));
                          setDecryptProgress("✅ Vote data decrypted successfully!");
                          setTimeout(() => setShowDecryptModal(false), 2000);
                        } catch (error) {
                          console.error("Decryption failed:", error);
                          setDecryptProgress("❌ Process cancelled or failed");
                          setTimeout(() => setShowDecryptModal(false), 3000);
                        }
                      }}
                      disabled={!allowActions || voting.isDecrypting || decryptedPlayers.has(player.id)}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {decryptedPlayers.has(player.id)
                        ? "✅ Decrypted"
                        : voting.isDecrypting
                        ? voting.statusMessage || "🔐 Decrypting..."
                        : "🔓 Decrypt (MetaMask)"
                      }
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="frosted rounded-3xl border border-white/5 p-8 text-sm text-zinc-300">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-semibold text-white">Encrypted workflow recap</p>
            <p>
              1) Submit a vote → 2) Pull encrypted leaderboard → 3) Request FHE oracle decrypt or use local developer
              keys.
            </p>
          </div>
          <a
            href="https://github.com/PatriciaLawson33/votechain-ballot-box"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-white transition hover:border-white/40"
          >
            Borrowed UI energy <ArrowRight className="h-4 w-4" />
          </a>
      </div>
      </section>
    </main>

    {/* Decryption Progress Modal */}
    {showDecryptModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 border border-gray-600">
            <div className="text-center">
              <div className="text-4xl mb-4">
                {decryptProgress.includes("Initiating") && "🔐"}
                {decryptProgress.includes("Sending") && "📡"}
                {decryptProgress.includes("Waiting") && "⏳"}
                {decryptProgress.includes("Fetching") && "📊"}
                {decryptProgress.includes("direct data access") && "🔓"}
                {decryptProgress.includes("cancelled") && "❌"}
                {decryptProgress.includes("confirmed") && "✅"}
                {decryptProgress.includes("decrypted") && "✅"}
              </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {decryptProgress.includes("MetaMask") ? "MetaMask Transaction" :
               decryptProgress.includes("direct data access") ? "Reading Vote Data" :
               "Decrypting Vote Data"}
            </h3>
            <p className="text-gray-300 mb-4">{decryptProgress}</p>
            {decryptProgress.includes("MetaMask") && (
              <p className="text-sm text-yellow-400 mb-4">
                ⚠️ Please check your MetaMask wallet for the transaction popup
              </p>
            )}
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-300 ${
                decryptProgress.includes("completed") || decryptProgress.includes("decrypted") ? "bg-green-500 w-full" :
                decryptProgress.includes("cancelled") ? "bg-red-500 w-full" :
                decryptProgress.includes("direct data access") ? "bg-yellow-500 animate-pulse w-4/5" :
                "bg-blue-500 animate-pulse w-3/4"
              }`}></div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function StatusPill({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-white">
      <span className="rounded-full bg-white/10 p-1 text-[--accent]">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-[0.3em] text-[--muted]">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  metric,
  description,
  accent,
}: {
  title: string;
  metric: number;
  description: string;
  accent: string;
}) {
  return (
    <div className={`frosted rounded-3xl border border-white/5 bg-gradient-to-br ${accent} p-6`}>
      <p className="text-sm uppercase tracking-[0.3em] text-[--muted]">{title}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{formatter.format(metric)}</p>
      <p className="mt-2 text-sm text-[--muted]">{description}</p>
    </div>
  );
}
