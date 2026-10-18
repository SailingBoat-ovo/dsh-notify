import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(new URL("../package.json", import.meta.url));
const react = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

let perm = "default";
class FakeNotification {
  constructor() {}
  close() {}
  static get permission() { return perm; }
  static requestPermission() { return Promise.resolve("granted"); }
}
const doc = { querySelector: () => null, createElement: () => ({ dataset: {}, set textContent(v) {}, appendChild() {}, getContext: () => ({ drawImage() {} }), toDataURL: () => "x", width: 0, height: 0 }), head: { appendChild: () => {} } };
function FakeImage() { const s = this; Object.defineProperty(this, "src", { set(v) { setTimeout(() => s.onload && s.onload(), 0); } }); }
const win = { __ModuleLoader__: null, document: doc, Image: FakeImage, focus: () => {} };
win.__ModuleLoader__ = { load: (h) => { win.__handoff = h; } };
const primitives = {
  Modal: ({ open, title, children, footer }) => open
    ? react.createElement("div", { role: "dialog", "aria-label": title }, react.createElement("h2", null, title), children, react.createElement("div", null, footer))
    : null,
  Button: ({ children, onClick, disabled }) => react.createElement("button", { onClick, disabled }, children),
};
const code = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
new Function("window", "Notification", "fetch", "setTimeout", "setInterval", "clearInterval", "Image", code)(
  win, FakeNotification, undefined, setTimeout, setInterval, clearInterval, FakeImage
);
const mod = win.__handoff.factory((s) => s === "react" ? react : s === "@deepseek-ai/dsh-client-ui-primitives" ? primitives : (() => { throw new Error("req " + s); })());

const dict = {
  "invite.title": "开启任务完成通知", "invite.accept": "开启通知", "invite.later": "以后再说",
  "invite.asking": "等待授权…", "invite.body": "开启后会用鲸鱼图标通知你",
  "invite.understood": "知道了", "invite.blockedTitle": "通知权限已被拒绝",
  "invite.blockedBody": "请在地址栏把通知改为允许"
};
const t = (k) => dict[k] ?? k;

let failed = 0;
const check = (l, c) => { const ok = !!c; if (!ok) failed += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${l}`); };

const open = renderToStaticMarkup(react.createElement(mod.NotifyInviteDialog, { t, open: true, onClose: () => {}, onResult: () => {} }));
console.log("--- 邀请弹窗 ---");
console.log(open.replace(/></g, ">\n<"));
check("dialog has role=dialog", open.includes('role="dialog"'));
check("titled 开启任务完成通知", open.includes("开启任务完成通知"));
check("explains the feature", open.includes("鲸鱼图标"));
check("has 开启通知", open.includes("开启通知"));
check("has 以后再说", open.includes("以后再说"));

const closed = renderToStaticMarkup(react.createElement(mod.NotifyInviteDialog, { t, open: false, onClose: () => {}, onResult: () => {} }));
check("closed renders nothing", closed === "");

const blocked = renderToStaticMarkup(react.createElement(mod.NotifyInviteDialog, { t, open: true, blocked: true, onClose: () => {}, onResult: () => {} }));
check("denied state shows recovery copy", blocked.includes("地址栏"));
check("denied state drops the misleading accept button", !blocked.includes("开启通知"));

console.log(failed === 0 ? "DIALOG TEST PASSED" : `${failed} CHECKS FAILED`);
if (failed > 0) process.exit(1);
