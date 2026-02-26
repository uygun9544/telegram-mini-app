import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const backendDir = path.join(rootDir, "server");
function runStep(cwd, command, label) {
  console.log(`\n[deploy-check] ${label}`);
  try {
    execSync(command, {
      cwd,
      stdio: "inherit",
    });
  } catch {
    console.error("деплой упал");
    process.exit(1);
  }
}

const mode = process.argv[2] ?? "full";

if (mode === "frontend") {
  runStep(rootDir, "npm run lint:strict", "frontend lint (strict)");
  runStep(rootDir, "npm run build", "frontend build");
  process.exit(0);
}

runStep(rootDir, "npm run lint:strict", "frontend lint (strict)");
runStep(rootDir, "npm run build", "frontend build");
runStep(backendDir, "npm run check", "backend syntax check");
