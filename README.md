# dsh-notify

[English](#english) · [中文](#中文)

System notifications for **DeepSeek Harness (DSH)**: when a session's AI turn finishes, DSH raises a system notification carrying its black-whale mark and tells you **which task** completed.

![preview](preview.png)

---

## English

### What it does

- Fires **whenever any session's AI turn ends** — not only for the session you are looking at.
- Title `任务完成` (or `任务出错` when the turn failed); the body names the session, so the notice answers "which task finished".
- Icon: the **DeepSeek whale**, inlined into the bundle and rasterized to a PNG in the browser (no host route needed, so it also works inside the desktop app).
- **Click** the notification to focus the window and jump to that session.
- De-duplicated: a re-render never re-fires; a later completion of the same session notifies again. Subagent child runs are skipped.

### Install

```sh
# web surface
dsh plugin --profile web add github:SailingBoat-ovo/dsh-notify

# desktop app
dsh plugin --profile desktop add github:SailingBoat-ovo/dsh-notify
```

Or clone and install by path:

```sh
git clone https://github.com/SailingBoat-ovo/dsh-notify
dsh plugin --profile web add ./dsh-notify
```

**Restart DSH afterwards** (restart the app on desktop).

### Permission

Browsers require a user gesture before showing the permission prompt, so on first use DSH shows its own dialog (on the app shell's overlay layer) and the button inside it triggers the browser prompt. Once granted you are never asked again. `denied` is handled explicitly: the dialog explains how to restore the permission instead of offering a button that cannot work.

There is also a row in **Settings → General** with the current permission state and a **"Send a test notification"** button — the fastest way to tell "not loaded" apart from "blocked by the OS".

### How it decides a turn finished

It watches the session-list projection and fires on each row's `running` **true → false** edge. It deliberately does *not* use the runtime's `completed` flag: that flag means "finished while NOT selected", so with one conversation in use it never lit up and notifications appeared to fire once and then never again.

### Compatibility

Works on DSH `0.1.x` (web) and `0.2.1+` (desktop). Pitfalls found while porting to 0.2.x:

1. `dsh.client.inject` may only name **plugin packages that actually exist**. 0.2.x removed `dsh-client-runtime` and `dsh-client-ui-primitives` (the latter is a seed module, not a plugin row); naming them silently kept the client half out of the boot graph — the plugin looked installed but never ran.
2. Declare `remote` **and** `remote.session` in `inject` if any service method you call touches `remote.session` — cordis rebinds `this.ctx` to the **caller** when invoking a traced service.
3. The desktop renderer lives on the `dsh-app://` origin, so host-registered HTTP routes are unreachable; bundle assets instead of fetching them.

### Tests

```sh
npm install
npm test
```

The tests load the real client bundle with a fake DOM/Notification and assert: slot registration, priming (no retroactive notice), per-conversation notifications, inline icon data URL, no duplicates, subagent skip, click-to-open, denied permission, and row-shape tolerance (`id` / `sessionId`).

### License

MIT — see [LICENSE](LICENSE). Third-party marks are described in [NOTICE.md](NOTICE.md).

---

## 中文

### 它做什么

- **任何会话**的 AI 回复结束时都会弹通知，不只是你正在看的那个。
- 标题 `任务完成`（该轮失败则为 `任务出错`），正文带会话标题 —— 直接回答"哪个任务完成了"。
- 图标是 **DeepSeek 鲸鱼**：已内联进 bundle 并由浏览器栅格化成 PNG，不依赖宿主路由，所以桌面版同样有图标。
- **点击通知**：聚焦窗口并跳到该会话。
- 不重复打扰：重复渲染不会重弹；同一会话下次再完成会重新通知；子代理（subagent）子会话跳过。

### 安装

```sh
# Web 版
dsh plugin --profile web add github:SailingBoat-ovo/dsh-notify

# 桌面应用版
dsh plugin --profile desktop add github:SailingBoat-ovo/dsh-notify
```

或克隆后按路径安装：

```sh
git clone https://github.com/SailingBoat-ovo/dsh-notify
dsh plugin --profile web add ./dsh-notify
```

**装完重启 DSH**（桌面版重启应用）。

### 权限

浏览器要求通知授权必须由用户手势触发，所以首次使用时 DSH 会先弹**自己的对话框**（挂在应用外壳的 overlay 层），点其中的按钮才会拉起**浏览器授权窗**。授权过一次后不再打扰。

如果之前被拒绝过（`denied`），弹窗会改为说明如何恢复权限，而不是给一个按了没用的按钮。

**设置 → 通用** 里还有一行状态显示 + **「发一条测试通知」** 按钮 —— 这是区分"插件没加载"和"被系统拦了"最快的方式。

### 判定依据

订阅会话列表，按每行 `running` 的 **true → false** 边沿触发。刻意不用运行时的 `completed` 标志：那个标志的语义是"**你没在看时才置位**"，导致一次只用一个会话时永远不弹（历史 bug）。

### 兼容性

同时适配 DSH `0.1.x`（Web）与 `0.2.1+`（桌面版）。移植到 0.2.x 时踩到的坑：

1. `dsh.client.inject` **只能写真实存在的插件包**。0.2.x 删除了 `dsh-client-runtime` 与 `dsh-client-ui-primitives`（后者只是 seed 模块，不是插件行）；写错会导致客户端半边不被装进启动图 —— 表现是"装了但完全没反应"。
2. 只要你调用的服务方法内部会碰 `remote.session`，`inject` 就必须包含 `remote` 与 `remote.session`：cordis 调用 traced 服务时会把 `this.ctx` 重绑到**调用方**上下文。
3. 桌面版渲染进程在 `dsh-app://` 源下，访问不到宿主注册的 HTTP 路由 —— 资源应内联进 bundle。

### 测试

```sh
npm install
npm test
```

测试会用假 DOM/Notification 直接加载真实客户端 bundle，覆盖：槽位注册、首帧不补弹、多会话各自弹、图标为内联 data URL、不重复、子会话跳过、点击跳转、权限被拒、行形状兼容（`id` / `sessionId`）。

### 许可

MIT，见 [LICENSE](LICENSE)；第三方标识说明见 [NOTICE.md](NOTICE.md)。