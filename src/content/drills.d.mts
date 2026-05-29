import type { Condition } from "../lib/conditions/types";

export const TOTAL_DRILLS: number;

export type Drill = {
  id: number;
  title: string;
  prompt: string;
  conditions: Condition[];
};

export const drills: Drill[];
export function getDrill(id: number): Drill | null;
