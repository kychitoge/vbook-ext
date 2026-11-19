# Hướng dẫn kỹ thuật phát triển extension trên Rhino runtime

Tài liệu này hướng dẫn cách thiết kế cấu trúc mã nguồn, tuân thủ ràng buộc của bộ máy thực thi **Rhino 1.8.1 (ES6 Safe Subset)**, và xử lý các trang web phức tạp khi xây dựng extension cho ứng dụng vBook.

> [!NOTE]
> Tài liệu này tập trung vào kỹ thuật lập trình trong `src/*.js`. Để tra cứu chi tiết từng hàm API và bảng trường dữ liệu của ứng dụng, xem [Đặc tả API extension chính thức](./extension-api.md). Để tra cứu các lệnh CLI đóng gói và kiểm thử, xem [Tham chiếu lệnh CLI và phân vùng dự án](./CLI_WORKFLOW.md).

---

## Cấu trúc gói extension và script theo loại

Mỗi extension nằm tại `extensions/<type>/<author>_<slug>/` với `plugin.json`, `icon.png` (tùy chọn, tối đa 5 MB) và thư mục `src/` chứa các tệp JavaScript (mỗi tệp tối đa 10 MB).

```text
extensions/<type>/<author>_<slug>/
├── plugin.json          # Khai báo metadata, script, config
├── icon.png             # Ảnh đại diện nguồn (khuyến nghị 200x200 px)
├── plugin.zip           # Gói phân phối sinh tự động qua lệnh build
└── src/
    ├── config.js        # Khai báo BASE_URL, ghi đè từ DOMAIN và normalizeUrl(url)
    └── *.js             # Các script nghiệp vụ theo loại extension
```

### Bảng ánh xạ script theo loại extension (`metadata.type`)

| Loại (`type`) | Script bắt buộc trong `plugin.json.script` | Script tùy chọn hỗ trợ | Luồng đọc trong ứng dụng |
| :--- | :--- | :--- | :--- |
| `novel`, `chinese_novel` | `detail`, `toc`, `chap`, `search` | `home`, `explore`, `genre`, `page` | Danh sách → Chi tiết → Mục lục (`page` → `toc`) → Chương văn bản HTML (`chap`) |
| `comic` | `detail`, `toc`, `chap`, `search` | `home`, `explore`, `genre`, `page` | Danh sách → Chi tiết → Mục lục (`page` → `toc`) → Mảng ảnh chương (`chap`) |
| `video` | `detail`, `toc`, `chap`, `track`, `search` | `home`, `explore`, `genre`, `page` | Danh sách → Chi tiết (hoặc mở thẳng với `stream`/`short`) → Tập (`toc`) → Máy chủ (`chap`) → Luồng phát (`track`) |
| `audio` | `detail`, `toc`, `chap`, `track`, `search` | `home`, `explore`, `genre`, `page` | Danh sách → Chi tiết (`audio`/`album`) → Mục lục (`toc`) → Nguồn (`chap`) → Luồng âm thanh (`track`) |
| `news` | `article` + ít nhất một nguồn danh sách (`home`, `explore`, `genre`, `search`) | Các nguồn danh sách còn lại | Danh sách bài viết → Mở thẳng trình đọc bài viết (`article`, không qua trang chi tiết) |
| `forum` | `posts` + ít nhất một nguồn danh sách (`home`, `explore`, `genre`, `search`) | Các nguồn danh sách còn lại | Danh sách chủ đề → Mở thẳng trình đọc bài đăng phân trang (`posts`, không qua trang chi tiết) |
| `tts` | `voice`, `tts` | *(không dùng script danh sách)* | Nạp danh sách giọng đọc BCP-47 (`voice`) → Tổng hợp câu văn thành âm thanh Base64 (`tts`) |
| `translate` | `language`, `translate` | `model`, `style` | Nạp ngôn ngữ/mô hình → Dịch văn bản (`translate`) |
| `ai` | `chatStream` | *(cấu hình tool trong `config`)* | Nhận chuỗi JSON lịch sử hội thoại → Phát từng cụm từ qua `ai.emitToken()` (`chatStream`) |

> [!IMPORTANT]
> Đối với `comic`, danh sách ảnh của một chương luôn trả về từ `chap.js`. Script `page.js` chỉ dùng để phân trang mục lục (TOC pagination) khi trang web chia danh sách chương thành nhiều trang.

---

## Ràng buộc cốt lõi của môi trường Rhino ES6 Safe Mode

Script trong `src/*.js` chạy trên bộ máy **Rhino JavaScript** nhúng trong ứng dụng vBook (Android, iOS, Desktop), không phải Node.js hay trình duyệt Chromium.

### 1. Chỉ viết Pure JavaScript và luôn dùng `let` hoặc `var`

- **Không dùng пакет Node.js**: Không dùng `require()`, `import`, `export` hoặc bất kỳ thư viện nào trong `package.json` bên trong `src/*.js`.
- **Không dùng `const`**: Từ khóa `const` trên Rhino thường gây lỗi cú pháp hoặc lỗi runtime khi nạp chéo qua `load()` hoặc khi thực thi lại scope. Luôn khai báo biến bằng `let` hoặc `var`.
- **Tránh cú pháp ES2020+ không ổn định trên Rhino**: Không dùng `async`/`await`, `Promise`, optional chaining (`?.`), nullish coalescing (`??`), toán tử spread (`{...obj}`, `[...arr]`), tham số mặc định (`function f(a = 1)`), `Array.prototype.flat`/`flatMap`, `String.prototype.matchAll`, hoặc regex lookbehind/named groups.

### 2. Không khai báo trùng tên với khóa cấu hình (`plugin.json.config`)

Ứng dụng tự động tiêm mọi khóa cấu hình tĩnh (chẳng hạn `DOMAIN`) vào global scope trước khi chạy script. Việc khai báo `let DOMAIN = ...` hoặc `var DOMAIN = ...` sẽ gây `SyntaxError`.

Mẫu `src/config.js` chuẩn:

```javascript
let BASE_URL = "https://example.com";
try {
    if (DOMAIN) {
        BASE_URL = DOMAIN;
    }
} catch (error) {
}

function normalizeUrl(url) {
    if (!url) return "";
    url = String(url).trim();
    return url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);
}
```

- Đảm bảo `config.DOMAIN.default` trong `plugin.json` trùng khớp với `metadata.source`.
- Gọi `load("config.js");` ở đầu mọi script và chuẩn hóa URL đầu vào bằng `normalizeUrl(url)` trước khi gọi `fetch()`.
- Lưu ý `load("ten-file.js")` không đệ quy: một tệp được nạp qua `load()` không được gọi tiếp `load()` tới tệp khác. Riêng `load("crypto.js")` nạp cầu nối CryptoJS tích hợp sẵn của ứng dụng.

### 3. Kiểm tra `response.ok` và ép kiểu chuỗi từ cầu nối Java/Jsoup

Hàm `fetch()` không tự ném ngoại lệ khi gặp mã lỗi HTTP 4xx hoặc 5xx, và các phương thức Jsoup (`.text()`, `.attr()`, `.html()`) trả về đối tượng `java.lang.String`.

```javascript
let response = fetch(url);
if (!response.ok) return Response.error("HTTP " + response.status);
let doc = response.html();

let title = doc.select("h1.title").text() + "";
let cover = doc.select(".poster img").attr("src") + "";
```

- Luôn kiểm tra `if (!response.ok)` trước khi gọi `.html()`, `.json()`, `.text()` hoặc `.base64()`.
- Cộng thêm `+ ""` hoặc bọc `String(...)` khi cần xử lý chuỗi bằng các hàm JavaScript thuần.
- Tránh các phương thức Jsoup không ổn định trên Rhino như `tagName()`, `is()`, `tag()`, `doc.body()` (dùng `doc.select("body")` thay thế) và không dùng thuộc tính `.length` trên đối tượng `Elements` (dùng `.size()` hoặc `.isEmpty()`).
- Tham số thứ hai của `Response.success(items, next)` bắt buộc là chuỗi (`""` khi hết trang, không truyền `null` hay số).

### 4. Quản lý vòng đời trình duyệt ngầm (`Engine.newBrowser()`)

Khi bắt buộc phải dùng WebView để vượt kiểm tra JavaScript hoặc lấy DOM sau khi render, luôn đóng trình duyệt trong khối `finally`:

```javascript
let browser = Engine.newBrowser();
try {
    browser.setUserAgent(UserAgent.android());
    browser.block([".png", ".jpg", ".gif", ".woff", "googlesyndication.com"]);
    let doc = browser.launch(url, 12000);
    return Response.success(doc.select("#chapter-body").html() + "");
} finally {
    browser.close();
}
```

---

## Kỹ thuật xử lý các trường hợp thực tế phức tạp

### Xử lý ảnh lười tải (lazy-load) và chặn `Referer` (`referrerpolicy`)

1. **Lazy-load trong truyện tranh (`comic`)**: Nhiều trang giấu URL ảnh thật trong `data-src`, `data-original` hoặc `data-lazy-src`. Duyệt và gán lại hoặc đọc theo thứ tự ưu tiên:
   ```javascript
   let images = doc.select(".page-chapter img").map(function (img) {
       let src = img.attr("data-original") || img.attr("data-src") || img.attr("src");
       return {
           link: src + "",
           referrerpolicy: "no-referrer"
       };
   });
   ```
2. **CDN chặn `Referer`**: Mặc định ứng dụng gửi `Referer` là URL trang chi tiết (đối với ảnh bìa) hoặc URL chương (đối với ảnh truyện tranh). Nếu CDN trả về lỗi 403 hoặc ảnh giả, thêm `referrerpolicy: "no-referrer"` (hoặc `"origin"`) vào đối tượng item/detail/image, hoặc nối `#referrerpolicy=no-referrer` vào cuối chuỗi URL ảnh.

### Khai thác tính năng mới của hợp đồng API

- **Tab và mục mở trang khám phá (`type: "explore"`)**: Trong `home.js`, `genre.js`, hoặc mảng `genres` của `detail.js`, một phần tử có thêm `type: "explore"` sẽ gọi `script` theo dạng `execute(input)` và hiển thị giao diện phân mục giống `explore.js` thay vì danh sách phẳng.
- **Section động và cuộn vô tận ở cuối trang `explore.js`**:
  - Dùng `items` tĩnh cho dữ liệu đã có sẵn trong lần tải trang chủ đầu tiên.
  - Dùng `script` + `input` động cho các mục cần gọi request riêng để ứng dụng tải song song.
  - Nếu section **cuối cùng** của `explore.js` là section động có bố cục dọc (`grid`, `list`, `news_hero`, `news_list`, `thread_list`, `board_list`) và script của nó trả về `data2` khác rỗng, ứng dụng sẽ tự động gọi tiếp `execute(input, data2)` để cuộn vô tận khi người dùng kéo xuống cuối trang.
- **Bình luận theo đoạn hoặc ảnh trong chương tiểu thuyết**: Chèn thẻ `<comment count="12" input="para-101" script="comments.js"></comment>` vào cuối đoạn văn `<p>` hoặc ngay sau thẻ `<img>` trong HTML trả về từ `chap.js` để hiển thị bong bóng bình luận ngay trong trình đọc.
- **Hiển thị số trang và nhảy trang cho diễn đàn (`forum`)**: Trong `posts.js`, trả về `Response.success({ posts: posts, page: parseInt(page, 10), total_pages: totalPages }, nextToken)` với token là số trang dạng chuỗi (`"2"`, `"3"`) để ứng dụng bật bộ chọn nhảy trang.

### Xử lý các trang web khó (Next.js, SvelteKit, GBK, CSRF, Cloudflare)

- **Bảng mã tiếng Trung `GBK`**: Truyền bảng mã trực tiếp vào hàm đọc phản hồi: `response.html("gbk")` hoặc `response.text("gbk")`.
- **Trạng thái Next.js / Nuxt / SvelteKit**: Ưu tiên bắt API JSON thực qua DevTools Network. Nếu dữ liệu nằm trong thẻ `<script id="__NEXT_DATA__">` hoặc `self.__next_f.push(...)`, dùng `doc.select("script#__NEXT_DATA__").html()` để lấy đúng nút DOM nhỏ nhất rồi mới `JSON.parse()` hoặc trích xuất bằng regex.
- **Tái sử dụng Cookie / CSRF Token**: Đọc cookie qua `response.request.headers.cookie` hoặc `localCookie.getCookie()`, lưu vào `localStorage` để dùng lại cho các lệnh `fetch()` tiếp theo trước khi phải chuyển sang `Engine.newBrowser()`.
- **Kiểm chứng Cloudflare**: Request từ `curl` hoặc Node.js trên máy tính có thể bị chặn bởi TLS fingerprint trong khi `fetch()` hoặc `Engine.newBrowser()` trên thiết bị vBook vẫn truy cập được. Luôn kiểm chứng bằng `npm run vbook:test` trên ứng dụng thật.

---

## Danh mục rà soát lỗi nhanh trước khi đóng gói

- [ ] Tất cả tệp trong `src/*.js` chỉ dùng `let` hoặc `var`, không chứa `const`, `async`/`await`, `?.`, `??`.
- [ ] Không có biến nào trùng tên với khóa trong `plugin.json.config` (như `DOMAIN`).
- [ ] `config.DOMAIN.default` khớp hoàn toàn với `metadata.source`, và `metadata.regexp` khớp với một URL chi tiết thực tế.
- [ ] Mọi lệnh gọi `fetch()` đều kiểm tra `if (!response.ok)` trước khi phân tích dữ liệu.
- [ ] Mọi khối `Engine.newBrowser()` đều đóng bằng `browser.close()` trong `finally`.
- [ ] Đã xóa toàn bộ ghi chú hướng dẫn mẫu (`SELECTOR_*`, comment bài học từ template) và vượt qua kiểm tra `npm run ext:validate -- --plugin <ext-dir>`.
