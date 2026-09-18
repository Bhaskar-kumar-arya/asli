import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CheckItemResult, ScanMethod, ScanWarning } from '@asli/contracts';

export interface PendingConfirmItem {
  identity: CheckItemResult['identity'];
  method: ScanMethod | 'manual';
}

interface ScanFlowState {
  pendingConfirm?: PendingConfirmItem;
  results: CheckItemResult[];
  warnings: ScanWarning[];
  billMode: boolean;
  setPendingConfirm: (item: PendingConfirmItem) => void;
  setResults: (results: CheckItemResult[], warnings?: ScanWarning[], billMode?: boolean) => void;
  reset: () => void;
}

const ScanFlowContext = createContext<ScanFlowState | undefined>(undefined);

export function ScanFlowProvider({ children }: { children: ReactNode }) {
  const [pendingConfirm, setPendingConfirmState] = useState<PendingConfirmItem>();
  const [results, setResultsState] = useState<CheckItemResult[]>([]);
  const [warnings, setWarnings] = useState<ScanWarning[]>([]);
  const [billMode, setBillMode] = useState(false);

  // Stable identities (useCallback with no dependencies) so consumers can
  // safely put these in a useEffect dependency array without looping.
  const setPendingConfirm = useCallback((item: PendingConfirmItem) => setPendingConfirmState(item), []);
  const setResults = useCallback((r: CheckItemResult[], w: ScanWarning[] = [], bill = false) => {
    setResultsState(r);
    setWarnings(w);
    setBillMode(bill);
  }, []);
  const reset = useCallback(() => {
    setPendingConfirmState(undefined);
    setResultsState([]);
    setWarnings([]);
    setBillMode(false);
  }, []);

  const value = useMemo<ScanFlowState>(
    () => ({ pendingConfirm, results, warnings, billMode, setPendingConfirm, setResults, reset }),
    [pendingConfirm, results, warnings, billMode, setPendingConfirm, setResults, reset],
  );

  return <ScanFlowContext.Provider value={value}>{children}</ScanFlowContext.Provider>;
}

export function useScanFlow(): ScanFlowState {
  const ctx = useContext(ScanFlowContext);
  if (!ctx) throw new Error('useScanFlow must be used within ScanFlowProvider');
  return ctx;
}
