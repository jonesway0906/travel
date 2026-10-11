# 部署到 GitHub Pages（得到稳定、可自定义的网址）

**目标网址**：https://jonesway0906.github.io/travel/

这个网址稳定、由你自己控制，且以后更新内容时**网址不变**（不像 WorkBuddy 的临时分享链接，每次发布都会换）。

---

## 前置条件（三件事）

| # | 条件 | 说明 |
| --- | --- | --- |
| 1 | GitHub 账号 | 用户名必须是 `jonesway0906`（否则网址前缀会不一样） |
| 2 | 仓库名必须是 `travel` | 只有仓库名等于 `travel`，网址才会是 `…github.io/travel/`；若命名为 `travel-site` 则网址变成 `…github.io/travel-site/` |
| 3 | 仓库必须是 **Public（公开）** | GitHub Pages 在免费账号下**只能从公开仓库发布**。私有仓库要发布 Pages 需 Pro/Team 订阅 |

---

## 已经准备好的东西

`travel-site/` 目录下已经全部就绪，**不需要任何构建步骤**：

```
travel-site/
├── index.html          首页（单页应用，6 个视图）
├── css/style.css
├── js/app.js
├── data/itinerary.json ★ 唯一的行程数据源
├── .nojekyll           ← 已添加：告诉 Pages 不要用 Jekyll 处理，避免特殊文件被忽略
├── .gitignore
├── README.md
└── 交付报告.md
```

并且已经在本地建好 git 仓库、完成了首次提交（分支 `main`，8 个文件）：

```
11ccb6c 旅行计划网站：长沙·中原·河西走廊 15 日行
```

也就是说：**只剩「推到 GitHub」和「打开 Pages 开关」两步。**

---

## 方式 A：用 WorkBuddy 的 GitHub 连接器（推荐）

1. 在对话左下角的 **＋** 菜单里找到 **GitHub** 连接器并完成授权
2. 授权后告诉我一声，我会：
   - 在你的账号下创建公开仓库 `travel`
   - 把 `travel-site/` 的 8 个文件推送到 `main` 分支
   - 尝试通过 API 直接开启 GitHub Pages（分支 `main` / 根目录）
3. 如果连接器不支持开启 Pages，你在仓库里点一下即可：
   **Settings → Pages → Source 选 `Deploy from a branch` → Branch 选 `main` / `(root)` → Save**
4. 等 1—2 分钟，访问 https://jonesway0906.github.io/travel/

## 方式 B：完全手动（不用连接器）

1. 打开 https://github.com/new
2. **Repository name** 填 `travel`，可见性选 **Public**，不要勾选任何初始化文件，点 **Create repository**
3. 在新建好的仓库页面点 **uploading an existing file**
4. 把 `travel-site/` **里面的**文件（`index.html`、`css/`、`js/`、`data/`、`.nojekyll`、`README.md`、`交付报告.md`）拖进去，Commit
   > ⚠️ 注意：拖**文件夹里面的内容**，不要把 `travel-site` 这个外层文件夹一起拖进去，否则网址会变成 `…/travel/travel-site/`
   > ⚠️ `.nojekyll` 是隐藏文件，网页上传可能看不到它。若上传失败也不影响运行，只是 Pages 会走 Jekyll 处理
5. **Settings → Pages → Source** 选 `Deploy from a branch`，Branch 选 `main` / `(root)`，Save
6. 等 1—2 分钟访问 https://jonesway0906.github.io/travel/

## 方式 C：命令行（已有 git，需你自己的凭据）

```bash
cd travel-site
git remote add origin https://github.com/jonesway0906/travel.git
git push -u origin main
```

推送时会要求身份验证。GitHub 已不支持密码推送，需要用 **Personal Access Token**（Settings → Developer settings → Personal access tokens → 勾选 `repo` 权限）代替密码。

---

## 部署后自检

- 打开 https://jonesway0906.github.io/travel/ ，确认：
  - 首页能看到「长沙 · 中原 · 河西走廊 15 日行」和 8 张统计卡
  - 点顶部「购票日历」能切换视图、能看到「10月11日开售」等条目
  - 点任意「12306 官方购票」按钮能跳转
  - 手机上打开排版正常
- 若显示 404：多数是 Pages 还没构建完（等 1—2 分钟刷新），或仓库不是 Public，或 Branch/目录选错了
- 若样式丢失：检查 `css/` 和 `js/` 是否上传成功（网页上传时容易漏掉子目录）

## 以后怎么更新

改了 `data/itinerary.json`（或任何文件）之后：

- **网页方式**：在仓库里点开对应文件 → 编辑 → Commit，网址不变
- **命令行方式**：`git add -A && git commit -m "更新行程" && git push`，网址不变

这就是用 GitHub Pages 的好处：**内容可以反复更新，网址始终是 https://jonesway0906.github.io/travel/ 。**

---

## 补充：想用自己的域名？

在 **Settings → Pages → Custom domain** 填入你的域名（如 `travel.example.com`），并在域名服务商处加一条 CNAME 记录指向 `jonesway0906.github.io`，然后勾选 Enforce HTTPS。
