import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const localTmp = path.join(root, "node_modules", ".vite-tmp");
fs.mkdirSync(localTmp, { recursive: true });

// Redirect TEMP/TMP away from Windows %LOCALAPPDATA%\Temp to avoid AV/indexer locks on esbuild temp files
const env = {
  ...process.env,
  TEMP: localTmp,
  TMP: localTmp,
  TMPDIR: localTmp,
};

function runNodeBin(binRelativePath, args) {
  const binPath = path.join(root, binRelativePath);
  const result = spawnSync(process.execPath, [binPath, ...args], {
    stdio: "inherit",
    env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

try {
  runNodeBin(path.join("node_modules", "typescript", "bin", "tsc"), ["-b"]);
  runNodeBin(path.join("node_modules", "vite", "bin", "vite.js"), ["build"]);
} finally {
  fs.rmSync(localTmp, { recursive: true, force: true });
}
