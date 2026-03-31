import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv[2] || "dev";
const extraArgs = process.argv.slice(3);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nextBin = path.resolve(__dirname, "../node_modules/.bin/next");

function redact(line) {
  return line
    .replace(/(\/api\/auth\/callback\/\w+)\?[^\s]+/g, "$1?[REDACTED]")
    .replace(/([?&])(code|state|id_token|access_token|refresh_token)=([^&\s]+)/g, "$1$2=[REDACTED]");
}

const child = spawn(nextBin, [mode, ...extraArgs], {
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
});

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");

child.stdout.on("data", (chunk) => process.stdout.write(redact(chunk)));
child.stderr.on("data", (chunk) => process.stderr.write(redact(chunk)));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
