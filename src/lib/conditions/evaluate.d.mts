import type { Condition, ConditionCheck } from "./types";

export const ch1Conditions: Condition[];
export const ch2Conditions: Condition[];
export const ch3Conditions: Condition[];
export const ch4Conditions: Condition[];
export const ch5Conditions: Condition[];
export const ch6Conditions: Condition[];
export const ch7Conditions: Condition[];
export const ch8Conditions: Condition[];
export const ch9Conditions: Condition[];

export function commandMatched(history: string[], command: string, subcommand: string): boolean;
export function gitDiffStagedUsed(history: string[]): boolean;

export function evaluateChapterChecks(
  chapter: number,
  dir: string,
  history: string[],
  runGit: (args: string[], cwd: string) => Promise<string>,
): Promise<ConditionCheck[]>;

export function evaluateDrillChecks(
  id: number,
  dir: string,
  history: string[],
  runGit: (args: string[], cwd: string) => Promise<string>,
): Promise<ConditionCheck[]>;
