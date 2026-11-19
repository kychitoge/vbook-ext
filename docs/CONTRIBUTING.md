# Hướng dẫn đóng góp và quy chuẩn phát hành

Tài liệu này quy định cách thiết lập môi trường máy trạm, chính sách đánh số phiên bản, quy tắc bảo mật và cổng kiểm định chất lượng (Pre-commit Quality Gate) trước khi đưa thay đổi lên GitHub.

> [!NOTE]
> Để tra cứu cú pháp đầy đủ của các lệnh dòng lệnh, xem [Tham chiếu lệnh CLI và phân vùng dự án](./CLI_WORKFLOW.md). Để xem quy tắc viết mã nguồn Rhino JavaScript, xem [Hướng dẫn kỹ thuật phát triển extension trên Rhino runtime](./EXTENSION_DEVELOPMENT_GUIDE.md).

---

## Thiết lập môi trường phát triển

### 1. Cài đặt phụ thuộc cho công cụ CLI

Yêu cầu Node.js 18 trở lên. Tại thư mục gốc của dự án, chạy lệnh:

```bash
npm install
```

### 2. Cấu hình tệp `.env` (Tùy chọn)

Tạo tệp `.env` tại thư mục gốc để khai báo tên tác giả mặc định khi khởi tạo extension mới và địa chỉ máy chủ thiết bị (nếu không dùng `servers.json`):

```env
VBOOK_AUTHOR=kychi
VBOOK_SERVER=http://192.168.1.100:8080
```

Kiểm tra trạng thái cấu hình (lệnh này chỉ báo trạng thái `configured` / `missing` / `unset`, không in giá trị bí mật ra màn hình):

```bash
node tools/cli/index.js check-env
```

### 3. Cấu hình danh sách máy chủ thiết bị (`servers.json`)

Sao chép tệp mẫu `.agents/skills/vbook-extensions/scripts/servers.example.json` thành `.agents/skills/vbook-extensions/scripts/servers.json` và điền danh sách địa chỉ IP:Port hiển thị khi bật chế độ nhà phát triển trong ứng dụng vBook:

```json
{
  "servers": [
    "http://192.168.1.100:8080",
    "http://127.0.0.1:8080"
  ]
}
```

> [!IMPORTANT]
> Tệp `.env` và mọi tệp `servers.json` đều đã được cấu hình trong `.gitignore`. Tuyệt đối không đưa khóa API, mật khẩu, token cá nhân hoặc tệp `servers.json` vào lịch sử commit.

---

## Quy trình đóng góp một extension từ đầu đến cuối

1. **Khởi tạo từ bộ khung mẫu**:
   ```bash
   npm run ext:create -- --name <ten-nguon> --source <url-nguon> --type <novel|comic|video|audio|news|forum|tts|translate|ai>
   ```
2. **Hiện thực hóa và kiểm thử**:
   - Viết các script trong `src/*.js` theo đúng [Đặc tả API extension chính thức](./extension-api.md).
   - Chạy kiểm thử từng script với thiết bị thật qua `npm run vbook:test -- <ext-dir> <script.js> [args...]` và đối chiếu dữ liệu trả về với [Danh mục kiểm tra đầu ra](./verify-checklist.md).
3. **Kiểm tra tĩnh bằng bộ phân tích AST**:
   ```bash
   npm run ext:validate -- --plugin <ext-dir>
   ```
4. **Nâng phiên bản, đóng gói ZIP và đồng bộ danh mục**:
   ```bash
   # Nâng metadata.version thêm 1 (khi sửa extension đã có sẵn)
   node tools/cli/index.js ext --mode edit --plugin <ext-dir> --bump-version

   # Đóng gói plugin.zip
   npm run vbook:build -- <ext-dir>
   # hoặc đóng gói cục bộ: npm run build:ext -- --plugin <ext-dir>

   # Cập nhật plugin.json gốc và bảng README.md
   npm run build:catalog
   ```
5. **Xác minh tính toàn vẹn toàn dự án**:
   ```bash
   npm run ext:verify
   ```

---

## Cổng kiểm định trước khi commit (Pre-commit Checklist)

Trước khi tạo commit hoặc mở Pull Request, hãy đảm bảo toàn bộ các mục sau đều đạt:

- [ ] **Tăng phiên bản (`metadata.version`)**: Đã tăng `metadata.version` thêm `1` trong `plugin.json` đối với mọi extension có chỉnh sửa mã nguồn hoặc cấu hình.
- [ ] **Đạt kiểm tra AST (`npm run ext:validate`)**: Mã nguồn trong `src/*.js` chỉ dùng Pure JS, dùng `let`/`var` (không dùng `const`), không chứa `async`/`await`, `?.`, `??`, và không khai báo lại `DOMAIN`.
- [ ] **Đạt kiểm tra dữ liệu thật**: Mọi script đã được chạy thử và trả về dữ liệu khớp với [Danh mục kiểm tra đầu ra](./verify-checklist.md), không chỉ kiểm tra mỗi `code: 0`.
- [ ] **Gói `plugin.zip` mới nhất**: Đã đóng gói lại `plugin.zip` sau lần sửa cuối cùng của `src/` hoặc `plugin.json`.
- [ ] **Đồng bộ catalog gốc (`npm run build:catalog`)**: Không sửa thủ công `plugin.json` ở thư mục gốc hay bảng danh sách extension trong `README.md`; luôn sinh lại bằng `npm run build:catalog`.
- [ ] **Dọn dẹp tệp tạm**: Đã xóa toàn bộ script probe tạm thời, tệp báo cáo JSON thử nghiệm và tệp `.log` phát sinh trong quá trình debug.
- [ ] **Đúng phân vùng bảo mật**: Các extension cá nhân hoặc thử nghiệm nội bộ phải đặt trong `.private/` hoặc `.tea-ext/`, không đưa vào `extensions/`.

---

## Xử lý sự cố thường gặp

| Tình huống | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| `ext:verify` báo `[OUTDATED_ZIP]` | Tệp trong `src/` hoặc `plugin.json` được sửa sau thời điểm tạo `plugin.zip` | Chạy `npm run build:ext -- --plugin <ext-dir>` hoặc `npm run vbook:build -- <ext-dir>` |
| `ext:verify` báo `[NOT_IN_ROOT]` | Extension mới chưa được cập nhật vào `plugin.json` gốc | Chạy `npm run build:catalog` |
| `vbook:connect` báo không kết nối được máy chủ | Ứng dụng vBook chưa bật chế độ debug/dev hoặc sai IP trong `servers.json` | Bật chế độ nhà phát triển trong ứng dụng vBook, cập nhật IP:Port vào `.agents/skills/vbook-extensions/scripts/servers.json` hoặc truyền `--server http://<ip>:<port>` |
| Lỗi giải mã sau khi chạy mã hóa AES | `metadata.source` hoặc `metadata.author` bị sửa sau khi sinh `*.encrypted.js` | Khôi phục mã nguồn `.js` gốc và chạy lại `npm run encrypt:pipeline -- <ext-dir>` |
