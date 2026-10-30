"use client";

import { useCallback, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import type { ShopPair } from "@/lib/types";

export function usePairStatusMutations(onUpdated: (pair: ShopPair) => void, onError: (message: string) => void) {
  const [engravePair, setEngravePair] = useState<ShopPair | null>(null);
  const [inactivePair, setInactivePair] = useState<ShopPair | null>(null);
  const [pending, setPending] = useState(false);

  const confirmEngrave = useCallback(async () => {
    if (!engravePair) {
      return;
    }
    setPending(true);
    try {
      const updated = await api<ShopPair>(`/opticien/pairs/${engravePair.uuid}/engrave`, { method: "POST" });
      setEngravePair(null);
      onUpdated(updated);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        onError(caught.message);
      }
    } finally {
      setPending(false);
    }
  }, [engravePair, onError, onUpdated]);

  const confirmInactive = useCallback(async () => {
    if (!inactivePair) {
      return;
    }
    setPending(true);
    try {
      const updated = await api<ShopPair>(`/opticien/pairs/${inactivePair.uuid}/inactivate`, { method: "POST" });
      setInactivePair(null);
      onUpdated(updated);
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        onError(caught.message);
      }
    } finally {
      setPending(false);
    }
  }, [inactivePair, onError, onUpdated]);

  return {
    engravePair,
    setEngravePair,
    inactivePair,
    setInactivePair,
    pending,
    confirmEngrave,
    confirmInactive,
  };
}
