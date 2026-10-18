window.__ModuleLoader__.load({
	id: "dsh-notify",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		/** The browser global, referenced explicitly so nothing here depends on which scope resolves a bare `document`. */
		const win = window;

		/**
		* The DeepSeek whale mark, inlined.
		*
		* It used to be fetched from a host route (`/notify/whale.svg`). That broke
		* on the desktop app, which serves the renderer from its own `dsh-app://`
		* origin where host routes are not reachable — the fetch 404s and every
		* notification would lose its icon. Carrying the path in the bundle makes
		* the icon work identically on the web surface and inside the desktop shell,
		* with no request at all.
		*/
		const WHALE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 50 50" fill="none"><path d="M48.8354 10.0479C48.3232 9.79199 48.1025 10.2798 47.8032 10.5278C47.7007 10.6079 47.6143 10.7119 47.5273 10.8076C46.7793 11.624 45.9048 12.1597 44.7622 12.0957C43.0923 12 41.666 12.5356 40.4058 13.8398C40.1377 12.2319 39.2476 11.272 37.8926 10.6558C37.1836 10.3359 36.4668 10.0156 35.9702 9.31982C35.6235 8.82373 35.5293 8.27197 35.356 7.72754C35.2456 7.3999 35.1353 7.06396 34.7651 7.00781C34.3633 6.94385 34.2056 7.2876 34.0479 7.57568C33.418 8.75195 33.1733 10.0479 33.1973 11.3599C33.2524 14.312 34.4736 16.6641 36.8999 18.3359C37.1758 18.5278 37.2466 18.7197 37.1597 19C36.9946 19.5757 36.7974 20.1357 36.624 20.7119C36.5137 21.0801 36.3486 21.1597 35.9624 21C34.6309 20.4321 33.481 19.5918 32.4644 18.5757C30.7393 16.8721 29.1792 14.9917 27.2334 13.52C26.7764 13.1758 26.3193 12.856 25.8467 12.5518C23.8618 10.584 26.1069 8.96777 26.627 8.77588C27.1704 8.57568 26.8159 7.8877 25.0591 7.896C23.3022 7.90381 21.6953 8.50391 19.647 9.30371C19.3477 9.42383 19.0322 9.51172 18.7095 9.58398C16.8501 9.22363 14.9199 9.14355 12.9033 9.37598C9.10596 9.80762 6.07275 11.6396 3.84326 14.7681C1.16455 18.5278 0.53418 22.7998 1.30664 27.2559C2.11768 31.9521 4.46582 35.8398 8.07373 38.8799C11.8159 42.0322 16.1255 43.5762 21.041 43.2803C24.0269 43.104 27.3516 42.6963 31.1016 39.4561C32.0469 39.936 33.0396 40.1279 34.686 40.272C35.9546 40.3921 37.1758 40.208 38.1211 40.0078C39.6021 39.688 39.4995 38.2881 38.9639 38.0322C34.623 35.9678 35.5762 36.8081 34.71 36.1279C36.9155 33.4639 40.2402 30.6958 41.54 21.728C41.6426 21.0161 41.5557 20.5679 41.54 19.9917C41.5322 19.6396 41.6108 19.5039 42.0049 19.4639C43.0923 19.3359 44.1479 19.0317 45.1167 18.4878C47.9292 16.9199 49.064 14.3438 49.3315 11.2559C49.3711 10.7837 49.3237 10.2959 48.8354 10.0479ZM24.3262 37.8398C20.1196 34.4639 18.0791 33.3521 17.2358 33.3999C16.4482 33.4482 16.5898 34.3682 16.7632 34.9678C16.9443 35.5601 17.1812 35.9683 17.5117 36.4878C17.7402 36.832 17.8979 37.3442 17.2832 37.728C15.9282 38.584 13.5728 37.4399 13.4624 37.3838C10.7207 35.7358 8.42822 33.5601 6.81348 30.584C5.25342 27.7197 4.34766 24.6479 4.19775 21.3677C4.1582 20.5757 4.38672 20.2959 5.15869 20.1519C6.17529 19.96 7.22314 19.9199 8.23926 20.0718C12.5327 20.7119 16.1885 22.6719 19.2529 25.7759C21.002 27.5439 22.3252 29.6558 23.6885 31.7202C25.1377 33.9121 26.6978 36 28.6831 37.7119C29.3843 38.312 29.9434 38.7681 30.479 39.104C28.8643 39.2881 26.1699 39.3281 24.3262 37.8398ZM26.3433 24.6001C26.3433 24.248 26.6191 23.9678 26.9658 23.9678C27.0444 23.9678 27.1152 23.9839 27.1782 24.0078C27.2651 24.04 27.3438 24.0879 27.4067 24.1602C27.5171 24.272 27.5801 24.4321 27.5801 24.6001C27.5801 24.9521 27.3042 25.2319 26.9575 25.2319C26.6108 25.2319 26.3433 24.9521 26.3433 24.6001ZM32.6064 27.8799C32.2046 28.0479 31.8027 28.1919 31.4165 28.208C30.8179 28.2397 30.1641 27.9922 29.8096 27.688C29.2583 27.2158 28.8643 26.9521 28.6987 26.1279C28.6279 25.7759 28.6675 25.2319 28.7305 24.9199C28.8721 24.248 28.7144 23.8159 28.2495 23.4238C27.8716 23.104 27.3911 23.0161 26.8633 23.0161C26.666 23.0161 26.4849 22.9277 26.3511 22.856C26.1304 22.7441 25.9492 22.4639 26.1226 22.1201C26.1777 22.0078 26.4458 21.7358 26.5088 21.688C27.2256 21.272 28.0527 21.4077 28.8169 21.7197C29.5259 22.0161 30.0615 22.5601 30.834 23.3281C31.6216 24.2559 31.7632 24.5117 32.2124 25.208C32.5669 25.752 32.8901 26.312 33.1104 26.9521C33.2446 27.3521 33.0713 27.6802 32.6064 27.8799Z" fill="#000"/></svg>`;
		/** The same mark as a data URL, ready to hand straight to `Notification.icon`. */
		const WHALE_DATA_URL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(WHALE_SVG);
		/** Cached rasterized whale (PNG data URL); null until the first success. */
		let whaleBitmap = null;
		/** In-flight rasterization, shared by concurrent notifications. */
		let whaleBitmapPending = null;

		/**
		* Rasterize the inline whale to a PNG data URL.
		*
		* Windows toasts prefer a bitmap over an SVG; this derives one from the same
		* artwork. Any failure resolves to null so the caller falls back to the SVG
		* data URL and finally to an icon-less notification — a completion notice
		* must never be lost to an icon problem.
		* @returns a PNG data URL, or null when rasterization is unavailable.
		*/
		function loadWhaleBitmap() {
			if (whaleBitmap !== null) return Promise.resolve(whaleBitmap);
			if (whaleBitmapPending !== null) return whaleBitmapPending;
			whaleBitmapPending = new Promise((resolve, reject) => {
				const ImageCtor = win.Image ?? (typeof Image === "function" ? Image : void 0);
				if (ImageCtor === void 0) return reject(new Error("no Image constructor"));
				const image = new ImageCtor();
				image.onload = () => resolve(image);
				image.onerror = () => reject(new Error("whale icon failed to decode"));
				image.src = WHALE_DATA_URL;
			})
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

		/**
		* Resolve the Notification constructor for this host (browser or Electron).
		* @returns the constructor, or undefined when notifications are unavailable.
		*/
		function notificationCtor() {
			if (typeof Notification === "function") return Notification;
			if (typeof win.Notification === "function") return win.Notification;
			return void 0;
		}
		/** Whether the Notification API exists in this host. */
		function notificationsSupported() {
			return notificationCtor() !== void 0;
		}
		/**
		* Current permission, or "unsupported" when the API is absent.
		* @returns permission state string.
		*/
		function permissionState() {
			const ctor = notificationCtor();
			return ctor === void 0 ? "unsupported" : ctor.permission;
		}
		/**
		* Ask for notification permission.
		*
		* MUST be entered synchronously from a user gesture: browsers gate the prompt
		* on transient user activation, which the first await boundary consumes. The
		* request therefore issues before any state update, and only the result is
		* adapted to a promise.
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
		*
		* Title reports the outcome ("任务完成" / "任务出错"); the body names the session
		* so the user knows WHICH task finished. The whale rides `icon` (bitmap when
		* rasterizable, else the SVG data URL). Clicking focuses the window and opens
		* that session.
		* @param options - session id, label, optional error text, and open callback.
		*/
		function notifyCompletion(options) {
			const ctor = notificationCtor();
			if (ctor === void 0 || ctor.permission !== "granted") return;
			const failed = typeof options.error === "string" && options.error.length > 0;
			const title = failed ? "任务出错" : "任务完成";
			const body = failed ? `${options.label}\n${options.error}` : `${options.label} 已完成`;
			const finish = (icon) => {
				try {
					const notification = new ctor(title, {
						body,
						icon: icon ?? WHALE_DATA_URL,
						badge: icon ?? WHALE_DATA_URL,
						tag: `dsh-notify:${options.sessionId}`,
						renotify: true
					});
					notification.onclick = () => {
						try {
							win.focus();
							options.onOpen?.();
							notification.close();
						} catch (error) {}
					};
				} catch (error) {}
			};
			loadWhaleBitmap().then((bitmap) => finish(bitmap ?? WHALE_DATA_URL), () => finish(WHALE_DATA_URL));
		}

		/**
		* The completion watcher: one subscription to the session list that fires a
		* notification on each row's `running` true→false edge — the turn ended.
		*
		* `running` is the signal, deliberately NOT the runtime's `completed` flag:
		* `completed` means "finished while NOT selected" (the sidebar's green
		* done-dot), so working in one conversation at a time — the normal case —
		* never produced it and notifications appeared to fire once and never again.
		*
		* No "you are already looking at it" suppression: with one window open and
		* one conversation in use, every completion would be suppressed and the
		* feature would look broken. A notice that always arrives beats one that is
		* occasionally redundant.
		*
		* Row access is defensive (`id`/`sessionId`, `displayTitle`/`title`): the
		* session-list projection is an internal of the harness and has already
		* changed shape once between releases.
		* @param sessions - the client sessions service.
		* @returns the unsubscriber.
		*/
		function createCompletionWatcher(sessions) {
			/** Last-observed `running` bit per session. */
			const prevRunning = new Map();
			/** The first snapshot only records state; it must not notify retroactively. */
			let primed = false;
			const check = () => {
				const state = sessions.list.getSnapshot();
				const rows = Object.values(state?.byId ?? {});
				const present = new Set();
				for (const row of rows) {
					const id = row.id ?? row.sessionId;
					if (id === void 0) continue;
					present.add(id);
					const running = row.running === true;
					const before = prevRunning.get(id);
					prevRunning.set(id, running);
					if (!primed) continue;
					// The turn ended: it was running and now it is not.
					if (before !== true || running) continue;
					if (row.origin === "subagent") continue;
					notifyCompletion({
						sessionId: id,
						label: row.displayTitle ?? row.title ?? String(id),
						error: typeof row.projectionValues?.lastAgentError === "string" ? row.projectionValues.lastAgentError : void 0,
						onOpen: () => sessions.open(id)
					});
				}
				for (const key of [...prevRunning.keys()]) if (!present.has(key)) prevRunning.delete(key);
				primed = true;
			};
			check();
			return sessions.list.subscribe(check);
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
			"invite.title": "Enable completion alerts",
			"invite.body": "Once enabled, DSH raises a system notification with its whale mark whenever a session's AI turn finishes, so you know which task completed. The button below triggers the browser's own permission prompt — allow it to finish.",
			"invite.accept": "Enable alerts",
			"invite.asking": "Waiting for permission…",
			"invite.later": "Not now",
			"invite.understood": "Got it",
			"invite.blockedTitle": "Notifications are blocked",
			"invite.blockedBody": "This browser has already denied notification permission, and it will not show the prompt again on its own. Click the lock/site-settings icon at the left of the address bar, set Notifications to Allow, then reload this page."
		};

		/** Whether the auto-invite has already been offered in this page load. */
		let inviteShown = false;

		/**
		* The DSH-native invite dialog (stage 1 of the two-stage permission flow).
		*
		* A browser refuses `requestPermission()` outside a user gesture, so a page
		* load can never raise the BROWSER dialog on its own. This dialog is what
		* makes "just open DSH and get asked" work: its confirm button runs the
		* request inside a real click, which is what lets stage 2 (the browser's own
		* prompt) appear at all.
		* @param props - locale seat, open state, blocked flag, callbacks.
		*/
		function NotifyInviteDialog({ t, open, onClose, onResult, blocked = false }) {
			const [busy, setBusy] = react.useState(false);
			const [whale, setWhale] = react.useState(null);
			react.useEffect(() => {
				if (!open) return;
				let live = true;
				loadWhaleBitmap().then((bitmap) => { if (live) setWhale(bitmap); }, () => {});
				return () => { live = false; };
			}, [open]);
			const accept = () => {
				// Request BEFORE any state update: the prompt must open on the click's
				// own stack, before a re-render spends the transient activation.
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
			const footer = blocked
				? [Button ? react.createElement(Button, { key: "ok", variant: "primary", size: "sm", onClick: onClose }, t("invite.understood")) : null]
				: [
					Button ? react.createElement(Button, { key: "later", variant: "outline", size: "sm", onClick: onClose }, t("invite.later")) : null,
					Button ? react.createElement(Button, { key: "on", variant: "primary", size: "sm", disabled: busy, onClick: accept }, busy ? t("invite.asking") : t("invite.accept")) : null
				];
			const body = react.createElement("div", { style: { display: "flex", gap: "12px", alignItems: "flex-start" } }, [
				whale === null ? null : react.createElement("img", {
					key: "whale", src: whale, alt: "", width: 48, height: 48,
					style: { flex: "none", width: "48px", height: "48px" }
				}),
				react.createElement("div", { key: "copy", style: { fontSize: "13px", lineHeight: "20px" } }, blocked ? t("invite.blockedBody") : t("invite.body"))
			]);
			if (typeof Modal !== "function") {
				// No modal primitive available: never block the app. The settings row
				// still offers the permission button, so the feature stays reachable.
				return null;
			}
			return react.createElement(Modal, {
				open,
				onClose,
				title: blocked ? t("invite.blockedTitle") : t("invite.title"),
				closeLabel: t("invite.later"),
				footer
			}, body);
		}

		/**
		* The shell-overlay host: raises the invite once per page load while the
		* permission decision still needs the user.
		*
		* Mounted on `shell.overlay` (root-scoped, rendered by the app frame) rather
		* than the settings onboarding seat, which only mounts for a blank session
		* with Settings open — invisible during ordinary work, which is exactly when
		* this invitation is wanted. `denied` also raises it: the browser will not
		* re-prompt, so the dialog explains where to restore the permission instead.
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
		* One General-settings row: the permission state, the grant button, and a
		* one-click test notification.
		*
		* The test button exists because the failure mode of this feature is silent:
		* notifications can be granted and still be suppressed by the OS, and "it
		* never pops" is indistinguishable from "the plugin is not loaded" without a
		* button that proves the pipeline end to end.
		* @param props - locale seat.
		*/
		function NotifySettingsRow({ t }) {
			const [state, setState] = react.useState(permissionState());
			react.useEffect(() => {
				const timer = setInterval(() => setState(permissionState()), 2000);
				return () => clearInterval(timer);
			}, []);
			const label = state === "granted" ? t("notify.granted") : state === "denied" ? t("notify.denied") : state === "unsupported" ? t("notify.unsupported") : t("notify.grant");
			const Button = primitives.Button;
			return react.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", fontSize: "13px", flexWrap: "wrap" } }, [
				react.createElement("span", { key: "hint", style: { flex: 1, minWidth: "200px" } }, t("notify.hint")),
				Button ? react.createElement(Button, {
					key: "test",
					variant: "outline",
					size: "sm",
					onClick: () => {
						// Bypass the granted check on purpose: the test must report what
						// the host does, including "permission was not granted".
						notifyCompletion({ sessionId: "test", label: t("notify.test") });
					}
				}, t("notify.test")) : null,
				Button ? react.createElement(Button, {
					key: "grant",
					variant: "primary",
					size: "sm",
					disabled: state === "granted" || state === "unsupported",
					onClick: () => { const asked = requestPermission(); asked.then((next) => setState(next)); }
				}, label) : null
			]);
		}

		/**
		* Required services. `remote`/`remote.session` are NOT needed here: this
		* plugin reads only the session LIST projection, whose rows carry `running`
		* directly. (The composer-seat plugins must declare `remote.session` because
		* they reach the model-selection service, whose traced methods resolve
		* `remote.session` against the CALLER's context.)
		*/
		const inject = ["sessions", "slots", "locale"];
		/**
		* Client plugin body: register dictionaries, mount the completion watcher,
		* and contribute the onboarding invite plus a General-settings row.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-notify: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.effect(() => createCompletionWatcher(ctx.sessions), "dsh-notify: completion watcher");
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
		exports.notifyCompletion = notifyCompletion;
		exports.loadWhaleBitmap = loadWhaleBitmap;
		exports.permissionState = permissionState;
		exports.requestPermission = requestPermission;
		exports.createCompletionWatcher = createCompletionWatcher;
		exports.NotifyInviteDialog = NotifyInviteDialog;
		exports.NotifyOnboarding = NotifyOnboarding;
		exports.NotifySettingsRow = NotifySettingsRow;
		return module.exports;
	}
});
