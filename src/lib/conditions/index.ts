import {
  ch1Conditions,
  ch2Conditions,
  ch3Conditions,
  ch4Conditions,
  ch5Conditions,
  ch6Conditions,
  ch7Conditions,
  ch8Conditions,
} from "./definitions.mjs";
import type { Condition } from "./types";

export const conditionsByChapter: Record<number, Condition[]> = {
  1: ch1Conditions,
  2: ch2Conditions,
  3: ch3Conditions,
  4: ch4Conditions,
  5: ch5Conditions,
  6: ch6Conditions,
  7: ch7Conditions,
  8: ch8Conditions,
};

export function getConditions(chapter: number): Condition[] {
  return conditionsByChapter[chapter] ?? [];
}
