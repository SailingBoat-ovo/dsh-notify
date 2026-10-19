import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// exercise the plugin through a fake ctx; the toast is captured by reading the
// real spawn call via a monkey-patched module cache (ESM namespace is frozen),
// so instead we rebuild the same script from the module's own builder by
// importing it through a tiny CJS shim.
const src = readFileSync(new URL("../lib/index.js", import.meta.url), "utf8");

// Pull the two pure helpers out of the source and evaluate them in isolation.
// This keeps the test honest (it runs the SAME code) without needing to patch spawn.
function extract(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing ${name}`);
  let depth = 0, i = src.indexOf("{", start);
  const from = i;
  for (; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") { depth -= 1; if (depth === 0) break; }
  }
  return src.slice(start, i + 1);
}

const factory = new Function(`${extract("psQuote")}\n${extract("toastScript")}\nreturn { psQuote, toastScript };`);
const { toastScript } = factory();

console.log("=== 生成的 toast 脚本 ===");
const script = toastScript({ title: "任务完成", body: "测试会话 已完成" });
console.log(script);
console.log("========================\n");

// sanity: quotes must be doubled for PowerShell
const q = factory().psQuote("it's ok");
console.log("psQuote(\"it's ok\") =", JSON.stringify(q), q === "it''s ok" ? "PASS" : "FAIL");

console.log("\n=== 实际执行 ===");
const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
  encoding: "utf8",
});
console.log("exit:", result.status);
if (result.stderr) console.log("stderr:", result.stderr.trim().slice(0, 500));
if (result.stdout) console.log("stdout:", result.stdout.trim().slice(0, 300));
console.log(result.status === 0 ? "TOAST SENT — 请看屏幕右上角" : "TOAST FAILED");
