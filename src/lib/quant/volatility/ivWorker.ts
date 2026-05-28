import { vectorizedSolveIV } from "./ivSolver";
import type { VectorizedIVInput } from "./types";

self.addEventListener("message", (event: MessageEvent<VectorizedIVInput[]>) => {
  const inputs = event.data;
  
  try {
    // Run the heavy Newton-Raphson vectorization
    const results = vectorizedSolveIV(inputs);
    
    // Send back to the main thread
    self.postMessage({ type: 'SUCCESS', results });
  } catch (error) {
    self.postMessage({ type: 'ERROR', error: String(error) });
  }
});
