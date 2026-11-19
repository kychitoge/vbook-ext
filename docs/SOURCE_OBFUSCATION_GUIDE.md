# Hướng dẫn bảo vệ mã nguồn và giải mã gói extension

Tài liệu này hướng dẫn cách sử dụng bộ công cụ trong `tools/encrypt/` để làm rối (obfuscate), mã hóa AES-256-CBC cho mã nguồn JavaScript của extension trước khi phát hành, cũng như cách giải mã kiểm tra gói `plugin.zip`.

> [!NOTE]
> Tài liệu này áp dụng cho việc **bảo vệ và kiểm tra gói mã nguồn của chính bạn**. Nếu bạn cần giải mã dữ liệu bài viết/chương truyện từ trang web đích, xem [Các mô hình giải mã nội dung trang nguồn](./DECRYPTION_PATTERNS.md).

---

## Tổng quan bộ công cụ `tools/encrypt/`

Thư mục `tools/encrypt/` gồm 5 công cụ đơn nhiệm, tương ứng với các script trong `package.json`:

| Công cụ | Lệnh `npm run` | Cú pháp trực tiếp | Chức năng duy nhất |
| :--- | :--- | :--- | :--- |
| `pipeline.js` | `npm run encrypt:pipeline -- <ext-dir>` | `node tools/encrypt/pipeline.js <ext-dir>` | Chạy trọn gói 3 bước: Làm rối → Mã hóa AES-256-CBC → Đóng gói `plugin.zip` |
| `obfuscate.js` | `npm run encrypt:obfuscate -- <ext-dir>` | `node tools/encrypt/obfuscate.js <ext-dir>` | Biến đổi `src/*.js` thành `src/*.bundle.js` đã làm rối bằng `javascript-obfuscator` |
| `encrypt.js` | `npm run encrypt:aes -- <ext-dir>` | `node tools/encrypt/encrypt.js <ext-dir>` | Mã hóa `src/*.bundle.js` thành `src/*.encrypted.js` và cập nhật `plugin.json` (`metadata.encrypt = true`) |
| `remote-encrypt.js` | `npm run encrypt:remote -- <ext-dir\|zip>` | `node tools/encrypt/remote-encrypt.js <ext-dir\|zip> [--replace] [--rebuild] [--output <file>]` | Đóng gói và gửi lên dịch vụ mã hóa trực tuyến để nhận về gói ZIP đã mã hóa |
| `decoder.js` | `npm run encrypt:decode -- <input.zip>` | `node tools/encrypt/decoder.js <input.zip> [-o <output.zip>] [-v]` | Giải mã và kiểm tra gói `.zip` extension đã mã hóa |

---

## Quy trình mã hóa cục bộ tiêu chuẩn

### Chạy tự động bằng một lệnh (Khuyến nghị)

```bash
npm run encrypt:pipeline -- extensions/novel/kychi_truyencv
```

Lệnh trên tự động thực hiện tuần tự:

1. **Làm rối (`obfuscate.js`)**: Đọc các tệp `src/*.js` gốc và sinh các tệp `src/*.bundle.js`.
2. **Sinh khóa và mã hóa (`encrypt.js`)**:
   - Đọc `metadata.source` và `metadata.author` từ `plugin.json`.
   - Tính khóa theo công thức chuẩn của runtime vBook:
     ```text
     PAYLOAD = "com.vbook.app" + metadata.source.trim() + metadata.author.trim()
     HEX_KEY = MD5(PAYLOAD)                  // Chuỗi hex 32 ký tự
     AES_KEY = SHA256(HEX_KEY)               // Khóa AES-256 32 bytes
     IV      = Buffer.alloc(16, 0)           // 16 bytes 0 (Null IV)
     ```
   - Mã hóa `AES-256-CBC` (PKCS7 padding), chuyển sang Base64 và thay thế ký tự đánh dấu (`+` → `x0P1Xx`, `/` → `x0P2Xx`, `=` → `x0P3Xx`).
   - Ghi tệp `src/*.encrypted.js`, đặt `metadata.encrypt = true` và trỏ các khóa trong `plugin.json.script` sang tệp `.encrypted.js`.
3. **Đóng gói (`buildExtensionZip`)**: Gọi trực tiếp bộ đóng gói để xuất tệp `plugin.zip` hoàn chỉnh.

---

## Kiểm tra và giải mã gói `.zip` (`decoder.js`)

Công cụ `tools/encrypt/decoder.js` dùng để kiểm chứng gói `plugin.zip` sau khi mã hóa hoặc phục hồi mã nguồn từ gói `.zip` đã đóng gói.

```bash
# Giải mã gói plugin.zip (mặc định xuất ra plugin_decoded.zip cùng thư mục)
npm run encrypt:decode -- extensions/novel/kychi_truyencv/plugin.zip

# Chỉ định đường dẫn tệp ZIP đầu ra và bật log chi tiết
node tools/encrypt/decoder.js extensions/novel/kychi_truyencv/plugin.zip -o ./decoded.zip -v
```

> [!IMPORTANT]
> **Chỉ hỗ trợ giải mã tệp `.zip`**: `decoder.js` từ chối đầu vào là tệp `.js` đơn lẻ. Lý do là khóa giải mã AES phụ thuộc trực tiếp vào `metadata.source` và `metadata.author` nằm trong `plugin.json` bên trong gói `.zip`.

---

## Ba lưu ý quan trọng khi phát hành extension mã hóa

### 1. Ràng buộc với tệp nạp động qua `load("config.js")`

> [!CAUTION]
> Ứng dụng vBook chỉ tự động giải mã các tệp script được khai báo trực tiếp trong đối tượng `"script"` của `plugin.json` (hoặc khi toàn bộ gói được đóng gói qua cơ chế mã hóa đồng bộ). Nếu một tệp phụ trợ bị mã hóa thành chuỗi `x0P1Xx...` nhưng không được runtime giải mã trước khi `load()` thực thi, Rhino sẽ báo lỗi cú pháp ngay lập tức.

- **Cách xử lý**: Giữ `config.js` ở dạng mã JavaScript hợp lệ (chỉ làm rối bằng `obfuscate.js`, không mã hóa AES riêng lẻ nếu `config.js` không nằm trong cơ chế tự giải mã), hoặc gộp (inline) nội dung `config.js` vào từng script trước khi chạy `encrypt.js`.

### 2. Khớp tuyệt đối `metadata.source` và `metadata.author`

- Khóa AES được tính từ `metadata.source` và `metadata.author` ngay tại thời điểm chạy `encrypt.js`.
- Nếu bạn sửa `source` hoặc `author` trong `plugin.json` sau khi đã sinh `*.encrypted.js` (kể cả việc thêm hay bớt dấu `/` ở cuối URL nguồn), ứng dụng sẽ sinh ra khóa khác và giải mã thất bại. Khi đổi `source` hoặc `author`, luôn chạy lại `npm run encrypt:pipeline` từ mã nguồn `.js` gốc.

### 3. Phòng tránh giá trị chuỗi `"null"` / `"undefined"` từ Settings Bridge

- Khi người dùng để trống một ô cấu hình tùy chọn trong ứng dụng, một số phiên bản Settings Bridge có thể tiêm chuỗi `"null"` hoặc `"undefined"` thay vì chuỗi rỗng `""`.
- Luôn khai báo `"default": ""` cho các trường `input` trong `plugin.json.config` và kiểm tra giá trị cấu hình cẩn thận trong script:

```javascript
function isValidSetting(value) {
    if (!value) return false;
    let text = String(value).trim();
    return text !== "" && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined";
}
```
