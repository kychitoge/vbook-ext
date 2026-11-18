# Sổ Ghi Nhận Quyết Định Kiến Trúc (ADR)

# [ADR-001] Cà Chua S3 (`kychi-cachua-s3`): tự ký request ByteDance AppLog và tự cấp thiết bị ngay trong extension
- Ngày: 2026-11-18
- Trạng thái: Đã duyệt & Đã kiểm chứng trên thiết bị thật
- Bối cảnh: Extension `openlove-backup` (v20) phụ thuộc vào `fq-sign-server` bên ngoài để đăng ký thiết bị ByteDance, đàm phán khóa AES (`/reading/crypt/registerkey`) và ký 3 header `X-Gorgon`, `X-Ladon`, `X-Argus`. Mục tiêu là tạo extension mới `extensions/chinese_novel/kychi-cachua-s3` (`[Fanqie] Cà Chua S3`, `type: "novel"`) tự thực hiện toàn bộ quy trình này trong Rhino JS (ES6 safe mode) mà không cần Sign server, vẫn giữ tùy chọn bật Sign server dự phòng bằng toggle và không tự động fallback.
- Quyết định:
  1. Fork từ `extensions/fork/openlove-backup` (v20) vào `extensions/chinese_novel/kychi-cachua-s3/`.
  2. Mở rộng `src/codec.js` thêm `aesCbcEncrypt`, `md5Raw`, `md5Hex`, `utf8ToBytes`, `bytesToB64`, `bytesToHex` bằng JS thuần (tránh `CryptoJS` shim do giới hạn `< 0x80` trên dữ liệu nhị phân).
  3. Port nguyên bản `X-Gorgon` 0404, `X-Ladon` 64-bit, `X-Argus` (SM3, Simon 64/128, Protobuf) sang `src/sign.js` với số học 64-bit tách cặp `{hi, lo}` uint32 (không `BigInt`, không `TypedArray`).
  4. Tạo `src/device.js` thực hiện đăng ký thiết bị (`device_register`, kiểm tra delta `install_id - device_id == 4096` bằng phép tính chuỗi thập phân), kích hoạt (`app_alert_check`), đàm phán khóa nội dung (`/reading/crypt/registerkey`) và lưu vào `localStorage("fqdev:v1")`.
  5. Dùng Dynamic config script `src/settings.js` để hiển thị trạng thái thiết bị, ẩn/hiện `sign_api` và `fq_token` theo toggle `use_sign_server` (mặc định `"false"`), cùng các tùy chỉnh `fq_api_host`, `fq_batch_size`, `fq_keep_images`, `fq_gender`, `comment_sort`; bổ sung 3 action (`device_info.js`, `reset_device.js`, `clear_cache.js`). Không tự fallback giữa chế độ tự ký và Sign server.
  6. Chuẩn hóa ngôn ngữ: dữ liệu đọc/duyệt truyện (tab `home`, thông số `detail`, `toc`, điểm `分`, tên ẩn danh `匿名读者`) dùng 100% tiếng Trung; giao diện cài đặt, mô tả hành động và thông báo lỗi dùng tiếng Việt chuẩn theo **Microsoft Writing Style Guide** (Error Triad, blame-free, không `!`, không xin lỗi thừa, động từ trung lập thiết bị).
  7. Sửa lỗi tải batch 30 chương trên Rhino & Fanqie API: ép `String(cacheStorage.getItem(...))` khi dò cache (`java.lang.String === "1"` là `false` trên Rhino) và truyền `item_ids` dạng danh sách nối dấu phẩy (`,`) thay vì lặp tham số `item_ids` nhiều lần (vốn khiến Fanqie chỉ trả 1 chương).
- Hệ quả: Extension chạy độc lập 100% trên Rhino từ IP điện thoại (`OPPO CPH2113`), tải đủ 30 chương/lượt `batch_full/v`, và tuân thủ đầy đủ ES6 safe mode.
