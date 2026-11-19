# Tham chiếu lệnh CLI và phân vùng dự án

Tài liệu này định nghĩa cấu trúc phân vùng thư mục của `vbook-tool` và bảng tham chiếu toàn bộ lệnh CLI trong `tools/cli/index.js` cùng `package.json`.

> [!NOTE]
> Để xem hướng dẫn viết mã nguồn Rhino JavaScript cho từng loại extension, xem [Hướng dẫn kỹ thuật phát triển extension](./EXTENSION_DEVELOPMENT_GUIDE.md). Để xem quy định nâng phiên bản và kiểm tra trước khi commit, xem [Hướng dẫn đóng góp và phát hành](./CONTRIBUTING.md).

---

## Phân vùng thư mục dự án

Kho lưu trữ được chia thành các phân vùng độc lập nhằm tách biệt mã nguồn công khai, công cụ phát triển và dữ liệu thử nghiệm cá nhân.

| Phân vùng | Đường dẫn | Mục đích duy nhất | Trạng thái Git |
| :--- | :--- | :--- | :--- |
| **Extension công khai** | `extensions/<type>/<slug>/` | Chứa mã nguồn `src/`, `plugin.json`, `icon.png` và gói `plugin.zip` phân phối công khai | Được theo dõi (`tracked`) |
| **Catalog gốc** | `plugin.json`, `README.md` | Chỉ mục tổng hợp toàn bộ extension công khai (sinh tự động qua `npm run build:catalog`) | Được theo dõi (`tracked`) |
| **Bộ khung mẫu** | `templates/<type>/` | Mẫu khởi tạo chuẩn cho 9 loại extension chính thức (đồng bộ từ skill chuẩn) | Được theo dõi (`tracked`) |
| **Công cụ CLI và mã hóa** | `tools/cli/`, `tools/encrypt/`, `tools/build-vsix.js` | Bộ lệnh phát triển, kiểm thử, kiểm tra AST, đóng gói và bảo vệ mã nguồn | Được theo dõi (`tracked`) |
| **Skill và điều hướng AI** | `.agents/skills/vbook-extensions/`, `AGENTS.md`, `CLAUDE.md` | Nguồn hướng dẫn duy nhất cho các AI Agent và script REST CLI chuẩn `vbook.js` | Được theo dõi (`tracked`, trừ `servers.json` và `decisions.md`) |
| **Tài liệu dự án** | `docs/` | Đặc tả API upstream và tài liệu kỹ thuật nội bộ | Được theo dõi (`tracked`) |
| **Không gian cá nhân** | `.private/` | Chứa extension thử nghiệm riêng tư và kho mã nguồn tham khảo (`code-reference/`) | Bị bỏ qua (`gitignored`) |
| **Kho riêng Gitea** | `.tea-ext/` | Chứa extension đóng gói riêng cho máy chủ Gitea cá nhân | Bị bỏ qua (`gitignored`) |

---

## Nhóm lệnh kết nối và kiểm thử trên thiết bị (Official REST-API CLI)

Các lệnh này ủy quyền trực tiếp cho `.agents/skills/vbook-extensions/scripts/vbook.js` để giao tiếp với máy chủ HTTP cục bộ trong ứng dụng vBook (`/connect`, `/extension/test`, `/extension/build`, `/extension/install`).

| Tác vụ | Lệnh `npm run` | Lệnh `node` tương đương |
| :--- | :--- | :--- |
| Kiểm tra kết nối thiết bị | `npm run vbook:connect` | `node tools/cli/index.js connect [--server <url>]` |
| Chạy thử một script | `npm run vbook:test -- <ext-dir> <script.js> [args...]` | `node tools/cli/index.js test <ext-dir> <script.js> [args...]` |
| Cài đặt thẳng vào ứng dụng | `npm run vbook:install -- <ext-dir> [--no-icon]` | `node tools/cli/index.js install <ext-dir> [--no-icon]` |
| Đóng gói ZIP qua thiết bị | `npm run vbook:build -- <ext-dir> [out.zip]` | `node .agents/skills/vbook-extensions/scripts/vbook.js build <ext-dir> [out.zip]` |
| Kiểm thử hàng loạt (triage) | `npm run vbook:testall -- [ext...] [--query <kw>] [--json <file>]` | `node tools/cli/index.js testall [ext...] [--query <kw>] [--json <file>]` |

### Thứ tự xác định địa chỉ máy chủ thiết bị

1. Tham số dòng lệnh `--server http://<ip>:<port>`.
2. Biến môi trường `VBOOK_SERVER`.
3. Tệp `.agents/skills/vbook-extensions/scripts/servers.json` (sao chép từ `servers.example.json`, hệ thống tự chọn máy chủ đầu tiên phản hồi `GET /connect`).

---

## Nhóm lệnh khởi tạo, kiểm tra AST và giả lập cục bộ

Các lệnh này vận hành hoàn toàn trên máy phát triển mà không cần kết nối điện thoại.

### Khởi tạo hoặc chỉnh sửa metadata (`ext`)

```bash
# Tạo mới extension từ templates/<type>
npm run ext:create -- --name <ten-hien-thi> --source <url-nguon> --type <novel|comic|video|audio|news|forum|chinese_novel|translate|tts|ai> [--locale <vi|vi_VN|zh|zh_CN|en|en_US>] [--author <tac-gia>] [--dry-run]

# Cập nhật metadata hoặc nâng version trong plugin.json
node tools/cli/index.js ext --mode edit --plugin <ext-dir> [--bump-version] [--source <url-moi>] [--description <mo-ta>] [--dry-run] [--json]
```

- Khi khởi tạo từ bộ mẫu phẳng trong `templates/<type>/`, công cụ tự động đặt `plugin.json` ở thư mục gốc của extension, chuyển toàn bộ tệp `.js` vào `src/`, và đồng bộ `config.DOMAIN.default` cùng `BASE_URL` trong `src/config.js` theo `--source`.

### Kiểm tra hợp đồng manifest và cú pháp Rhino (`validate`)

```bash
npm run ext:validate -- --plugin <ext-dir> [--json]
# hoặc
node tools/cli/index.js validate --plugin <ext-dir> [--json]
```

- Phân tích cây cú pháp trừu tượng (Acorn AST) cho mọi tệp `src/*.js`.
- Kiểm tra sự tồn tại của các script bắt buộc theo từng `metadata.type` trong `plugin.json`.
- Tự động nhận diện các thư viện phụ trợ nạp qua `load("ten-file.js")` để không báo lỗi thiếu `execute()`.
- Chặn các cú pháp không tương thích với Rhino (`async`/`await`, `?.`, `??`, khai báo lại `DOMAIN`) và cảnh báo khi dùng `const` hoặc thiếu kiểm tra `response.ok`.

### Phân tích nhanh cấu trúc trang đích (`analyze`)

```bash
node tools/cli/index.js analyze <url-trang-chi-tiet> [--json]
```

- Tải trang HTML đích, gợi ý bộ chọn CSS cho tiêu đề, tác giả, danh sách chương và sinh đoạn mã khởi đầu cho `detail.js`.

### Chạy giả lập luồng đọc cục bộ (`test-local`)

```bash
npm run test:local -- <ext-dir>
# hoặc
node tools/cli/index.js test-local <ext-dir>
```

- Thực thi chuỗi script trong môi trường VM giả lập Rhino + Cheerio + CryptoJS (`home`/`explore` → danh sách → `article` cho `news`, `posts` cho `forum`, hoặc `detail` → `toc` → `chap` → `search`).

---

## Nhóm lệnh đóng gói, danh mục và đồng bộ dự án

| Lệnh `npm run` | Lệnh CLI đầy đủ | Chức năng |
| :--- | :--- | :--- |
| `npm run build:ext -- --plugin <ext-dir>` | `node tools/cli/index.js build --plugin <ext-dir> [--verify] [--dry-run] [--json]` | Nén `plugin.json`, `icon.png` và `src/` thành `plugin.zip` ở chế độ cục bộ (hoặc kiểm tra độ mới của ZIP với `--verify`) |
| `npm run build:catalog` | `node tools/cli/index.js build-catalog [--json]` | Quét thư mục `extensions/`, cập nhật `plugin.json` gốc và bảng danh sách extension trong `README.md` |
| `npm run ext:verify` | `node tools/cli/index.js verify [--json]` | Kiểm tra toàn bộ extension công khai đã có trong `plugin.json` gốc và có `plugin.zip` mới nhất hay chưa |
| *(chạy qua node)* | `node tools/cli/index.js publish [--json]` | Chạy kiểm tra tổng thể `verify` và hướng dẫn các bước phát hành |
| `npm run skill:sync` | `node tools/cli/index.js sync-skill [--branch <ref>] [--dry-run] [--json]` | Đồng bộ skill chuẩn từ `Darkrai9x/vbook-extensions`, giữ lại bản vá quy tắc Rhino nội bộ và cập nhật `templates/`, `docs/extension-api.md`, `docs/verify-checklist.md` |
| `npm run ref:sync` | `node tools/cli/index.js sync-ref [--manifest <path>] [--json]` | Kéo và gộp các kho extension cộng đồng vào `.private/code-reference/` để tra cứu |
| *(chạy qua node)* | `node tools/cli/index.js check-env [--json]` | Kiểm tra trạng thái cấu hình `.env` (`configured`/`missing`/`unset`) mà không làm lộ giá trị biến |
| `npm run build:vsix` | `node tools/build-vsix.js` | Đóng gói tiện ích mở rộng VS Code Tester thành tệp `.vsix` |

> [!IMPORTANT]
> Đối với các lệnh làm rối mã, mã hóa AES-256-CBC và giải mã gói `.zip` (`encrypt:obfuscate`, `encrypt:aes`, `encrypt:pipeline`, `encrypt:remote`, `encrypt:decode`), xem [Hướng dẫn bảo vệ mã nguồn và giải mã gói extension](./SOURCE_OBFUSCATION_GUIDE.md).
