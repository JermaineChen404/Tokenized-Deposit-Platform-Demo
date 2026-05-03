import { execSync, spawn } from "node:child_process";
import { platform } from "node:os";

const isWin = platform() === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";
const npxCmd = isWin ? "npx.cmd" : "npx";

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

async function openBrowser(url) {
  const cmdArgs =
    isWin
      ? ["start", url]
      : platform() === "darwin"
        ? ["open", url]
        : ["xdg-open", url];
  runSequential(cmdArgs[0], cmdArgs.slice(1), { stdio: "ignore", shell: isWin ? "cmd.exe" : true });
}

function runSequential(command, args, options = {}) {
  const commandLine = `${command} ${args.join(" ")}`;
  execSync(commandLine, {
    stdio: "inherit",
    shell: isWin ? "cmd.exe" : true,
    ...options,
  });
}

function runOrThrow(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function killPortWindows(port = 8545) {
  if (!isWin) return;

  try {
    const pidsRaw = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
      shell: "cmd.exe",
      stdio: ["ignore", "pipe", "ignore"],
    });

    const pids = Array.from(
      new Set(
        pidsRaw
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => line.split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid))
      )
    );

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore", shell: "cmd.exe" });
      } catch {
        // Ignore failures for processes that exited meanwhile.
      }
    }
  } catch {
    // No process is currently bound to this port.
  }
}

function spawnLongRunning(command, args, options = {}) {
  if (isWin) {
    return spawn("cmd.exe", ["/d", "/s", "/c", `${command} ${args.join(" ")}`], {
      stdio: "inherit",
      ...options,
    });
  }

  return spawn(command, args, {
    stdio: "inherit",
    ...options,
  });
}

async function main() {
  killPortWindows(8545);

  console.log(">>> Starting Hardhat local node...");
  const node = spawnLongRunning(npxCmd, ["hardhat", "node"]);

  console.log(">>> Waiting for Hardhat JSON-RPC at http://127.0.0.1:8545/...");
  await waitForHttp("http://127.0.0.1:8545/");

  console.log(">>> Running setup:local (deploy + ABI sync + bootstrap)...");
  runSequential(npxCmd, ["hardhat", "run", "scripts/deploy.js", "--network", "localhost"]);
  runSequential("node", ["extract_abi.js"]);
  runSequential(npxCmd, ["hardhat", "run", "scripts/bootstrap-local.js", "--network", "localhost"]);

  console.log(">>> Starting frontend dev server...");
  const frontend = spawnLongRunning(npmCmd, ["run", "dev"], { cwd: "frontend" });

  console.log(">>> Waiting for frontend to finish compiling at http://localhost:3000...");
  await waitForHttp("http://localhost:3000");

  console.log(">>> Opening http://localhost:3000...");
  await openBrowser("http://localhost:3000");

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
