import { readFileSync } from "node:fs";
import { apply, CompletionFeed } from "../lib/index.js";

let failed = 0;
const check = (l, c) => { const ok = !!c; if (!ok) failed += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${l}`); };

// ---- pending reveal: recorded on publish, served once ----
const feed = new CompletionFeed();
check("no pending reveal initially", feed.pendingReveal === void 0);
feed.publish({ sessionId: "sess-a", label: "A" });
check("publish records the reveal target", feed.pendingReveal?.sessionId === "sess-a");
feed.publish({ sessionId: "sess-b", label: "B" });
check("the newest completion wins", feed.pendingReveal?.sessionId === "sess-b");
feed.publish({ sessionId: "", label: "no id" });
check("an empty session id never becomes the target", feed.pendingReveal?.sessionId === "sess-b");

// ---- the route consumes the target exactly once ----
const routes = [];
let listener = null;
const ctx = {
  logger: { warn: () => {} },
  effect: (fn) => { fn(); return () => {}; },
  on: (event, fn) => { if (event === "session/event") listener = fn; return () => {}; },
  webServer: { register: (route) => { routes.push(route); return () => {}; } },
};
apply(ctx);
const handler = routes[0].handler;

function fakeResponse() {
  const r = {
    status: 0, headers: null, chunks: [], ended: false,
    writeHead(s, h) { r.status = s; r.headers = h ?? {}; },
    write(c) { r.chunks.push(String(c)); return true; },
    end(b) { r.ended = true; if (b !== void 0) r.chunks.push(String(b)); },
  };
  return r;
}

// A real completion feeds the route through the same path the toast uses.
listener({ id: "sess-1", header: { title: "测试会话" } }, { type: "turn/end", data: { turn: 3 } });

const first = fakeResponse();
await handler({ method: "GET", url: `/dsh-notify/pending-reveal`, on() {} }, first);
const firstBody = JSON.parse(first.chunks.join(""));
check("route returns the pending session", firstBody.ok === true && firstBody.pending?.sessionId === "sess-1");

const second = fakeResponse();
await handler({ method: "GET", url: `/dsh-notify/pending-reveal`, on() {} }, second);
const secondBody = JSON.parse(second.chunks.join(""));
check("the target is consumed once", secondBody.pending === null);

// peek without consuming
listener({ id: "sess-2", header: { title: "第二个" } }, { type: "turn/end", data: { turn: 4 } });
const peek = fakeResponse();
await handler({ method: "GET", url: `/dsh-notify/pending-reveal?take=0`, on() {} }, peek);
const peekBody = JSON.parse(peek.chunks.join(""));
check("take=0 peeks without consuming", peekBody.pending?.sessionId === "sess-2");
const after = fakeResponse();
await handler({ method: "GET", url: `/dsh-notify/pending-reveal`, on() {} }, after);
check("the peeked target is still available", JSON.parse(after.chunks.join("")).pending?.sessionId === "sess-2");

// ---- client wiring: reveals through uiWorkspace on focus ----
const client = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
check("client subscribes to window focus", client.includes('win.addEventListener("focus", onFocus)'));
check("client reveals through uiWorkspace", client.includes("workspace.openSession(target)"));
check("client imports the reveal route", client.includes('pendingReveal: "/dsh-notify/pending-reveal"'));
check("client only navigates when visible", client.includes('doc.visibilityState !== "visible"'));
check("client still offers click-to-open for the web surface", client.includes("notification.onclick"));

console.log(failed === 0 ? "REVEAL TEST PASSED" : `${failed} CHECKS FAILED`);
process.exit(failed === 0 ? 0 : 1);
