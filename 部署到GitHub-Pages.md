# 部署到 GitHub Pages（稳定、可自定义的网址）

**目标网址**：https://jonesway0906.github.io/travel/
**仓库**：https://github.com/jonesway0906/travel （Public）

这个网址稳定、由你自己控制，以后更新内容时**网址不变**（不像临时分享链接每次发布会换地址）。

---

## 当前状态

| 步骤 | 状态 |
| --- | --- |
| 仓库已创建（Public，名 `travel`） | ✅ |
| 9 个文件已推送到 `main` 分支 | ✅ commit `817fccc1661129d327a7e8bbc9e4b21ddc804eaa` |
| `.nojekyll` 已包含 | ✅ |
| 开启 GitHub Pages | ⬜ **待你点一下**（见下方） |

### 还差这一步：开启 Pages

打开 👉 https://github.com/jonesway0906/travel/settings/pages

**Source** 选 `Deploy from a branch` → **Branch** 选 `main`，目录选 `/ (root)` → 点 **Save**。

等 1—2 分钟，访问 https://jonesway0906.github.io/travel/ 即可。

---

## ⚠️ 本机环境的两个限制（已实测）

1. **`github.com` 被代理拦截**（返回 000 / `CONNECT tunnel failed, response 502`），只有 `api.github.com` 放行。
   → 所以在本机**无法用 `git push`**，必须走 REST API 或网页上传。
2. **WorkBuddy 的 GitHub 连接器是只读的**（写文件返回 403 `Resource not accessible by integration`），
   且没有 Pages 管理能力，也不能创建仓库。
   → 建仓库、开启 Pages 都需要你手动操作；推文件可以用下面的脚本。

---

## 前置条件备忘

| # | 条件 | 说明 |
| --- | --- | --- |
| 1 | 账号 `jonesway0906` | 决定网址前缀 |
| 2 | 仓库名正好是 `travel` | 否则网址会变成 `…github.io/<仓库名>/` |
| 3 | 仓库必须 **Public** | 免费账号的 Pages 只能从公开仓库发布；私有仓库需 Pro 订阅 |

---

## 怎么更新内容（三种方式）

### 方式 1：网页直接改（最省事，适合改行程数据）

1. 打开 https://github.com/jonesway0906/travel/blob/main/data/itinerary.json
2. 点右上角铅笔图标编辑，改完点 **Commit changes**
3. 等 1 分钟，网址内容自动更新

### 方式 2：用随项目附带的推送脚本（一次推全部文件）

本机已备好脚本 `.workbuddy-ai/tools/push_to_github.py`，通过 REST API 提交，绕开被拦截的 `github.com`。

```bash
cd D:/buddyai/2026-10-11-17-39-17
GH_TOKEN='<你的 PAT>' \
  "C:/Users/jonesway/.workbuddy-ai/binaries/python/envs/default/Scripts/python.exe" \
  .workbuddy-ai/tools/push_to_github.py
```

- 需要 **fine-grained PAT**：只授权 `travel` 仓库，**Contents: Read and write**
- 若还想让脚本顺手开启 Pages，再加 **Pages: Read and write**（否则 Pages 需手动开）
- 脚本会读取 `travel-site/` 下全部 9 个文件，一次性生成一个 commit；**内容无变化时自动跳过**，不产生空提交

### 方式 3：网页拖拽上传

仓库页面点 **Add file → Upload files**，把 `travel-site/` **里面的**文件拖进去（注意别把外层文件夹一起拖）。
⚠️ `.nojekyll` 是隐藏文件，网页上传可能漏掉，漏了也不影响运行。

---

## 部署后自检

打开 https://jonesway0906.github.io/travel/ ，确认：

- 首页显示「长沙 · 中原 · 河西走廊 15 日行」和 8 张统计卡
- 顶部「购票日历」能切换视图，能看到「10月11日开售」等条目
- 「12306 官方购票」按钮能跳转
- 手机上排版正常

**若显示 404**：多数是 Pages 还没构建完（等 1—2 分钟刷新），或仓库不是 Public，或 Branch / 目录选错了。
**若样式丢失**：检查 `css/`、`js/` 是否上传成功。

---

## 想用自己的域名？

**Settings → Pages → Custom domain** 填你的域名（如 `travel.example.com`），并在域名服务商处加一条 CNAME 记录指向 `jonesway0906.github.io`，然后勾选 Enforce HTTPS。
