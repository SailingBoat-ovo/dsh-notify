import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(new URL("../package.json", import.meta.url));
const react = require("react");

const notifications = [];
let perm = "granted";
class FakeNotification {
  constructor(t, o) { this.title = t; this.options = o; notifications.push(this); }
  close() {}
  static get permission() { return perm; }
  static requestPermission() { return Promise.resolve(perm); }
}
const doc = {
  querySelector: () => null,
  createElement: () => ({ dataset: {}, set textContent(v) {}, appendChild() {}, getContext: () => ({ drawImage() {} }), toDataURL: () => "data:image/png;base64,FAKE", width: 0, height: 0 }),
  head: { appendChild: () => {} },
};
function FakeImage() { const s = this; Object.defineProperty(this, "src", { set(v) { setTimeout(() => s.onload && s.onload(), 0); } }); }
const win = { __ModuleLoader__: null, document: doc, Image: FakeImage, focus: () => {} };
win.__ModuleLoader__ = { load: (h) => { win.__handoff = h; } };
const code = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
new Function("window", "Notification", "fetch", "setTimeout", "setInterval", "clearInterval", "Image", code)(
  win, FakeNotification, undefined, setTimeout, setInterval, clearInterval, FakeImage
);
const mod = win.__handoff.factory((s) => {
  if (s === "react") return react;
  if (s === "@deepseek-ai/dsh-client-ui-primitives") return { Modal: () => null, Button: () => null };
  throw new Error("require " + s);
});

let failed = 0;
const check = (l, c) => { const ok = !!c; if (!ok) failed += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${l}`); };

// ---- fake sessions: the LIST never updates `running` (the 0.2.x reality),
//      while each session's own snapshot does. ----
function makeSessions(ids) {
  const listState = { phase: "ready", ids, byId: Object.fromEntries(ids.map((id) => [id, { id, displayTitle: `会话 ${id}`, running: false }])), current: ids[0] };
  const listListeners = new Set();
  const sessions = {
    list: { getSnapshot: () => listState, subscribe: (fn) => { listListeners.add(fn); return () => listListeners.delete(fn); } },
    open: (id) => { sessions.opened = id; },
    binding: (id) => bindings[id],
  };
  const bindings = {};
  for (const id of ids) {
    let snap = { sessionId: id, running: false };
    const subs = new Set();
    bindings[id] = {
      sessionId: id,
      session: {
        getSnapshot: () => snap,
        subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
      },
    };
    bindings[id].setRunning = (running) => { snap = { ...snap, running }; for (const fn of [...subs]) fn(); };
  }
  sessions.bumpList = () => { for (const fn of [...listListeners]) fn(); };
  sessions.bindings = bindings;
  return sessions;
}

const wait = (ms = 15) => new Promise((r) => setTimeout(r, ms));

// 1) per-session snapshot edge fires even though the list row stays false
{
  notifications.length = 0;
  const sessions = makeSessions(["s1"]);
  const dispose = mod.createCompletionWatcher(sessions);
  await wait();
  check("primed without notifying", notifications.length === 0);

  sessions.bindings.s1.setRunning(true);   // turn starts
  await wait();
  sessions.bindings.s1.setRunning(false);  // turn ends
  await wait();
  check("per-session snapshot completion notifies", notifications.length === 1);
  check("notification names the session", notifications[0]?.options.body.includes("会话 s1"));
  check("notification title is 任务完成", notifications[0]?.title === "任务完成");
  dispose();
}

// 2) list-row edge still works (0.1.x path / belt-and-braces)
{
  notifications.length = 0;
  const sessions = makeSessions(["s2"]);
  const listState = sessions.list.getSnapshot();
  const dispose = mod.createCompletionWatcher(sessions);
  await wait();
  listState.byId.s2.running = true;
  sessions.bumpList();
  await wait();
  listState.byId.s2.running = false;
  sessions.bumpList();
  await wait();
  check("list-row edge notifies as fallback", notifications.length === 1);
  dispose();
}

// 3) both sources reporting the same edge collapse into ONE notification
{
  notifications.length = 0;
  const sessions = makeSessions(["s3"]);
  const listState = sessions.list.getSnapshot();
  const dispose = mod.createCompletionWatcher(sessions);
  await wait();
  sessions.bindings.s3.setRunning(true);
  listState.byId.s3.running = true;
  sessions.bumpList();
  await wait();
  sessions.bindings.s3.setRunning(false);
  listState.byId.s3.running = false;
  await wait();
  sessions.bumpList();   // the list catches up a moment later
  await wait();
  check("dual sources collapse to a single notification", notifications.length === 1);
  dispose();
}

// 4) a session that is already running when the plugin attaches still notifies
{
  notifications.length = 0;
  const sessions = makeSessions(["s4"]);
  sessions.bindings.s4.setRunning(true);   // already mid-turn before mounting
  const dispose = mod.createCompletionWatcher(sessions);
  await wait();
  sessions.bindings.s4.setRunning(false);
  await wait();
  check("attaching mid-turn still notifies on completion", notifications.length === 1);
  dispose();
}

// 5) subagent rows are skipped
{
  notifications.length = 0;
  const sessions = makeSessions(["s5"]);
  sessions.list.getSnapshot().byId.s5.origin = "subagent";
  const dispose = mod.createCompletionWatcher(sessions);
  await wait();
  sessions.bindings.s5.setRunning(true);
  await wait();
  sessions.bindings.s5.setRunning(false);
  await wait();
  check("subagent sessions are skipped", notifications.length === 0);
  dispose();
}

console.log(failed === 0 ? "WATCHER TEST PASSED" : `${failed} CHECKS FAILED`);
if (failed > 0) process.exit(1);
