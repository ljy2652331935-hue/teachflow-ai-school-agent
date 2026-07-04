# Decision: Project Brain Structure

## 决策标题

使用仓库根目录 `docs/brain/` 作为 Codex + Obsidian 项目大脑

## 日期

2026-07-02

## 背景

TeachFlow 已经从早期 demo 发展为包含诊断、干预、教师控制层、学生端、理解地图、School Agent、双 Agent、共享 workspace API、角色边界的 MVP。项目历史分散在对话、README、PILOT_NOTES、MORNING_PROGRESS_REPORT 和代码中。Codex 每次进入项目时需要快速恢复上下文。

## 选项

- 选项 A：只继续维护 README。
- 选项 B：在活跃 app 目录 `outputs/teachflow-v0.1/docs` 建立文档。
- 选项 C：在仓库根目录建立 `docs/brain/`，并链接活跃 app 与既有文档。

## 最终选择

选择选项 C：仓库根目录 `docs/brain/`。

## 原因

- Codex 进入仓库根目录时最容易发现。
- 可以统一索引多个历史输出目录，包括 `teachflow-demo-case`、`teachflow-mvp` 和当前 `teachflow-v0.1`。
- 避免把项目记忆绑定到容易改名的 app 输出目录。
- 适合 Obsidian 作为长期知识库读取。

## 影响

- `AGENTS.md` 要求复杂任务前先读 `docs/brain/INDEX.md` 和 `docs/brain/CURRENT_STATE.md`。
- 未来功能、修复和架构变化要更新 `docs/brain/devlog/YYYY-MM-DD.md`。
- 重要决策要写入 `docs/brain/decisions/`。

## 后续检查点

- 如果将来仓库结构从 `outputs/` 迁移为正式 app 根目录，需要更新 `INDEX.md`、`ARCHITECTURE.md` 和 `AGENTS.md`。
- 如果引入真实认证或数据库，需要新增对应决策记录。
