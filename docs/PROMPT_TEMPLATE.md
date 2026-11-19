# Bảng câu lệnh prompt mẫu cho AI Agent (Prompt engineering cheatsheet)

Tài liệu này cung cấp các mẫu câu lệnh ngắn gọn, chuẩn hóa theo 5 chế độ (`CREATE`, `FIX`, `TEST`, `AUDIT`, `REFACTOR`) của skill chuẩn để giao việc cho các AI Agent (Antigravity, Claude Code, Codex, Cursor).

> [!NOTE]
> Toàn bộ quy tắc kiến trúc, ràng buộc Rhino ES6 Safe Mode và đường dẫn CLI đã được nạp tự động qua [`AGENTS.md`](../AGENTS.md) và [`.agents/skills/vbook-extensions/SKILL.md`](../.agents/skills/vbook-extensions/SKILL.md). Bạn chỉ cần gửi câu lệnh ngắn nêu rõ **mục tiêu**, **đường dẫn hoặc URL**, và **phạm vi cho phép** theo các mẫu dưới đây.

---

## 1. Năm chế độ phát triển extension cốt lõi

### Chế độ `CREATE` — Tạo mới một extension hoàn chỉnh

> **Mẫu câu lệnh**:
> ```text
> Tạo mới extension <type> cho nguồn <https://domain.com> tại extensions/<type>/<slug>. Khảo sát live DOM/API, hiện thực đầy đủ các script hợp lệ và chạy vbook:test kiểm chứng từng script theo verify-checklist.
> ```

- **Ví dụ thực tế**:
  - `Tạo mới extension novel cho nguồn https://truyenexample.com tại extensions/novel/kychi_truyenexample. Khảo sát live DOM, viết đầy đủ script và chạy vbook:test kiểm chứng từng script.`
  - `Tạo mới extension news cho nguồn https://baoviet.example.com tại extensions/news/kychi_baoviet với home, genre, search và article.js.`

### Chế độ `FIX` — Sửa lỗi, đổi tên miền hoặc cập nhật bộ chọn CSS

> **Mẫu câu lệnh**:
> ```text
> Sửa extension <extensions/<type>/<slug>>: <mô tả lỗi hoặc domain mới>. Tái hiện lỗi qua vbook:test trước khi sửa, cập nhật selector/domain và kiểm chứng lại toàn bộ luồng bị ảnh hưởng.
> ```

- **Ví dụ thực tế**:
  - `Sửa extension extensions/novel/kychi_ntruyen: đổi tên miền sang https://domainmoi.com, kiểm chứng lại home, detail, toc, chap, search và nâng version thêm 1.`
  - `Sửa lỗi chap.js trả về nội dung rỗng trên extensions/comic/kychi_manga (kiểm tra lazy-load ảnh và referrerpolicy).`

### Chế độ `TEST` — Kiểm thử chỉ đọc (Read-only Verification)

> **Mẫu câu lệnh**:
> ```text
> Chạy kiểm thử read-only cho <extensions/<type>/<slug>> theo mode TEST (không sửa code): kiểm tra toàn bộ chuỗi script trên thiết bị và báo cáo đối chiếu với verify-checklist.
> ```

### Chế độ `AUDIT` — Quét sức khỏe hàng loạt trên kho lưu trữ

> **Mẫu câu lệnh**:
> ```text
> Chạy audit sức khỏe cho <toàn bộ extensions/ hoặc danh sách thư mục> bằng vbook:testall và ext:validate. Phân loại trạng thái WORK, MOVED, EMPTY, CRASH, UNREACHABLE và lập bảng tổng hợp (không tự ý xóa hay sửa).
> ```

### Chế độ `REFACTOR` — Chuẩn hóa mã nguồn theo template mới

> **Mẫu câu lệnh**:
> ```text
> Refactor <extensions/<type>/<slug>> theo mode REFACTOR: đồng bộ cấu trúc về chuẩn templates/<type> hiện hành, thay const bằng let, chuẩn hóa config.js/normalizeUrl và giữ nguyên tuyệt đối hành vi đầu ra.
> ```

---

## 2. Mẫu câu lệnh đóng gói, bảo vệ mã nguồn và bảo trì dự án

Các AI Agent được cấu hình không tự ý build, install, mã hóa hoặc commit nếu không được yêu cầu rõ. Khi cần thực hiện các bước này, hãy nêu tường minh trong câu lệnh:

| Tác vụ | Câu lệnh prompt ngắn gọn |
| :--- | :--- |
| **Đóng gói và cập nhật catalog** | `Nâng version thêm 1 cho <ext-dir>, đóng gói plugin.zip, chạy npm run build:catalog và npm run ext:verify.` |
| **Cài đặt thẳng vào thiết bị** | `Cài đặt trực tiếp <ext-dir> vào ứng dụng vBook qua npm run vbook:install.` |
| **Làm rối và mã hóa AES** | `Chạy quy trình làm rối và mã hóa AES-256-CBC cho <ext-dir> bằng npm run encrypt:pipeline, sau đó kiểm chứng giải mã gói plugin.zip bằng npm run encrypt:decode.` |
| **Đồng bộ skill từ upstream** | `Chạy npm run skill:sync để đồng bộ skill vbook-extensions, templates và tài liệu API mới nhất từ upstream Darkrai9x/vbook-extensions.` |
