import { execSync, spawn } from "node:child_process";
import { platform } from "node:os";

function waitForHttp(url, timeoutMs = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryFetch = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      fetch(url, { signal: AbortSignal.timeout(2000) })
        .then((res) => {
          if (res.ok || res.status === 400) resolve();
          else setTimeout(tryFetch, 1000);
        })
        .catch(() => setTimeout(tryFetch, 1000));
    };
    tryFetch();
  });
}

function openBrowser(url) {
  const cmd =
    platform() === "win32"
      ? `start ${url}`
      : platform() === "darwin"
        ? `open ${url}`
        : `xdg-open ${url}`;
  execSync(cmd, { stdio: "ignore" });
}

async function main() {
  console.log(">>> Starting Hardhat local node...");
  const node = spawn("npx", ["hardhat", "node"], {
    stdio: "inherit",
    shell: true,
  });

  console.log(">>> Waiting for Hardhat JSON-RPC at http://127.0.0.1:8545/...");
  await waitForHttp("http://127.0.0.1:8545/");

  console.log(">>> Running setup:local (deploy + ABI sync + bootstrap)...");
  execSync("npm run setup:local", { stdio: "inherit", shell: true });

  console.log(">>> Starting frontend dev server...");
  const frontend = spawn("npm", ["run", "dev"], {
    cwd: "frontend",
    stdio: "inherit",
    shell: true,
  });

  console.log(">>> Waiting for frontend to finish compiling at http://localhost:3000...");
  await waitForHttp("http://localhost:3000");

  console.log(">>> Opening http://localhost:3000...");
  openBrowser("http://localhost:3000");

  console.log("\n>>> All systems ready. Press Ctrl+C to stop everything.");
  console.log("    Hardhat RPC:  http://127.0.0.1:8545/");
  console.log("    Frontend:     http://localhost:3000");

  const cleanup = () => {
    frontend.kill();
    node.kill();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  frontend.on("exit", () => {
    node.kill();
    process.exit(0);
  });

  node.on("exit", () => {
    frontend.kill();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
