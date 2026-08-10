// Wraps `storybook dev` for nodemon (see nodemon.json), whose job is just "restart the whole
// server when .storybook/* or package.json changes" — everyday component/story edits keep
// hitting storybook's own Vite HMR, no restart needed for those.
//
// Two Windows-specific problems this works around:
//
// 1. `storybook dev` is spawned through a shell (needed on Windows to run the `.cmd` shim in
//    node_modules/.bin), which puts a cmd.exe layer between this wrapper and the actual
//    storybook/Vite process. Killing *this* wrapper (whether nodemon signals it or force-kills
//    it) does not kill that shell's own child — confirmed directly: `taskkill /F /PID <wrapper>`
//    leaves storybook running and still bound to the port. The exit/signal handlers below
//    explicitly tree-kill (`taskkill /F /T`) whatever this wrapper spawned, so a *clean*
//    wrapper shutdown takes storybook down with it.
// 2. That still isn't airtight — nodemon can also hard-kill the wrapper in a way that skips JS
//    exit handlers entirely, leaving that generation's storybook orphaned and still holding the
//    port. So every start *also* independently hunts down and kills whatever already holds the
//    port before trying to bind it (regardless of how it got there), and retries a few times if
//    the bind still loses a race — belt and suspenders, since either mechanism alone proved
//    unreliable on its own during testing.
import { execSync, spawn } from "node:child_process";

const PORT = 6006;
const MAX_ATTEMPTS = 4;

function isPortListening(port) {
  try {
    if (process.platform === "win32") {
      const output = execSync("netstat -ano -p tcp", { encoding: "utf8" });
      return output.split("\n").some((line) => line.includes(`:${port}`) && line.toUpperCase().includes("LISTENING"));
    }
    return execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" }).trim().length > 0;
  } catch {
    return false;
  }
}

function killPort(port) {
  try {
    if (process.platform === "win32") {
      const output = execSync("netstat -ano -p tcp", { encoding: "utf8" });
      const pids = new Set();
      for (const line of output.split("\n")) {
        if (line.includes(`:${port}`) && line.toUpperCase().includes("LISTENING")) {
          const pid = line.trim().split(/\s+/).pop();
          if (pid && pid !== "0") pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        } catch {
          // Already gone by the time we got here — fine.
        }
      }
    } else {
      const output = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" });
      for (const pid of output.split("\n").filter(Boolean)) {
        try {
          execSync(`kill -9 ${pid}`);
        } catch {
          // Already gone by the time we got here — fine.
        }
      }
    }
  } catch {
    // Nothing listening on the port — nothing to kill, that's the common case.
  }
}

// A forceful kill doesn't guarantee the OS has released the socket in the same instant — poll
// instead of guessing a fixed delay, so this waits exactly as long as that actually takes.
function waitForPortFree(port, timeoutMs = 2000) {
  const start = Date.now();
  while (isPortListening(port)) {
    if (Date.now() - start > timeoutMs) return;
    execSync(process.platform === "win32" ? "ping -n 1 -w 100 127.0.0.1 >NUL" : "sleep 0.1", { shell: true });
  }
}

let currentChild = null;

function killCurrentChildTree() {
  if (!currentChild || currentChild.pid == null || currentChild.killed) return;
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /F /T /PID ${currentChild.pid}`, { stdio: "ignore" });
    } catch {
      // Already gone — fine.
    }
  } else {
    try {
      process.kill(-currentChild.pid, "SIGKILL");
    } catch {
      // Already gone — fine.
    }
  }
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    killCurrentChildTree();
    process.exit(0);
  });
}
process.on("exit", killCurrentChildTree);

function attempt(n) {
  killPort(PORT);
  waitForPortFree(PORT);

  const startedAt = Date.now();
  currentChild = spawn("npx", ["storybook", "dev", "-p", String(PORT)], { stdio: "inherit", shell: true });

  currentChild.on("exit", (code) => {
    // A crash within a few seconds of starting is what an EADDRINUSE race looks like — a real
    // storybook failure (bad config, syntax error) also exits fast, but retrying a few times
    // costs a couple of seconds at most and self-heals the far more common race, so it's worth
    // paying for both cases rather than trying to tell them apart.
    const ranBriefly = Date.now() - startedAt < 4000;
    if (code !== 0 && ranBriefly && n < MAX_ATTEMPTS) {
      console.log(`[dev] storybook exited early (attempt ${n}/${MAX_ATTEMPTS}), retrying…`);
      attempt(n + 1);
      return;
    }
    process.exit(code ?? 0);
  });
}

attempt(1);
