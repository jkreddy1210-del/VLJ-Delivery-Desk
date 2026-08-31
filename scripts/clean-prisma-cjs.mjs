import { rmSync, existsSync } from "node:fs";
import path from "node:path";

const dir = path.resolve("src/generated/prisma");
const stubs = ["client.js", "default.js", "index.js", "edge.js", "index-browser.js"];

for (const file of stubs) {
  const full = path.join(dir, file);
  if (existsSync(full)) {
    rmSync(full);
    console.log("removed", file);
  }
}
