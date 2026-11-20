const { existsSync } = require("node:fs");
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const root = join(__dirname, "..");
const backend = join(root, "backend");
const localPython = join(
  backend,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python"
);
const python =
  process.env.PYTHON || (existsSync(localPython) ? localPython : "python3");

const services = [
  {
    name: "Frontend",
    command: "npm",
    args: ["run", "dev"],
    cwd: join(root, "frontend"),
  },
  {
    name: "Friend recommendation API",
    command: python,
    args: [
      "-m",
      "uvicorn",
      "app.friend_recommendation.http_app:app",
      "--reload",
    ],
    cwd: backend,
  },
];

const children = [];
let stopping = false;

function stop(exitCode) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
  }
}

for (const service of services) {
  console.log(`Starting ${service.name}...`);
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    stdio: "inherit",
  });
  children.push(child);
  child.once("error", (error) => {
    console.error(`Could not start ${service.name}: ${error.message}`);
    stop(1);
  });
  child.once("exit", (code, signal) => {
    if (!stopping) {
      if (signal) console.error(`${service.name} stopped after ${signal}`);
      stop(code ?? 1);
    }
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => stop(signal === "SIGINT" ? 130 : 143));
}
