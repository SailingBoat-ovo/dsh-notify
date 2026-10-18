import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(new URL("../package.json", import.meta.url));
const react = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const notifications = [];
let perm = "granted";
let requestCalls = 0;
class FakeNotification {
  constructor(t, o) { this.title = t; this.options = o; notifications.push(this); }
  close() {}
  static get permission() { return perm; }
  static requestPermission() { requestCalls += 1; return Promise.resolve(perm); }
}
const doc = {
  querySelector: () => null,
  createElement: () => ({
    dataset: {}, set textContent(v) {}, appendChild() {},
    getContext: () => ({ drawImage() {} }),
    toDataURL: () => "data:image/png;base64,FAKE", width: 0, height: 0,
  }),
  head: { appendChild: () => {} },
};
function FakeImage() { const s = this; Object.defineProperty(this, "src", { set(v) { s._src = v; setTimeout(() => s.onload && s.onload(), 0); }, get() { return s._src; } }); }
const win = { __ModuleLoader__: null, document: doc, Image: FakeImage, focus: () => { win.__focused = true; } };
win.__ModuleLoader__ = { load: (h) => { win.__handoff = h; } };

const primitives = {
  Modal: ({ open, title, children, footer }) => open
    ? react.createElement("div", { role: "dialog", "aria-label": title }, react.createElement("h2", null, title), children, react.createElement("div", { className: "footer" }, footer))
    : null,
  Button: ({ children, onClick, disabled }) => react.createElement("button", { onClick, disabled }, children),
};

const code = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
new Function("window", "Notification", "fetch", "setTimeout", "setInterval", "clearInterval", "Image", code)(
  win, FakeNotification, undefined, setTimeout, setInterval, clearInterval, FakeImage
);
const mod = win.__handoff.factory((s) => {
  if (s === "react") return react;
  if (s === "@deepseek-ai/dsh-client-ui-primitives") return primitives;
  throw new Error("require " + s);
});
console.log("exports:", Object.keys(mod).join(", "));

// ---- 0.2.1-shaped ctx: services are read directly off ctx ----
let state = { phase: "ready", ids: [], byId: {}, current: undefined };
const listeners = new Set();
const opened = [];
const sessions = {
  list: { getSnapshot: () => state, subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } },
  open: (id) => { opened.push(id); },
};
const registered = [];
const dict = {
  "notify.grant": "开启完成通知", "notify.granted": "完成通知已开启", "notify.denied": "通知被拒绝",
  "notify.unsupported": "不支持", "notify.hint": "AI 回复结束时弹出鲸鱼通知", "notify.test": "发一条测试通知",
  "invite.title": "开启任务完成通知", "invite.body": "说明", "invite.accept": "开启通知",
  "invite.asking": "等待授权…", "invite.later": "以后再说", "invite.understood": "知道了",
  "invite.blockedTitle": "通知权限已被拒绝", "invite.blockedBody": "去地址栏允许"
};
const ctx = {
  sessions,
  effect: (fn) => { fn(); return () => {}; },
  locale: {
    register: () => {},
    bind: () => (key, params) => {
      let s = dict[key] ?? key;
      if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll("{" + k + "}", String(v));
      return s;
    }
  },
  slots: {
    inject: (key, cb) => { registered.push(key); cb(); },
    register: (opts, comp) => { mod.__components = mod.__components ?? {}; mod.__components[opts.name] = comp; return () => {}; },
  },
};

mod.apply(ctx);
console.log("registered slots:", registered.join(", "));

let failed = 0;
const check = (label, cond) => { const ok = !!cond; if (!ok) failed += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${label}`); };

check("registers shell.overlay", registered.includes("shell.overlay"));
check("registers settings.general.item", registered.includes("settings.general.item"));
check("inject list is sessions,slots,locale", mod.inject.join(",") === "sessions,slots,locale");

const setRows = async (rows) => {
  state = { phase: "ready", ids: rows.map((r) => r.id), byId: Object.fromEntries(rows.map((r) => [r.id, r])), current: rows[0]?.id };
  for (const fn of [...listeners]) fn();
  await new Promise((r) => setTimeout(r, 12));
};
const S = (id, title, running, extra = {}) => ({ id, displayTitle: title, running, ...extra });

await setRows([S("a", "会话 A", false)]);
check("priming emits nothing", notifications.length === 0);

await setRows([S("a", "会话 A", true)]);
await setRows([S("a", "会话 A", false)]);
check("session A notifies with its title", notifications.length === 1 && notifications[0].options.body.includes("会话 A"));
await setRows([S("b", "会话 B", true)]);
await setRows([S("b", "会话 B", false)]);
check("session B notifies (multi-conversation regression)", notifications.length === 2);
await setRows([S("c", "会话 C", true)]);
await setRows([S("c", "会话 C", false)]);
check("session C notifies", notifications.length === 3);

check("icon is an inline data URL (works on dsh-app:// too)", String(notifications[0].options.icon).startsWith("data:image/"));

const before = notifications.length;
await setRows([S("c", "会话 C", false)]);
check("re-render does not re-notify", notifications.length === before);

await setRows([S("s", "子代理", true, { origin: "subagent" })]);
await setRows([S("s", "子代理", false, { origin: "subagent" })]);
check("subagent completion skipped", notifications.length === before);

notifications[0].onclick();
check("click opens session and focuses", opened[0] === "a" && win.__focused === true);

perm = "denied";
const n2 = notifications.length;
await setRows([S("d", "会话 D", true)]);
await setRows([S("d", "会话 D", false)]);
check("denied permission blocks notifications", notifications.length === n2);

// Row shape robustness: a row carrying `sessionId` instead of `id`.
perm = "granted";
const n3 = notifications.length;
for (const running of [true, false]) {
  state = { phase: "ready", ids: ["e"], byId: { e: { sessionId: "e", displayTitle: "旧形状", running } }, current: "e" };
  for (const fn of [...listeners]) fn();
  await new Promise((r) => setTimeout(r, 12));
}
check("row with sessionId instead of id also notifies", notifications.length === n3 + 1);

const html = renderToStaticMarkup(react.createElement(mod.__components["settings.general.item"], { t: ctx.locale.bind("dshNotify") }));
check("settings row shows the hint", html.includes("鲸鱼通知"));
check("settings row offers a test notification button", html.includes("发一条测试通知"));

console.log(failed === 0 ? "SMOKE TEST PASSED" : `${failed} CHECKS FAILED`);
if (failed > 0) process.exit(1);
