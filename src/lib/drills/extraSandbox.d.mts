export function initializeExtraDrillSandbox(
  drill: number,
  dir: string,
  runGit: (args: string[]) => Promise<string>,
): Promise<boolean>;
