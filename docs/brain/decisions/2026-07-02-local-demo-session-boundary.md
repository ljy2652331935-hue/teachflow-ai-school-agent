# 决策标题

Use Local Demo Sessions For The First Role/Class Boundary

## 日期

2026-07-02

## 背景

TeachFlow 已经有老师端、学生端、统一数据层和后端 class/alias 权限检查，但页面仍主要依赖前端默认上下文或 query 参数。要走向学校试用，需要让系统先具备最小的登录、角色、班级边界闭环。

## 选项

1. 继续使用 query 参数和前端常量模拟角色。
2. 直接接入真实账号、密码、数据库和外部认证。
3. 先实现本地 demo session：从安全 demo 账号中选择身份，服务端签发 HttpOnly cookie，workspace API 使用 session 里的角色和班级上下文。

## 最终选择

选择方案 3：使用本地 demo session 作为 MVP 的第一层身份边界。

## 原因

- 比 query 参数更接近真实系统，能在服务端统一判断身份。
- 比完整生产认证更轻，不会拖慢 MVP 的教学系统主线。
- 保持匿名 alias 和本地试用原则，不引入真实学生身份数据。
- 方便后续替换成真实 session、学校 SSO 或数据库账号模型。

## 影响

- 新增 `session-store.js` 管理本地 session 和 safe account listing。
- 新增 `auth-ui.js` 和 `login.html` 提供登录、切换身份和页面角色守卫。
- Workspace API 未登录时返回 `401`。
- Workspace API 优先使用 session context，学生不能通过 query 参数伪装成老师。
- 审计事件开始记录登录、登出、学生提交、workspace reset 和越权失败。

## 后续检查点

- 补浏览器级登录流程测试。待确认
- 增加老师可见的审计日志面板。待确认
- 生产试点前必须替换或加固真实身份认证、session 存储、CSRF 防护和数据保留策略。
