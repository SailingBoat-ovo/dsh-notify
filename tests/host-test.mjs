import { apply, completionOf, CompletionFeed, inject, PREFIX } from "../lib/index.js";

let failed = 0;
const check = (l, c) => { const ok = !!c; if (!ok) failed += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${l}`); };

// ---- 1) the declared service names must be the real ones ----
console.log("inject:", JSON.stringify(inject));
check("does not require the sessions service (the event rides ctx)", !inject.includes("sessions"));
check("injects webServer for the feed route", inject.includes("webServer"));

// ---- 2) completionOf: only turn/end counts, and it carries the right fields ----
const session = { id: "sess-1", header: { title: "修复登录 bug", cwd: "G:\\proj\\demo" } };
check("turn/end becomes a record", completionOf(session, { type: "turn/end", data: { turn: 3 } })?.sessionId === "sess-1");
check("record carries the title", completionOf(session, { type: "turn/end", data: { turn: 3 } })?.label === "修复登录 bug");
check("other events are ignored", completionOf(session, { type: "turn/start", data: {} }) === void 0);
check("step events are ignored", completionOf(session, { type: "step/end", data: {} }) === void 0);
check("tool results are ignored", completionOf(session, { type: "tool/result", data: {} }) === void 0);
check("no title falls back to the cwd basename",
  completionOf({ id: "s", header: { cwd: "G:\\proj\\demo" } }, { type: "turn/end", data: {} })?.label === "demo");
check("no title and no cwd falls back to the id",
  completionOf({ id: "s", header: {} }, { type: "turn/end", data: {} })?.label === "s");
check("a failed turn carries the error text",
  completionOf(session, { type: "turn/end", data: { error: "boom" } })?.failed === "boom");

// ---- 3) the feed: monotonic seq, history cap, subscriber push ----
const feed = new CompletionFeed();
const seen = [];
const detach = feed.attach((e) => seen.push(e));
feed.publish({ sessionId: "a", label: "A" });
feed.publish({ sessionId: "b", label: "B" });
check("subscriber receives every publish", seen.length === 2);
check("seq is monotonic", seen[0].seq === 1 && seen[1].seq === 2);
check("entries carry a timestamp", typeof seen[0].at === "number");
detach();
feed.publish({ sessionId: "c", label: "C" });
check("detached subscriber stops receiving", seen.length === 2);
check("snapshot keeps publishing after detach", feed.snapshot().length === 3);
for (let i = 0; i < 40; i += 1) feed.publish({ sessionId: `x${i}`, label: `X${i}` });
check("history is capped", feed.snapshot().length === 30);
check("seq keeps growing past the cap", feed.snapshot().at(-1).seq === 43);

// ---- 4) apply(): registers the routes and wires the listener ----
const routes = [];
let listener = null;
const ctx = {
  effect: (fn) => { fn(); return () => {}; },
  // `session/event` rides the cordis event bus: ctx.on, NOT ctx.sessions.on.
  on: (event, fn) => { if (event === "session/event") listener = fn; return () => {}; },
  webServer: { register: (route) => { routes.push(route); return () => {}; } },
};
apply(ctx);
check("subscribed to session/event", typeof listener === "function");
check("registered one route", routes.length === 1);
check("route owns the documented prefix", routes[0].path === PREFIX);

// fake response objects for the handlers
function fakeResponse() {
  const r = {
    status: 0, headers: null, chunks: [], ended: false,
    writeHead(s, h) { r.status = s; r.headers = h ?? {}; },
    write(c) { r.chunks.push(String(c)); return true; },
    end(b) { r.ended = true; if (b !== void 0) r.chunks.push(String(b)); },
  };
  return r;
}
const handler = routes[0].handler;

// whale.svg
{
  const res = fakeResponse();
  await handler({ method: "GET", url: `${PREFIX}/whale.svg`, on() {} }, res);
  check("serves the whale svg", res.status === 200 && res.chunks.join("").includes("<svg"));
}
// completions snapshot
{
  listener(session, { type: "turn/end", data: { turn: 1 } });
  const res = fakeResponse();
  await handler({ method: "GET", url: `${PREFIX}/completions`, on() {} }, res);
  const body = JSON.parse(res.chunks.join(""));
  check("snapshot lists the completion", body.ok === true && body.entries.length === 1 && body.entries[0].label === "修复登录 bug");
}
// stream: hello frame + a pushed completion
{
  const res = fakeResponse();
  const listeners = {};
  const req = { method: "GET", url: `${PREFIX}/stream`, on: (e, fn) => { listeners[e] = fn; } };
  await handler(req, res);
  const joined = res.chunks.join("");
  check("stream opens with a hello frame", joined.includes("event: hello"));
  check("stream sets text/event-stream", String(res.headers["content-type"]).includes("text/event-stream"));
  listener(session, { type: "turn/end", data: { turn: 2 } });
  check("stream pushes a completion frame", res.chunks.join("").includes("event: completion"));
  check("completion frame carries the session id", res.chunks.join("").includes("sess-1"));
  // closing the request must detach
  listeners.close?.();
  const before = res.chunks.length;
  listener(session, { type: "turn/end", data: { turn: 3 } });
  check("closed stream stops receiving", res.chunks.length === before);
}
// unknown path
{
  const res = fakeResponse();
  await handler({ method: "GET", url: `${PREFIX}/nope`, on() {} }, res);
  check("unknown path is 404", res.status === 404);
}

console.log(failed === 0 ? "HOST TEST PASSED" : `${failed} CHECKS FAILED`);
if (failed > 0) process.exit(1);
