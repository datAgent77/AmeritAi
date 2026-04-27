const { spawn } = require("node:child_process");

const nextBin = require.resolve("next/dist/bin/next");
const env = {
  ...process.env,
};

const args = process.argv.slice(2);

const child = spawn(process.execPath, [nextBin, "dev", ...args], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
