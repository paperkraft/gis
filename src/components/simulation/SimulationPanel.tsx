"use client";

import { useSimulationStore } from "@/store/simulationStore";
import { SetupView } from "./SetupView";
import { ResultsView } from "./ResultsView";

export function SimulationPanel() {
  const { history, status } = useSimulationStore();

  if (status === "completed" && history) {
    return <ResultsView />;
  }

  return <SetupView />;
}
