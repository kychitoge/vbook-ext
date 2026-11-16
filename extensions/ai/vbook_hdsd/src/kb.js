var LLMS_INDEX_URL = "https://vbookapp.gitbook.io/huong-dan-su-dung/llms.txt";
var LLMS_FULL_URL = "https://vbookapp.gitbook.io/huong-dan-su-dung/llms-full.txt";
var CACHE_KEY_INDEX = "vbook_hdsd_index_v2";
var CACHE_KEY_FULL = "vbook_hdsd_full_v2";
var CACHE_KEY_TIME = "vbook_hdsd_time_v2";
var CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function fetchCachedDoc(url, cacheKey, forceRefresh) {
    let cached = null;
    try {
        cached = cacheStorage.getItem(cacheKey);
    } catch (e1) {}

    if (!forceRefresh && cached) {
        return cached + "";
    }

    let res = fetch(url, {
        method: "GET",
        timeout: 12000
    });

    if (res && res.ok) {
        let body = res.text() + "";
        if (body && body.length > 100) {
            try {
                cacheStorage.setItem(cacheKey, body);
            } catch (e2) {}
            return body;
        }
    }

    return cached ? (cached + "") : "";
}

function loadKnowledgeBase() {
    let now = new Date().getTime();
    let lastTimeStr = "";
    try {
        lastTimeStr = cacheStorage.getItem(CACHE_KEY_TIME) || "";
    } catch (e1) {}

    let lastTime = parseInt(lastTimeStr, 10) || 0;
    let expired = (now - lastTime) > CACHE_TTL_MS;

    let indexText = fetchCachedDoc(LLMS_INDEX_URL, CACHE_KEY_INDEX, expired);
    let fullText = fetchCachedDoc(LLMS_FULL_URL, CACHE_KEY_FULL, expired);

    if (expired && indexText && fullText) {
        try {
            cacheStorage.setItem(CACHE_KEY_TIME, now + "");
        } catch (e2) {}
    }

    if (!fullText) {
        return getBuiltInPages();
    }

    let pages = parseKnowledgePages(indexText, fullText);
    let builtIn = getBuiltInPages();
    for (let i = 0; i < builtIn.length; i++) {
        pages.push(builtIn[i]);
    }
    return pages;
}

function makeStaticPage(title, url, desc, rawMarkdown) {
    let sections = splitSections(rawMarkdown);
    let headingsText = [];
    let cleanFullParts = [];
    for (let s = 0; s < sections.length; s++) {
        if (sections[s].heading) {
            headingsText.push(sections[s].heading);
            cleanFullParts.push("### " + sections[s].heading);
        }
        if (sections[s].text) {
            cleanFullParts.push(sections[s].text);
        }
    }
    return {
        title: title,
        url: url,
        desc: desc,
        headings: headingsText.join(" "),
        sections: sections,
        cleanText: cleanFullParts.join("\n\n")
    };
}

function getBuiltInPages() {
    let termsMd =
        "### Điều khoản sử dụng (Cập nhật 09/07/2026)\n" +
        "- **Bản chất ứng dụng:** vBook là công cụ đọc sách, truyện tranh và tài liệu; ứng dụng **không cung cấp, không lưu trữ và không sở hữu** bất kỳ nội dung sách hay truyện nào, không tích hợp sẵn nguồn.\n" +
        "- **Trách nhiệm nguồn:** Mọi nguồn trực tuyến do người dùng tự thêm hoặc tự viết extension; người dùng tự chịu trách nhiệm về nội dung hợp pháp.\n" +
        "### Bản quyền (DMCA) & Kiểm duyệt cộng đồng\n" +
        "- **Báo cáo DMCA:** Gửi về `support@vbookapp.com` kèm mô tả tác phẩm, đường dẫn vi phạm và thông tin liên hệ.\n" +
        "- **Chính sách cộng đồng:** Không khoan nhượng với nội dung bất hợp pháp, khiêu dâm, bạo lực, thù ghét, spam, quấy rối. Báo cáo vi phạm được rà soát và xử lý (gỡ bài / khóa tài khoản) trong vòng **24 giờ**.\n" +
        "### Tài khoản & Liên hệ\n" +
        "- Có thể xóa tài khoản bất cứ lúc nào ngay trong ứng dụng.\n" +
        "- Điều khoản điều chỉnh theo pháp luật Việt Nam và quy định của Google Play / App Store. Liên hệ: `support@vbookapp.com`.";

    let privacyMd =
        "### Dữ liệu xử lý & Tài khoản\n" +
        "- Phần lớn dữ liệu (thư viện, dấu trang, tiến độ đọc, cài đặt) nằm ngay trên thiết bị của bạn.\n" +
        "- Khi đăng nhập cộng đồng (Google/Firebase), vBook lưu định danh, tên hiển thị, ảnh đại diện. Mỗi lần mở đọc/nghe nguồn trực tuyến chỉ cộng lượt cho bảng xếp hạng; máy chủ không lưu bạn đã đọc truyện nào (tắt lưu lịch sử thì không gửi).\n" +
        "- **Đọc thành tiếng (TTS) & Dịch:** Chạy **ngoại tuyến trên thiết bị**, không tải nội dung sách lên máy chủ.\n" +
        "### Dữ liệu Google Drive & Lưu trữ đám mây\n" +
        "- Kết nối Google Drive chỉ xin quyền cho tính năng bạn dùng: sao lưu/đồng bộ (`drive.file`, `drive.appdata`) và duyệt nhập sách (`drive.readonly`). Đăng nhập cộng đồng chỉ dùng `openid`, `email`, `profile`.\n" +
        "- Token và tệp tải về chỉ lưu trên thiết bị, tuân thủ **Google API Services User Data Policy (Limited Use)**, không gửi lên máy chủ vBook, không dùng cho quảng cáo hay huấn luyện AI/ML.\n" +
        "- Dropbox, OneDrive, WebDAV, OPDS kết nối trực tiếp từ thiết bị.\n" +
        "### Xóa tài khoản & Thu hồi quyền\n" +
        "- Xóa tài khoản ngay trong app hoặc thu hồi quyền Google tại https://myaccount.google.com/connections. Liên hệ: `support@vbookapp.com`.";

    let aboutMd =
        "### vBook là gì & Có miễn phí không?\n" +
        "- vBook là ứng dụng đọc truyện, sách điện tử, truyện tranh và tài liệu trong một thư viện cá nhân (miễn phí trên App Store, Google Play và GitHub Releases).\n" +
        "### vBook dùng được trên thiết bị nào?\n" +
        "- **iOS** (iPhone, iPad qua App Store), **Android** (Google Play), **Windows** (`.msi`, `.exe` Portable), **macOS** và **Linux** (`.deb`, `.rpm` qua GitHub Releases).\n" +
        "### vBook đọc được những định dạng nào?\n" +
        "- **Ebook:** EPUB, MOBI, PRC, AZW/AZW3, FB2/FBZ, UMD, TXT\n" +
        "- **Truyện tranh:** CBZ, ZIP\n" +
        "- **Tài liệu khác:** PDF, Word (DOC/DOCX/DOCM, DOT/DOTX/DOTM), WPS, OpenDocument (ODT/OTT/FODT), RTF, HWP/HWPX/HWPML, HTML/HTM/XHTML, Markdown, CHM\n" +
        "### Đọc thành tiếng & Dịch có cần mạng không?\n" +
        "- Không. vBook đọc thành tiếng bằng giọng AI và dịch ngoại tuyến ngay trên thiết bị.\n" +
        "### Làm sao thêm nguồn truyện trực tuyến?\n" +
        "- Dùng trình duyệt web tích hợp hoặc cài tiện ích mở rộng (extension) để thêm nguồn, hoặc nhập từ máy, Google Drive, WebDAV, OPDS.";

    return [
        makeStaticPage("Điều khoản sử dụng vBook", "https://vbookapp.com/terms", "Điều khoản sử dụng, bản quyền DMCA, kiểm duyệt cộng đồng và liên hệ.", termsMd),
        makeStaticPage("Chính sách quyền riêng tư vBook", "https://vbookapp.com/privacy", "Quyền riêng tư, xử lý dữ liệu, Google Drive Limited Use, xóa tài khoản.", privacyMd),
        makeStaticPage("Hỏi đáp & Tính năng vBook (Q&A)", "https://vbookapp.com/#about", "vBook là gì, miễn phí, định dạng hỗ trợ, thiết bị iOS Android Windows macOS Linux.", aboutMd)
    ];
}

function parseIndexEntries(indexText) {
    let entries = [];
    if (!indexText) return entries;
    let lines = indexText.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        let m = /^- \[([^\]]+)\]\(([^)]+)\)(?::\s*(.*))?$/.exec(line);
        if (!m) continue;
        let url = m[2].replace(/\.md$/i, "");
        if (url.slice(-7) === "/readme") {
            url = url.slice(0, -7);
        }
        entries.push({
            title: m[1].trim(),
            url: url,
            desc: (m[3] || "").trim()
        });
    }
    return entries;
}

function cleanDocMarkdown(md) {
    let text = (md || "") + "";
    text = text.replace(/<figure>[\s\S]*?<\/figure>/gi, "");
    text = text.replace(/\{%[\s\S]*?%\}/g, "");
    text = text.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, "");
    text = text.replace(/<\/?(div|mark|span|br|p|figcaption)[^>]*>/gi, "");
    text = text.replace(/&#x20;/gi, " ");
    text = text.replace(/&amp;/gi, "&");
    text = text.replace(/\]\(\/huong-dan-su-dung\//gi, "](https://vbookapp.gitbook.io/huong-dan-su-dung/");
    text = text.replace(/\\\r?\n/g, "\n");
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    return text;
}

function splitSections(rawContent) {
    let cleaned = cleanDocMarkdown(rawContent);
    let lines = cleaned.split(/\r?\n/);
    let sections = [];
    let currentHeading = "";
    let currentLines = [];
    let inCode = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.trim().indexOf("```") === 0) {
            inCode = !inCode;
        }
        if (!inCode && /^#{2,4}\s+/.test(line)) {
            let body = currentLines.join("\n").trim();
            if (currentHeading || body) {
                sections.push({
                    heading: currentHeading,
                    text: body
                });
            }
            currentHeading = line.replace(/^#{2,4}\s+/, "").trim();
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }

    let lastBody = currentLines.join("\n").trim();
    if (currentHeading || lastBody) {
        sections.push({
            heading: currentHeading,
            text: lastBody
        });
    }

    return sections;
}

function parseKnowledgePages(indexText, fullText) {
    let indexEntries = parseIndexEntries(indexText);
    let lines = fullText.split(/\r?\n/);
    let rawPages = [];
    let currentTitle = "";
    let currentLines = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.trim().indexOf("```") === 0) {
            inCodeBlock = !inCodeBlock;
        }
        if (!inCodeBlock && /^# [^#]/.test(line)) {
            if (currentTitle) {
                rawPages.push({
                    title: currentTitle,
                    content: currentLines.join("\n").trim()
                });
            }
            currentTitle = line.substring(2).trim();
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }
    if (currentTitle) {
        rawPages.push({
            title: currentTitle,
            content: currentLines.join("\n").trim()
        });
    }

    let pages = [];
    for (let j = 0; j < rawPages.length; j++) {
        let rp = rawPages[j];
        let meta = j < indexEntries.length ? indexEntries[j] : null;
        let url = "https://vbookapp.gitbook.io/huong-dan-su-dung";
        let desc = "";

        if (meta && meta.title === rp.title) {
            url = meta.url;
            desc = meta.desc;
        } else {
            for (let k = 0; k < indexEntries.length; k++) {
                if (indexEntries[k].title === rp.title) {
                    url = indexEntries[k].url;
                    desc = indexEntries[k].desc;
                    break;
                }
            }
        }

        let sections = splitSections(rp.content);
        let headingsText = [];
        let cleanFullParts = [];
        for (let s = 0; s < sections.length; s++) {
            if (sections[s].heading) {
                headingsText.push(sections[s].heading);
                cleanFullParts.push("### " + sections[s].heading);
            }
            if (sections[s].text) {
                cleanFullParts.push(sections[s].text);
            }
        }

        pages.push({
            title: rp.title,
            url: url,
            desc: desc,
            headings: headingsText.join(" "),
            sections: sections,
            cleanText: cleanFullParts.join("\n\n")
        });
    }

    return pages;
}
