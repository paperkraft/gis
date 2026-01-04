"use client";

import { useSimulationStore } from "@/store/simulationStore";
import { SetupView } from "./SetupView";
import { ResultsView } from "./ResultsView";
import { AlertCircle } from "lucide-react";

export function SimulationPanel() {
  const { history, status, error } = useSimulationStore();

  if (status === "error") {
    return (
      <div className="flex flex-col h-full">
        <SetupView />
        {/* Overlay Error Toast */}
        <div className="absolute bottom-20 left-4 right-4 bg-red-50 border border-red-200 p-3 rounded-md flex gap-3 text-red-800 animate-in slide-in-from-bottom-2">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <div className="text-xs">
            <div className="font-bold">Simulation Failed</div>
            <div>{error ? formatError(error) : "Unknown execution error."}</div>
          </div>
        </div>
      </div>
    );
  }

  // Show results if completed
  if (status === "completed" && history) {
    return <ResultsView />;
  }

  return <SetupView />;
}

const formatError = (rawError: string) => {
  // Remove duplicate "Error 200:" prefixes
  // Regex looks for "Error 200:" appearing multiple times
  let clean = rawError.replace(/(EPANET )?Error \d+: /g, "");

  // Capitalize first letter
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);

  // Re-attach the code nicely if you want
  const codeMatch = rawError.match(/Error (\d+):/);
  const code = codeMatch ? `(${codeMatch[1]}) ` : "";

  return `${code}${clean}`;
};
