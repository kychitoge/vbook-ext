# Hướng dẫn sử dụng và đóng gói vBook VS Code Tester

Tài liệu này hướng dẫn cách đóng gói tệp cài đặt `.vsix`, khởi chạy từ mã nguồn và sử dụng tiện ích **vBook VS Code Tester** (`vbook-vscode-tester`) để kiểm thử, đóng gói và cài đặt extension trực tiếp trên thanh bên (Sidebar) của Visual Studio Code.

---

## Tính năng chính

- **Thanh công cụ tích hợp trong Activity Bar**: Cung cấp bảng điều khiển kiểm thử trực quan ngay trong VS Code.
- **Tự động nhận diện extension trong workspace**: Quét và liệt kê mọi thư mục hợp lệ có chứa `plugin.json` cùng thư mục `src/`.
- **Chọn script và truyền tham số linh hoạt**: Tự động đọc đối tượng `script` trong `plugin.json` (`home`, `search`, `detail`, `toc`, `chap`, `track`, `article`, `posts`) và cho phép nhập danh sách tham số `vararg` theo từng dòng.
- **Lưu lịch sử kiểm thử**: Ghi nhớ địa chỉ máy chủ thiết bị, bộ tham số và các lần chạy gần nhất.
- **Giao tiếp trực tiếp với REST API của ứng dụng**: Gọi thẳng các endpoint `/extension/test`, `/extension/build` và `/extension/install` tương đương với script chuẩn `vbook.js`.

---

## Đóng gói và cài đặt tiện ích (`.vsix`)

### 1. Đóng gói tệp `.vsix` từ mã nguồn

Khi có thay đổi trong thư mục `vbook-vscode-tester/extension/`, chạy lệnh sau tại thư mục gốc của dự án để sinh tệp `.vsix` mới theo phiên bản khai báo trong `vbook-vscode-tester/extension/package.json`:

```bash
npm run build:vsix
# hoặc
node tools/build-vsix.js
```

Lệnh này tạo tệp `vbook-vscode-tester-<version>.vsix` ngay tại thư mục gốc của kho lưu trữ.

### 2. Cài đặt vào VS Code

1. Mở Visual Studio Code và chọn biểu tượng **Extensions** trên thanh Activity Bar (hoặc nhấn `Ctrl+Shift+X`).
2. Chọn biểu tượng menu `...` ở góc trên bên phải của bảng Extensions, sau đó chọn **Install from VSIX...**.
3. Chọn tệp `vbook-vscode-tester-<version>.vsix` tại thư mục gốc để hoàn tất cài đặt.

### 3. Chạy trực tiếp ở chế độ phát triển (Extension Development Host)

1. Mở thư mục `vbook-vscode-tester` (hoặc thư mục gốc của dự án) trong VS Code.
2. Nhấn phím `F5` để khởi chạy cửa sổ **Extension Development Host**.
3. Trong cửa sổ mới, mở workspace `vbook-tool` và chọn biểu tượng **vBook Test** trên thanh Activity Bar bên trái (hoặc mở Command Palette bằng `Ctrl+Shift+P` và chạy lệnh `vBook: Focus Tester`).

---

## Quy trình kiểm thử trên giao diện VS Code

1. **Bật máy chủ trên thiết bị**: Mở ứng dụng vBook trên điện thoại hoặc máy tính, bật chế độ nhà phát triển (Debug/Dev mode) và ghi lại địa chỉ `http://<ip>:<port>`.
2. **Nhập địa chỉ máy chủ**: Trong khung **vBook Tester**, nhập địa chỉ máy chủ thiết bị vào ô cấu hình Server URL.
3. **Chọn extension và script**:
   - Chọn thư mục extension cần kiểm tra từ danh sách thả xuống.
   - Chọn script cần chạy (ví dụ `detail.js` hoặc `chap.js`).
4. **Nhập tham số (`vararg`)**: Nhập mỗi tham số trên một dòng (ví dụ dòng 1 là từ khóa tìm kiếm, dòng 2 là số trang `"1"` đối với `search.js`).
5. **Thực thi và xem kết quả**:
   - Chọn **Run Test** để gửi payload tới `/extension/test` và xem toàn bộ log cùng dữ liệu JSON trả về trên bảng Terminal của VS Code.
   - Chọn **Build** để đóng gói `plugin.zip` qua `/extension/build`.
   - Chọn **Install** để cài đặt trực tiếp extension vào ứng dụng vBook qua `/extension/install`.

---

## Bảng tương đương với lệnh CLI

Mọi thao tác trên giao diện VS Code Tester đều gọi cùng một giao thức REST như CLI chuẩn. Khi làm việc trên terminal hoặc thông qua AI Agent, sử dụng các lệnh tương đương sau:

| Thao tác trên VS Code Tester | Lệnh CLI tương đương |
| :--- | :--- |
| Kiểm tra kết nối Server URL | `npm run vbook:connect` |
| Chọn **Run Test** cho một script | `npm run vbook:test -- <ext-dir> <script.js> [args...]` |
| Chọn **Build** ra `plugin.zip` | `npm run vbook:build -- <ext-dir>` |
| Chọn **Install** vào thiết bị | `npm run vbook:install -- <ext-dir>` |
