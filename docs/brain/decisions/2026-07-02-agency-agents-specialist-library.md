# 决策标题

Use `agency-agents` As The Codex Specialist Role Library

## 日期

2026-07-02

## 背景

TeachFlow 已经从单页 demo 逐步变成学校可试用的 AI 教学系统原型。后续开发会涉及架构、数据边界、AI prompt/schema、教师端 UI、学生隐私、安全审查和文档交付。单一视角容易把项目做散，因此需要一套可重复调用的专家角色流程。

## 选项

1. 不安装角色库，只靠普通 Codex 会话推进。
2. 一次性让所有专家角色共同修改项目。
3. 安装 `agency-agents`，并按阶段调用少量合适角色。

## 最终选择

选择方案 3：安装 `agency-agents` 为 Codex custom-agent 角色库，并在 TeachFlow 中按阶段使用。

## 原因

- 能把架构、后端、prompt、前端、UX、安全、代码审查和文档分成清晰阶段。
- 避免多个角色同时扩展范围导致 TeachFlow 偏离“老师端教学控制系统”的主线。
- 和当前项目大脑配合后，后续 Codex 可以更快进入正确工作模式。

## 影响

- 233 个 Codex custom-agent TOML 文件安装到 `~/.codex/agents/`。
- 新增 `docs/brain/AGENT_WORKFLOW.md` 作为 TeachFlow 的专家角色调用说明。
- 后续复杂任务应该优先选择一个合适专家角色，而不是笼统要求“所有 agents 一起做”。

## 后续检查点

- 确认 Codex 桌面端在新会话或重启后能识别 custom agents。
- 下一轮开发先用 `Software Architect` 做架构审查。
- 安全审查阶段用 `Security Architect` 和 `Data Privacy Officer`，因为库中没有精确名为 `Security Reviewer` 的角色。
