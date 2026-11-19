# Các mô hình giải mã nội dung trang nguồn

Tài liệu này tổng hợp các kỹ thuật giải mã và trích xuất dữ liệu khi **trang web nguồn** (website truyện, truyện tranh, phim) áp dụng các lớp bảo vệ chống cào dữ liệu như mã hóa XOR, AES phía client, hoặc làm lệch bảng mã phông chữ (Font Obfuscation).

> [!WARNING]
> Tài liệu này chỉ phục vụ việc **giải mã dữ liệu trả về từ website đích** để hiển thị trong trình đọc. Để tìm hiểu cách làm rối và mã hóa bảo vệ mã nguồn JavaScript của chính extension trước khi phát hành, xem [Hướng dẫn bảo vệ mã nguồn và giải mã gói extension](./SOURCE_OBFUSCATION_GUIDE.md).

---

## Bảng phân loại và lựa chọn phương pháp trích xuất

Khi khảo sát một trang nguồn mới bằng DevTools, hãy xác định mô hình bảo vệ của trang theo bảng dưới đây để chọn giải pháp có chi phí bảo trì thấp nhất:

| Mô hình bảo vệ của trang nguồn | Dấu hiệu nhận biết | Giải pháp ưu tiên trong vBook | Tốc độ | Độ ổn định |
| :--- | :--- | :--- | :--- | :--- |
| **1. Direct API (JSON/HTML)** | Tab Network có request XHR/Fetch trả về JSON hoặc HTML rõ nghĩa, chỉ yêu cầu Header, Cookie hoặc Token | Gọi trực tiếp `fetch(apiUrl, { headers })` | Rất nhanh | Rất cao |
| **2. XOR + Base64 Payload** | API trả về chuỗi Base64 vô nghĩa; mã nguồn trang có hàm giải mã XOR với một khóa ngắn | Nạp `load("crypto.js")` và giải mã Base64 sang Latin1 rồi XOR theo khóa | Nhanh | Trung bình |
| **3. AES-CBC / AES-GCM tĩnh** | Dữ liệu bị mã hóa AES với khóa/IV có thể trích xuất cố định hoặc tính qua MD5/SHA256 | Dùng cầu nối gốc `load("crypto.js")` (`CryptoJS.AES.decrypt` hoặc `decryptGcm`) | Nhanh | Cao |
| **4. AES / JS Bundle động** | Khóa giải mã sinh động trong bundle JS bị làm rối nặng hoặc phụ thuộc WebAssembly/Canvas | Khởi chạy `Engine.newBrowser()`, đợi trang tự giải mã rồi lấy DOM đã render | Trung bình | Rất cao |
| **5. Làm lệch phông chữ (Font Obfuscation)** | Văn bản trả về chứa các ký tự nằm trong vùng Unicode Private Use Area (`\uE000`–`\uF8FF`), trang tải kèm tệp `.woff`/`.ttf` riêng | Lập bảng mảng ký tự đối chiếu theo độ lệch (`charCode - CODE_START`) | Nhanh | Rất cao |

---

## Triển khai chi tiết từng mô hình

### 1. Mô hình XOR + Base64 với `crypto.js`

Nhiều trang truyện chữ mã hóa nội dung chương bằng phép toán XOR tuần hoàn theo một khóa chuỗi, sau đó mã hóa Base64 trước khi truyền qua JSON.

```javascript
load("config.js");
load("crypto.js");

function decryptXorBase64(base64Payload, key) {
    let wordArray = CryptoJS.enc.Base64.parse(base64Payload);
    let rawLatin1 = CryptoJS.enc.Latin1.stringify(wordArray);
    let out = [];
    let keyLen = key.length;

    for (let i = 0; i < rawLatin1.length; i++) {
        let code = rawLatin1.charCodeAt(i) ^ key.charCodeAt(i % keyLen);
        out.push(String.fromCharCode(code));
    }

    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Latin1.parse(out.join("")));
}
```

### 2. Mô hình AES-CBC và AES-GCM qua cầu nối gốc `crypto.js`

Khi nạp `load("crypto.js")`, ứng dụng cung cấp cầu nối Kotlin/Java thực thi các thuật toán băm (`MD5`, `SHA1`, `SHA256`, `SHA512`, `Hmac*`) và `AES` (`CBC`, `ECB`, `CFB`, `OFB`, `CTR`, cùng hai hàm mở rộng `encryptGcm` / `decryptGcm`) với tốc độ gốc trên thiết bị.

```javascript
load("config.js");
load("crypto.js");

function decryptAesCbc(cipherBase64, keyUtf8, ivUtf8) {
    let key = CryptoJS.enc.Utf8.parse(keyUtf8);
    let iv = CryptoJS.enc.Utf8.parse(ivUtf8);
    let decrypted = CryptoJS.AES.decrypt(cipherBase64, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8) + "";
}

function decryptAesGcmPayload(cipherBase64, keyUtf8, ivUtf8) {
    let key = CryptoJS.enc.Utf8.parse(keyUtf8);
    let iv = CryptoJS.enc.Utf8.parse(ivUtf8);
    let decrypted = CryptoJS.AES.decryptGcm(cipherBase64, key, iv);
    return decrypted.toString(CryptoJS.enc.Utf8) + "";
}
```

> [!NOTE]
> Cầu nối gốc `crypto.js` không bao gồm các thuật toán cũ như `DES`, `TripleDES`, `RC4`, `Rabbit`, `PBKDF2` hoặc `EvpKDF`. Nếu trang nguồn dùng khóa dẫn xuất `EvpKDF` (OpenSSL `Salted__`), bạn có thể tự tính khóa + IV bằng vòng lặp `CryptoJS.MD5` trên mảng byte rồi truyền trực tiếp `key` và `iv` vào `CryptoJS.AES.decrypt`.

### 3. Mô hình ủy quyền giải mã cho trình duyệt ngầm (`Engine.newBrowser()`)

Khi website nhúng khóa AES động vào các bundle JavaScript bị làm rối phức tạp, việc dịch ngược thủ công rất tốn công và dễ hỏng mỗi khi trang web build lại bundle. Giải pháp bền vững nhất là để chính trình duyệt ngầm của vBook chạy mã JavaScript của trang web và trích xuất kết quả từ DOM sau khi trang đã tự giải mã.

```javascript
load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    let browser = Engine.newBrowser();
    try {
        browser.setUserAgent(UserAgent.android());
        browser.block(["googlesyndication.com", "doubleclick.net"]);
        browser.launch(url, 15000);
        browser.waitUrl(".*cdn.*", 8000);

        let doc = browser.html();
        let items = doc.select("img.chapter-img");
        if (items.isEmpty()) {
            return Response.error("Không tìm thấy ảnh chương sau khi trình duyệt tải trang.");
        }

        let images = items.map(function (el) {
            return (el.attr("data-src") || el.attr("src")) + "";
        });
        return Response.success(images);
    } finally {
        browser.close();
    }
}
```

### 4. Mô hình ánh xạ bảng mã phông chữ tùy biến (Font Obfuscation)

Một số nền tảng tiểu thuyết lớn (như Fanqie / Cà Chua) thay thế các chữ Hán phổ biến bằng các mã ký tự trong vùng Unicode Private Use Area (ví dụ từ `0xE3E8` đến `0xE55B`) và dùng phông chữ `.woff` riêng để hiển thị.

Để khôi phục văn bản gốc cho trình đọc và bộ máy dịch Việt Phrase / TTS:

1. Tải tệp phông chữ của trang nguồn, trích xuất thứ tự glyph sang mảng đối chiếu tĩnh `CHARSET`.
2. Trừ mã Unicode của từng ký tự (`str.charCodeAt(i)`) cho mã bắt đầu `CODE_START` để lấy chỉ mục tra cứu trong mảng `CHARSET`:

```javascript
let CODE_START = 58344; // 0xE3E8
let CODE_END = 58715;   // 0xE55B
let CHARSET = ["体", "y", "十", "现", "快", "便", "话", "却", "月", "物", "水", "的", "放", "知"];

function decodeCustomFont(text) {
    if (!text) return "";
    let str = String(text);
    let out = [];

    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code >= CODE_START && code <= CODE_END) {
            let mapped = CHARSET[code - CODE_START];
            out.push(mapped ? mapped : str.charAt(i));
        } else {
            out.push(str.charAt(i));
        }
    }
    return out.join("");
}
```

---

## Chiến lược kết hợp nhiều tầng (Fallback Pattern)

Đối với các trang nguồn thường xuyên bật/tắt lớp bảo vệ theo tải máy chủ, thiết kế hàm `execute(url)` theo thứ tự ưu tiên từ nhẹ đến nặng:

1. **Tầng 1 (Nhanh nhất)**: Gọi `fetch()` trực tiếp vào endpoint API hoặc trang HTML tĩnh và giải mã bằng `crypto.js` nếu có khóa rõ ràng.
2. **Tầng 2 (Dự phòng tự động)**: Khi `response.ok` thất bại (ví dụ gặp HTTP 403/503) hoặc DOM tĩnh không chứa dữ liệu chương, chuyển sang khởi chạy `Engine.newBrowser()` trong khối `try / finally` để lấy nội dung sau khi WebView hoàn tất giải mã.
