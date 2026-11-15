# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

Mỗi lần trả lời hãy bắt đầu bằng [con chào bố]

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## 🛠️ 5. VBook Project-Specific Cheat Sheet & Rules

This section merges VBook's codebase architecture and developer workflow instructions.

### 📋 Core User Rules (Quy tắc cốt lõi của dự án)
1. **Luôn luôn đọc tài liệu** và quy tắc trước khi viết hoặc sửa bất kỳ dòng code nào.
2. **Luôn luôn dọn dẹp log** và xóa bỏ các testcase thừa sau khi thực hiện chạy thử nghiệm.
3. **Luôn luôn hỏi ý kiến xác nhận** của User trước khi commit hoặc push code lên GitHub.
4. **Luôn luôn nâng version** trong `plugin.json` lên thêm 1 phiên bản trước khi chuẩn bị commit.

### 💻 Official Admin CLI Commands (Official REST-API CLI)
* **Kết nối server app**: `node .claude/skills/vbook-extensions/scripts/vbook.js connect` (hoặc `npm run vbook:connect`)
* **Chạy test script**: `node .claude/skills/vbook-extensions/scripts/vbook.js test <ext-folder> <script.js> [args...]`
* **Kiểm thử toàn bộ / Audit repo**: `node .claude/skills/vbook-extensions/scripts/vbook.js testall [ext...] [--query <kw>] [--json report.json]` (hoặc `npm run vbook:testall`)
* **Cài đặt trực tiếp vào app**: `node .claude/skills/vbook-extensions/scripts/vbook.js install <ext-folder>`
* **Đóng gói ZIP**: `node .claude/skills/vbook-extensions/scripts/vbook.js build <ext-folder> [out.zip]`

### 💻 Local Tooling CLI Commands
* **Khởi tạo extension**: `npm run ext:create -- --name <Tên_Extension> --source <URL_Nguồn>`
* **Cập nhật catalog tổng**: `npm run build:catalog` (Bắt buộc chạy trước khi commit nếu có đổi extension)

### ⚠️ JS Runtime Constraints (Rhino ES6 Safe Mode)
Script extension chạy trên **Rhino JS engine** (ES6 safe subset) trong app vBook, **KHÔNG phải Node.js**:
* **Chỉ viết Pure JS**: Tuyệt đối không cài thêm Node packages hay dùng `require()`, `import`/`export` trong mã nguồn extension (`src/*.js`). Các gói trong `package.json` chỉ phục vụ CLI/tooling local.
* **Bắt buộc dùng `let` hoặc `var` (KHÔNG dùng `const`)**: Nhiều trường hợp dùng `const` trên Rhino JS engine gây lỗi runtime/syntax; luôn khai báo biến bằng `let` hoặc `var`.
* **Tránh**: `const`, `async/await`, `Promise`, `?.`, `??`, `{...spread}`, `Array.flat`/`flatMap`, `String.matchAll`, default params (`function f(a = 1)`), numeric separators.
* **Cấm**: Khai báo biến trùng tên với key trong `plugin.json.config` (ví dụ `let DOMAIN = ...` gây `SyntaxError` vì app tự tiêm config). Dùng `load('config.js')` và `BASE_URL` (hoặc đọc defensive qua `typeof`).
* **Quy tắc thực chiến (từ `dat-bi/ext-vbook` context)**:
  - Luôn kiểm tra `response.ok` trước khi gọi `.html()`, `.json()`, `.text()`.
  - Ép kiểu Java String sang JS String bằng `+ ""` sau `.text()`, `.attr()`, `.html()`.
  - Luôn đóng `Engine.newBrowser()` trong khối `try { ... } finally { browser.close(); }`.
  - Tránh các hàm Jsoup không ổn định trên Rhino như `tagName()`, `is()`, `tag()`, `doc.body()` (dùng `doc.select("body")` thay thế).

### 📚 Key Documentation Paths
* **Official Extension API (Standard — Darkrai9x)**: [docs/extension-api.md](./docs/extension-api.md)
* **Master Development Guide (Rhino + Context Lessons)**: [docs/EXTENSION_DEVELOPMENT_GUIDE.md](./docs/EXTENSION_DEVELOPMENT_GUIDE.md)
* **Official Verification Checklist**: [docs/verify-checklist.md](./docs/verify-checklist.md)
* **Skill Master Spec**: [.claude/skills/vbook-extensions/SKILL.md](.claude/skills/vbook-extensions/SKILL.md)
* **Decryption Patterns**: [docs/DECRYPTION_PATTERNS.md](./docs/DECRYPTION_PATTERNS.md)
* **Contributing Rules**: [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)
