# 如何安装及配置 gh

- 使用 `brew install gh` 安装 GitHub CLI。
- 首次认证执行 `gh auth login`，按提示选择：
  - GitHub.com
  - HTTPS
  - Login with a web browser（推荐）
- 认证完成后可用 `gh auth status` 验证登录状态。
- 若需切换账号，可先执行 `gh auth logout` 再重新 `gh auth login`。
