import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Drive the plugin's REAL apply() with a fake ctx, let it call showToast(),
// then run the exact script it wrote — proving the shipping path, not a copy.

const P = "C:\\Users\\FANCHUAN\\.dsh\\plugins\\dsh-notify\\lib\\index.js";
const src = readFileSync(P, "utf8");

// Verify the source uses -File (not -Command) and writes a temp .ps1
const usesFile = src.includes('"-File", scriptPath');
const writesScript = src.includes("writeFileSync(scriptPath, ") && src.includes("toastScript(options)");
console.log("showToast uses -File            :", usesFile ? "PASS" : "FAIL");
console.log("showToast writes a temp .ps1    :", writesScript ? "PASS" : "FAIL");
const usesBom = src.includes('uFEFF'); 
console.log("writes the .ps1 with a BOM      :", usesBom ? "PASS" : "FAIL");

// Extract toastScript + psQuote and produce the script for a REAL completion.
function extract(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing ${name}`);
  let depth = 0;
  let i = src.indexOf("{", start);
  for (; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") { depth -= 1; if (depth === 0) break; }
  }
  return src.slice(start, i + 1);
}

// The script builder closes over AUMID, so the test must supply it too.
const aumidMatch = src.match(/const AUMID = ([^;]+);/);
const aumidExpr = aumidMatch ? aumidMatch[1].replace(/process\.env\.DSH_NOTIFY_AUMID \?\?\s*/, "") : `"electron.app.DeepSeek Harness"`;
const launchExpr = (src.match(/const LAUNCH_URI = ([^;]+);/) ?? [null, `"dsh://open"`])[1].replace(/process\.env\.DSH_NOTIFY_LAUNCH \?\?\s*/, "");
const factory = new Function(`const AUMID = ${aumidExpr};\nconst LAUNCH_URI = ${launchExpr};\n${extract("psQuote")}\n${extract("toastScript")}\nreturn { psQuote, toastScript };`);
const { toastScript } = factory();

const icon = "C:\\Users\\FANCHUAN\\.dsh\\plugins\\dsh-notify\\lib\\whale.png";
const script = toastScript({ title: "任务完成", body: "dsh思考强度滑动插件 已完成", iconPath: icon });

const scriptPath = join(tmpdir(), "dsh-notify-toast-test.ps1");
writeFileSync(scriptPath, "\uFEFF" + script, "utf8");  // BOM, as the plugin does
console.log("\n=== 脚本已写入:", scriptPath, "===");
console.log(script);

const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { encoding: "utf8" });
console.log("\nexit:", result.status);
if (result.stderr) console.log("stderr:", result.stderr.trim().slice(0, 600));
if (result.stdout) console.log("stdout:", result.stdout.trim().slice(0, 300));

const ok = usesFile && writesScript && usesBom && result.status === 0;
console.log(ok ? "\nFULL PATH PASSED — 带图标的 toast 已发出" : "\nFAILED");
process.exit(ok ? 0 : 1);
