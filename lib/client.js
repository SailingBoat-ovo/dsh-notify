window.__ModuleLoader__.load({
	id: "dsh-notify",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		/** The browser global, referenced explicitly so nothing depends on scope resolution. */
		const win = window;

		/** Host endpoints owned by this plugin's node half. */
		const ROUTES = {
			stream: "/dsh-notify/stream",
			snapshot: "/dsh-notify/completions",
			whale: "/dsh-notify/whale.svg"
		};

		/** Cached rasterized whale (PNG data URL); null until the first success. */
		let whaleBitmap = null;
		/** In-flight rasterization, shared by concurrent notifications. */
		let whaleBitmapPending = null;

		/**
		* Rasterize the host-served whale mark to a PNG data URL.
		*
		* Windows toasts prefer a bitmap over an SVG. Any failure resolves to null
		* and the caller falls back to the SVG URL, then to an icon-less notice: a
		* completion alert must never be lost to an icon problem.
		* @returns a PNG data URL, or null.
		*/
		function loadWhaleBitmap() {
			if (whaleBitmap !== null) return Promise.resolve(whaleBitmap);
			if (whaleBitmapPending !== null) return whaleBitmapPending;
			whaleBitmapPending = fetch(ROUTES.whale, { cache: "force-cache" })
				.then((response) => response.ok ? response.text() : Promise.reject(new Error("whale unavailable")))
				.then((svg) => new Promise((resolve, reject) => {
					const ImageCtor = win.Image ?? (typeof Image === "function" ? Image : void 0);
					if (ImageCtor === void 0) return reject(new Error("no Image"));
					const image = new ImageCtor();
					image.onload = () => resolve(image);
					image.onerror = () => reject(new Error("decode failed"));
					image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
				}))
				.then((image) => {
					const doc = win.document ?? (typeof document !== "undefined" ? document : void 0);
					if (doc === void 0) throw new Error("no document");
					const size = 128;
					const canvas = doc.createElement("canvas");
					canvas.width = size;
					canvas.height = size;
					const ctx = canvas.getContext("2d");
					if (ctx === null) throw new Error("no 2d context");
					ctx.drawImage(image, 0, 0, size, size);
					return canvas.toDataURL("image/png");
				})
				.then((dataUrl) => {
					whaleBitmap = dataUrl;
					whaleBitmapPending = null;
					return dataUrl;
				}, (error) => {
					whaleBitmapPending = null;
					throw error;
				});
			return whaleBitmapPending;
		}

		/** Resolve the Notification constructor for this host. */
		function notificationCtor() {
			if (typeof Notification === "function") return Notification;
			if (typeof win.Notification === "function") return win.Notification;
			return void 0;
		}
		/** Whether the Notification API exists in this host. */
		function notificationsSupported() {
			return notificationCtor() !== void 0;
		}
		/** Current permission, or "unsupported". */
		function permissionState() {
			const ctor = notificationCtor();
			return ctor === void 0 ? "unsupported" : ctor.permission;
		}
		/**
		* Ask for notification permission.
		*
		* MUST be entered synchronously from a user gesture: browsers gate the prompt
		* on transient user activation, which the first await boundary consumes. The
		* request therefore issues before any state update.
		* @returns the resulting permission state.
		*/
		function requestPermission() {
			const ctor = notificationCtor();
			if (ctor === void 0) return Promise.resolve("unsupported");
			if (ctor.permission !== "default") return Promise.resolve(ctor.permission);
			let pending;
			try {
				pending = ctor.requestPermission();
			} catch (error) {
				return Promise.resolve(ctor.permission);
			}
			return Promise.resolve(pending).then(
				(result) => (typeof result === "string" && result !== "" ? result : ctor.permission),
				() => ctor.permission
			);
		}

		/**
		* Show one completion notification.
		* @param entry - a feed record `{ sessionId, label, failed, seq }`.
		* @param onOpen - invoked when the notice is clicked.
		*/
		function notifyEntry(entry, onOpen) {
			const ctor = notificationCtor();
			if (ctor === void 0 || ctor.permission !== "granted") return;
			const failed = typeof entry?.failed === "string" && entry.failed !== "";
			const title = failed ? "任务出错" : "任务完成";
			const label = entry?.label ?? String(entry?.sessionId ?? "");
			const body = failed ? `${label}\n${entry.failed}` : `${label} 已完成`;
			const finish = (icon) => {
				try {
					const notification = new ctor(title, {
						body,
						icon: icon ?? ROUTES.whale,
						badge: icon ?? ROUTES.whale,
						tag: `dsh-notify:${entry?.sessionId}:${entry?.seq}`,
						renotify: true
					});
					notification.onclick = () => {
						try {
							win.focus();
							onOpen?.(entry);
							notification.close();
						} catch (error) {}
					};
				} catch (error) {}
			};
			loadWhaleBitmap().then((bitmap) => finish(bitmap), () => finish(null));
		}

		/**
		* Live diagnostics for the settings row: this feature fails silently, so the
		* row reports whether the host stream is actually connected.
		*/
		const STREAM_STATS = { state: "idle", seq: 0, received: 0, error: null, lastAt: 0 };
		/** Listeners that re-render the settings row when the counters move. */
		const statsListeners = new Set();
		/** Notify the settings row that the counters moved. */
		function bumpStats() {
			for (const listener of [...statsListeners]) {
				try {
					listener();
				} catch (error) {}
			}
		}

		/**
		* Subscribe to the host completion feed.
		*
		* This is the whole client-side detection story: the HOST decides when a turn
		* finished (`session/event` → `turn/end`) and pushes it here. Nothing reads a
		* client projection, because those are private internals that already changed
		* shape once between releases — `list.byId[*].running` stopped being refreshed
		* live, and `sessions.binding(id)` answers only for an already-retained scope,
		* so a root-level watcher saw `undefined` for every session. That is exactly
		* why the earlier designs silently never fired.
		*
		* One `EventSource` also handles reconnects by itself, so a dropped transport
		* or a rebuilt Host generation recovers without our own retry loop.
		* @param onEntry - called once per completion record.
		* @returns a disposer closing the stream.
		*/
		function subscribeCompletions(onEntry) {
			STREAM_STATS.state = "connecting";
			bumpStats();
			let source;
			try {
				source = new win.EventSource(ROUTES.stream);
			} catch (error) {
				STREAM_STATS.state = "error";
				STREAM_STATS.error = String(error);
				bumpStats();
				return () => {};
			}
			source.addEventListener("hello", (event) => {
				STREAM_STATS.state = "live";
				STREAM_STATS.error = null;
				try {
					const payload = JSON.parse(event.data);
					if (typeof payload?.seq === "number") STREAM_STATS.seq = payload.seq;
				} catch (error) {}
				bumpStats();
			});
			source.addEventListener("completion", (event) => {
				try {
					const entry = JSON.parse(event.data);
					if (typeof entry?.seq === "number") STREAM_STATS.seq = entry.seq;
					STREAM_STATS.received += 1;
					STREAM_STATS.lastAt = Date.now();
					bumpStats();
					onEntry(entry);
				} catch (error) {}
			});
			source.onerror = () => {
				// EventSource reconnects on its own; surface the state, do not thrash.
				STREAM_STATS.state = "reconnecting";
				bumpStats();
			};
			return () => {
				try {
					source.close();
				} catch (error) {}
				STREAM_STATS.state = "closed";
				bumpStats();
			};
		}

		/** Dictionary namespace owned by this plugin. */
		const NS = "dshNotify";
		/** Simplified Chinese dictionary (key-set source of truth). */
		const zh = {
			"notify.grant": "开启完成通知",
			"notify.granted": "完成通知已开启",
			"notify.denied": "通知被拒绝，请在系统/浏览器设置里允许",
			"notify.unsupported": "当前环境不支持系统通知",
			"notify.hint": "会话的 AI 回复结束时，用 DSH 鲸鱼图标弹出系统通知",
			"notify.test": "发一条测试通知",
			"notify.stats": "连接：{state} · 已收到 {received} 条完成事件",
			"state.live": "已连接",
			"state.connecting": "连接中",
			"state.reconnecting": "重连中",
			"state.error": "连接失败",
			"state.idle": "未连接",
			"state.closed": "已关闭",
			"invite.title": "开启任务完成通知",
			"invite.body": "开启后，每当某个会话的 AI 回复结束，DSH 会用鲸鱼图标弹出系统通知，告诉你哪个任务完成了。点击下方「开启通知」，浏览器会再弹一次权限确认，允许即可。",
			"invite.accept": "开启通知",
			"invite.asking": "等待授权…",
			"invite.later": "以后再说",
			"invite.understood": "知道了",
			"invite.blockedTitle": "通知权限已被拒绝",
			"invite.blockedBody": "浏览器此前拒绝了通知权限，出于隐私保护它不会再自动弹出授权窗。请在浏览器地址栏左侧点击「站点设置 / 锁形图标」→ 把「通知」改为「允许」，然后刷新本页即可生效。"
		};
		/** English dictionary. */
		const en = {
			"notify.grant": "Enable completion alerts",
			"notify.granted": "Completion alerts enabled",
			"notify.denied": "Notifications blocked — allow them in system/browser settings",
			"notify.unsupported": "This host does not support system notifications",
			"notify.hint": "Show a system notification with the DSH whale when a session's AI turn finishes",
			"notify.test": "Send a test notification",
			"notify.stats": "Link: {state} · {received} completion event(s) received",
			"state.live": "live",
			"state.connecting": "connecting",
			"state.reconnecting": "reconnecting",
			"state.error": "failed",
			"state.idle": "idle",
			"state.closed": "closed",
			"invite.title": "Enable completion alerts",
			"invite.body": "Once enabled, DSH raises a system notification with its whale mark whenever a session's AI turn finishes. The button below triggers the browser's own permission prompt — allow it to finish.",
			"invite.accept": "Enable alerts",
			"invite.asking": "Waiting for permission…",
			"invite.later": "Not now",
			"invite.understood": "Got it",
			"invite.blockedTitle": "Notifications are blocked",
			"invite.blockedBody": "This browser has already denied notification permission and will not prompt again on its own. Click the lock/site-settings icon at the left of the address bar, set Notifications to Allow, then reload this page."
		};

		/** Whether the invite has already been offered in this page load. */
		let inviteShown = false;

		/**
		* The DSH-native invite dialog (stage 1 of the two-stage permission flow).
		*
		* A browser refuses `requestPermission()` outside a user gesture, so this
		* dialog's confirm button is what lets the browser prompt (stage 2) appear.
		* @param props - locale seat, open state, blocked flag, callbacks.
		*/
		function NotifyInviteDialog({ t, open, onClose, onResult, blocked = false }) {
			const [busy, setBusy] = react.useState(false);
			const [whale, setWhale] = react.useState(null);
			react.useEffect(() => {
				if (!open) return;
				let live = true;
				loadWhaleBitmap().then((bitmap) => {
					if (live) setWhale(bitmap);
				}, () => {});
				return () => {
					live = false;
				};
			}, [open]);
			const accept = () => {
				// Request BEFORE any state update: the prompt must open on the click's stack.
				const asked = requestPermission();
				setBusy(true);
				asked.then((next) => {
					setBusy(false);
					onResult?.(next);
					onClose();
				});
			};
			const Modal = primitives.Modal;
			const Button = primitives.Button;
			if (typeof Modal !== "function") return null;
			const footer = blocked
				? [Button ? react.createElement(Button, { key: "ok", variant: "primary", size: "sm", onClick: onClose }, t("invite.understood")) : null]
				: [
					Button ? react.createElement(Button, { key: "later", variant: "outline", size: "sm", onClick: onClose }, t("invite.later")) : null,
					Button ? react.createElement(Button, { key: "on", variant: "primary", size: "sm", disabled: busy, onClick: accept }, busy ? t("invite.asking") : t("invite.accept")) : null
				];
			return react.createElement(Modal, {
				open,
				onClose,
				title: blocked ? t("invite.blockedTitle") : t("invite.title"),
				closeLabel: t("invite.later"),
				footer
			}, react.createElement("div", { style: { display: "flex", gap: "12px", alignItems: "flex-start" } }, [
				whale === null ? null : react.createElement("img", {
					key: "whale", src: whale, alt: "", width: 48, height: 48,
					style: { flex: "none", width: "48px", height: "48px" }
				}),
				react.createElement("div", { key: "copy", style: { fontSize: "13px", lineHeight: "20px" } }, blocked ? t("invite.blockedBody") : t("invite.body"))
			]));
		}

		/**
		* The shell-overlay host: raises the invite once per page load while the
		* permission decision still needs the user.
		* @param props - locale seat.
		*/
		function NotifyOnboarding({ t }) {
			const [open, setOpen] = react.useState(false);
			const [state] = react.useState(() => permissionState());
			react.useEffect(() => {
				if (inviteShown) return;
				inviteShown = true;
				if (state === "granted" || state === "unsupported") return;
				const timer = setTimeout(() => setOpen(true), 600);
				return () => clearTimeout(timer);
			}, [state]);
			return react.createElement(NotifyInviteDialog, {
				t,
				open,
				blocked: state === "denied",
				onClose: () => setOpen(false),
				onResult: () => {}
			});
		}

		/**
		* One General-settings row: permission state, the grant button, a test
		* notification, and the live link state — the fastest way to tell
		* "not connected" apart from "blocked by the OS".
		* @param props - locale seat.
		*/
		function NotifySettingsRow({ t }) {
			const [state, setState] = react.useState(permissionState());
			const [, force] = react.useState(0);
			react.useEffect(() => {
				const tick = () => setState(permissionState());
				const timer = setInterval(tick, 2000);
				const listener = () => force((n) => n + 1);
				statsListeners.add(listener);
				return () => {
					clearInterval(timer);
					statsListeners.delete(listener);
				};
			}, []);
			const label = state === "granted" ? t("notify.granted") : state === "denied" ? t("notify.denied") : state === "unsupported" ? t("notify.unsupported") : t("notify.grant");
			const Button = primitives.Button;
			return react.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", fontSize: "13px", flexWrap: "wrap" } }, [
				react.createElement("span", { key: "hint", style: { flex: 1, minWidth: "220px" } }, [
					t("notify.hint"),
					react.createElement("span", { key: "stats", style: { display: "block", opacity: 0.6, fontSize: "11px", lineHeight: "16px" } },
						t("notify.stats", { state: t(`state.${STREAM_STATS.state}`), received: String(STREAM_STATS.received) }))
				]),
				Button ? react.createElement(Button, {
					key: "test",
					variant: "outline",
					size: "sm",
					onClick: () => notifyEntry({ sessionId: "test", label: t("notify.test"), seq: 0 }, void 0)
				}, t("notify.test")) : null,
				Button ? react.createElement(Button, {
					key: "grant",
					variant: "primary",
					size: "sm",
					disabled: state === "granted" || state === "unsupported",
					onClick: () => {
						const asked = requestPermission();
						asked.then((next) => setState(next));
					}
				}, label) : null
			]);
		}

		/**
		* Required services: the slot registry and locale. The completion signal
		* arrives over HTTP from this plugin's node half, so no session-domain
		* service is injected — nothing here can break when that domain changes.
		*/
		const inject = ["slots", "locale"];
		/**
		* Client plugin body: open the completion stream, then contribute the invite
		* and the settings row.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-notify: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.effect(() => subscribeCompletions((entry) => {
				notifyEntry(entry, () => {
					// Ask the shell to focus this session. A CustomEvent keeps this plugin
					// free of any session-navigation service (see the module docblock).
					try {
						win.dispatchEvent(new win.CustomEvent("dsh-notify:open-session", { detail: entry.sessionId }));
					} catch (error) {}
				});
			}), "dsh-notify: completion stream");
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dsh-notify-permission",
				order: 20,
				locale: NS
			}, NotifyOnboarding));
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "dsh-notify",
				order: 50,
				locale: NS
			}, NotifySettingsRow));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.notifyEntry = notifyEntry;
		exports.subscribeCompletions = subscribeCompletions;
		exports.loadWhaleBitmap = loadWhaleBitmap;
		exports.permissionState = permissionState;
		exports.requestPermission = requestPermission;
		exports.STREAM_STATS = STREAM_STATS;
		exports.NotifyInviteDialog = NotifyInviteDialog;
		exports.NotifyOnboarding = NotifyOnboarding;
		exports.NotifySettingsRow = NotifySettingsRow;
		return module.exports;
	}
});
