import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(new URL("../package.json", import.meta.url));
const react = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const notifications = [];
let perm = "granted";
class FakeNotification {
  constructor(t, o) { this.title = t; this.options = o; notifications.push(this); }
  close() {}
  static get permission() { return perm; }
  static requestPermission() { return Promise.resolve(perm); }
}

/** Minimal EventSource double that records handlers and lets the test emit frames. */
const sources = [];
class FakeEventSource {
  constructor(url) {
    this.url = url;
    this.handlers = new Map();
    this.closed = false;
    sources.push(this);
  }
  addEventListener(type, fn) { this.handlers.set(type, fn); }
  emit(type, data) { const fn = this.handlers.get(type); if (fn) fn({ data: JSON.stringify(data) }); }
  close() { this.closed = true; }
}

const doc = {
  querySelector: () => null,
  createElement: () => ({ dataset: {}, set textContent(v) {}, appendChild() {}, getContext: () => ({ drawImage() {} }), toDataURL: () => "data:image/png;base64,FAKE", width: 0, height: 0 }),
  head: { appendChild: () => {} },
};
function FakeImage() { const s = this; Object.defineProperty(this, "src", { set(v) { setTimeout(() => s.onload && s.onload(), 0); } }); }
const win = {
  __ModuleLoader__: null, document: doc, Image: FakeImage, focus: () => {},
  EventSource: FakeEventSource,
  CustomEvent: class CustomEvent { constructor(t, o) { this.type = t; this.detail = o?.detail; } },
  dispatchEvent: (e) => { win.__dispatched = e; },
};
win.__ModuleLoader__ = { load: (h) => { win.__handoff = h; } };

const code = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
new Function("window", "Notification", "fetch", "setTimeout", "setInterval", "clearInterval", "Image", code)(
  win, FakeNotification, () => Promise.resolve({ ok: true, text: () => Promise.resolve("<svg/>") }),
  setTimeout, setInterval, clearInterval, FakeImage
);
const mod = win.__handoff.factory((s) => {
  if (s === "react") return react;
  if (s === "@deepseek-ai/dsh-client-ui-primitives") {
    return {
      Modal: ({ open, title, children, footer }) => open
        ? react.createElement("div", { role: "dialog", "aria-label": title }, react.createElement("h2", null, title), children, react.createElement("div", null, footer))
        : null,
      Button: ({ children, onClick, disabled }) => react.createElement("button", { onClick, disabled }, children),
    };
  }
  throw new Error("require " + s);
});

let failed = 0;
const check = (l, c) => { const ok = !!c; if (!ok) failed += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${l}`); };

// ---- inject: no session-domain service is required at all ----
console.log("inject:", JSON.stringify(mod.inject));
check("inject is only slots+locale", mod.inject.join(",") === "slots,locale");
check("no sessions service dependency", !mod.inject.includes("sessions"));

// ---- apply wires the stream and the two slots ----
const registered = [];
const ctx = {
  effect: (fn) => { fn(); return () => {}; },
  locale: { register: () => {}, bind: () => (k, p) => (p ? `${k}:${JSON.stringify(p)}` : k) },
  slots: { inject: (key, cb) => { registered.push(key); cb(); }, register: (o, c) => { mod.__comps = mod.__comps ?? {}; mod.__comps[o.name] = c; return () => {}; } },
};
mod.apply(ctx);
console.log("registered slots:", registered.join(", "));
check("opens exactly one stream", sources.length === 1);
check("stream points at the host route", sources[0].url === "/dsh-notify/stream");
check("registers the invite + settings row",
  registered.includes("shell.overlay") && registered.includes("settings.general.item"));
check("does not hijack any composer slot",
  !registered.some((k) => k.startsWith("conversation.")));

// ---- a completion frame must produce exactly one notification ----
const source = sources[0];
source.emit("hello", { seq: 7 });

source.emit("completion", { seq: 8, sessionId: "s1", label: "修复登录 bug", at: Date.now() });
// notifications are constructed after the icon is rasterized, so let those ticks run
await new Promise((r) => setTimeout(r, 20));
check("completion notifies", notifications.length === 1);
check("title is 任务完成", notifications[0].title === "任务完成");
check("body names the session", notifications[0].options.body.includes("修复登录 bug"));
check("stats count the event", mod.STREAM_STATS.received === 1);
check("watermark advanced", mod.STREAM_STATS.seq === 8);

source.emit("completion", { seq: 9, sessionId: "s2", label: "部署脚本", failed: "exit 1" });
await new Promise((r) => setTimeout(r, 20));
check("second completion notifies", notifications.length === 2);
check("a failed turn says 任务出错", notifications[1].title === "任务出错");
check("failure text is in the body", notifications[1].options.body.includes("exit 1"));

// ---- clicking a notice asks the shell to open that session ----
notifications[0].onclick();
check("click dispatches the open-session event", win.__dispatched?.detail === "s1");

// ---- denied permission silences everything ----
perm = "denied";
const before = notifications.length;
source.emit("completion", { seq: 10, sessionId: "s3", label: "X" });
await new Promise((r) => setTimeout(r, 20));
check("denied permission blocks the notice", notifications.length === before);
check("but the event is still counted", mod.STREAM_STATS.received === 3);
perm = "granted";

// ---- the settings row renders the live link state ----
const html = renderToStaticMarkup(react.createElement(mod.__comps["settings.general.item"], { t: (k, p) => (p ? `${k}` : k) }));
check("settings row renders", html.length > 0);
check("settings row exposes the test button", html.includes("notify.test"));
check("settings row shows the link state", html.includes("notify.stats"));

console.log(failed === 0 ? "CLIENT TEST PASSED" : `${failed} CHECKS FAILED`);
// The poller keeps an interval alive, so exit explicitly with the verdict.
process.exit(failed === 0 ? 0 : 1);
