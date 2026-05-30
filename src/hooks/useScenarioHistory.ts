import { useState, useCallback, useEffect } from "react";

export type ScenarioState = {
  selectedTicker: string;
  strategy: string;
  spot: number;
  strike: number;
  spreadWidth: number;
  dte: number;
  iv: number;
  quantity: number;
};

export function useScenarioHistory(
  initialState: ScenarioState, 
  onUndoRevert?: (prevState: ScenarioState, currentState: ScenarioState) => void
) {
  const [past, setPast] = useState<ScenarioState[]>([]);
  // stablePresent is the last "committed" state
  const [stablePresent, setStablePresent] = useState<ScenarioState>(initialState);
  // transientPresent is what the UI binds to (updates instantly on drag/typing)
  const [transientPresent, setTransientPresent] = useState<ScenarioState>(initialState);
  
  const [future, setFuture] = useState<ScenarioState[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, ScenarioState>>({});

  // Load snapshots from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("optixflow_snapshots");
    if (saved) {
      try {
        setSnapshots(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse snapshots", e);
      }
    }
  }, []);

  // Sync transient with stable if stable changes from outside (e.g., undo/redo)
  useEffect(() => {
    setTransientPresent(stablePresent);
  }, [stablePresent]);

  // Update transient state (no history impact)
  const update = useCallback((partial: Partial<ScenarioState>) => {
    setTransientPresent((prev) => {
      // If a user updates state after undoing, future must be purged to prevent broken branches.
      if (future.length > 0) setFuture([]);
      return { ...prev, ...partial };
    });
  }, [future]);

  // Commit current transient state to history
  const commit = useCallback((partial?: Partial<ScenarioState>) => {
    setTransientPresent((prevTransient) => {
      const finalState = partial ? { ...prevTransient, ...partial } : prevTransient;
      
      setStablePresent((prevStable) => {
        // Only push to past if the final state is genuinely different from the last stable state
        if (JSON.stringify(prevStable) !== JSON.stringify(finalState)) {
          setPast((prevPast) => [...prevPast, prevStable]);
        }
        return finalState;
      });
      
      return finalState;
    });
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    if (onUndoRevert) {
      onUndoRevert(previous, stablePresent);
    }
    
    setPast(newPast);
    setFuture((prev) => [stablePresent, ...prev]);
    setStablePresent(previous);
  }, [past, stablePresent, onUndoRevert]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    
    const next = future[0];
    const newFuture = future.slice(1);
    
    setPast((prev) => [...prev, stablePresent]);
    setStablePresent(next);
    setFuture(newFuture);
  }, [future, stablePresent]);

  const saveSnapshot = useCallback((name: string) => {
    const nextSnapshots = { ...snapshots, [name]: transientPresent };
    setSnapshots(nextSnapshots);
    localStorage.setItem("optixflow_snapshots", JSON.stringify(nextSnapshots));
  }, [snapshots, transientPresent]);

  const loadSnapshot = useCallback((name: string) => {
    const target = snapshots[name];
    if (target) {
      commit(); // Save current to past before loading
      setStablePresent(target);
      setFuture([]); // Purge future
    }
  }, [snapshots, commit]);

  return {
    state: transientPresent, // UI binds to transient for smooth 60fps dragging
    update,
    commit,
    undo,
    redo,
    saveSnapshot,
    loadSnapshot,
    snapshots,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
