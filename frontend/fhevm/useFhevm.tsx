import { ethers } from "ethers";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FhevmInstance } from "./fhevmTypes";
import { createFhevmInstance } from "./internal/fhevm";

function _assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    const m = message ? `Assertion failed: ${message}` : `Assertion failed.`;
    console.error(m);
    throw new Error(m);
  }
}

export type FhevmGoState = "idle" | "loading" | "ready" | "error";

export function useFhevm(parameters: {
  provider: string | ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  enabled?: boolean;
  initialMockChains?: Readonly<Record<number, string>>;
}): {
  instance: FhevmInstance | undefined;
  refresh: () => void;
  error: Error | undefined;
  status: FhevmGoState;
} {
  const { provider, chainId, initialMockChains, enabled = true } = parameters;

  // Always call hooks in the same order - no conditional returns
  const [isClient, setIsClient] = useState(false);
  const [instance, _setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [status, _setStatus] = useState<FhevmGoState>("idle");
  const [error, _setError] = useState<Error | undefined>(undefined);
  const [_isRunning, _setIsRunning] = useState<boolean>(false); // Start as false, will be set to enabled when client is ready
  const [_providerChanged, _setProviderChanged] = useState<number>(0);
  const _abortControllerRef = useRef<AbortController | null>(null);
  const _providerRef = useRef<string | ethers.Eip1193Provider | undefined>(undefined);
  const _chainIdRef = useRef<number | undefined>(undefined);
  const _mockChainsRef = useRef<Record<number, string> | undefined>(initialMockChains);

  // Set client state
  useEffect(() => {
    setIsClient(true);
    _setIsRunning(enabled);
  }, [enabled]);

  const refresh = useCallback(() => {
    // Only execute if we're on the client side
    if (!isClient) return;

    // Provider or chainId has changed. Abort immediately
    if (_abortControllerRef.current) {
      _abortControllerRef.current.abort();
      _abortControllerRef.current = null;
    }

    _providerRef.current = provider;
    _chainIdRef.current = chainId;

    // Nullify instance immediately
    _setInstance(undefined);
    _setError(undefined);
    _setStatus("idle");

    if (provider !== undefined) {
      // Force call main useEffect
      _setProviderChanged((prev) => prev + 1);
    }
  }, [provider, chainId, isClient]);

  // Update refs and trigger refresh when parameters change
  useEffect(() => {
    if (isClient) {
    refresh();
    }
  }, [refresh, isClient]);

  // Main useEffect - only execute complex logic when we're on the client side
  useEffect(() => {
    if (!isClient || !_isRunning) {
      return;
      }

      if (_providerRef.current === undefined) {
        _setInstance(undefined);
        _setError(undefined);
        _setStatus("idle");
        return;
      }

      if (!_abortControllerRef.current) {
        _abortControllerRef.current = new AbortController();
      }

      _assert(
        !_abortControllerRef.current.signal.aborted,
        "!controllerRef.current.signal.aborted"
      );

      _setStatus("loading");
      _setError(undefined);

      const thisSignal = _abortControllerRef.current.signal;
      const thisProvider = _providerRef.current;
      const thisRpcUrlsByChainId = _mockChainsRef.current;

      createFhevmInstance({
        signal: thisSignal,
        provider: thisProvider,
        mockChains: thisRpcUrlsByChainId,
        onStatusChange: (s) =>
          console.log(`[useFhevm] createFhevmInstance status changed: ${s}`),
      })
        .then((i) => {
          console.log(`[useFhevm] createFhevmInstance created!`);
          if (thisSignal.aborted) return;

          _assert(
            thisProvider === _providerRef.current,
            "thisProvider === _providerRef.current"
          );

          _setInstance(i);
          _setError(undefined);
          _setStatus("ready");
        })
        .catch((e) => {
          console.log(`Error Was thrown !!! error... ` + e.name);
          if (thisSignal.aborted) return;

          _assert(
            thisProvider === _providerRef.current,
            "thisProvider === _providerRef.current"
          );

          _setInstance(undefined);
          _setError(e);
          _setStatus("error");
        });
  }, [_isRunning, _providerChanged, isClient]);

  return { instance, refresh, error, status };
}
