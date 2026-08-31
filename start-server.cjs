const { spawn } = require("child_process");

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["vite", "preview", "--host", "0.0.0.0", "--port", "5173"];

const child = spawn(cmd, args, { stdio: "inherit", cwd: process.cwd() });

child.on("exit", (code) => {
  process.exit(code);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
  process.exit();
});
