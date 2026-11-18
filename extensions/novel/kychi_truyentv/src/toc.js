load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    let response = fetchPage(url);
    if (!response.ok) {
        return Response.error("Không thể tải danh sách chương (HTTP " + response.status + "). Kiểm tra kết nối mạng hoặc tên miền trong cài đặt, rồi thử lại.");
    }

    let doc = response.html();
    let chapters = [];
    let seen = {};

    let selectors = [
        "#mobile-list-chapter a.chapter-link",
        "#mobile-list-chapter a",
        "#list-chapter .row a",
        "#list-chapter .list-chapter li a",
        "#list-chapter li a",
        "#list-chapter a",
        ".list-chapter a",
        ".chapter-list a",
        ".list-chap a",
        ".ul-list-chap a",
        ".chapter-item a",
        "a[href*='/chuong-']"
    ];

    let elements = null;
    for (let s = 0; s < selectors.length; s++) {
        let matched = doc.select(selectors[s]);
        if (matched.size() > 0) {
            elements = matched;
            break;
        }
    }

    if (elements) {
        for (let i = 0; i < elements.size(); i++) {
            let e = elements.get(i);
            if (!e) continue;
            let href = e.attr("href") + "";
            if (!href) continue;

            let chapterUrl = normalizeUrl(href);
            if (!chapterUrl || seen[chapterUrl]) continue;

            let lowerUrl = chapterUrl.toLowerCase();
            if (lowerUrl.indexOf("/tac-gia/") >= 0 ||
                lowerUrl.indexOf("/the-loai/") >= 0 ||
                lowerUrl.indexOf("/danh-sach/") >= 0 ||
                lowerUrl.indexOf("/dang-nhap") >= 0 ||
                lowerUrl.indexOf("/dang-ky") >= 0 ||
                lowerUrl.indexOf("page=") >= 0) {
                continue;
            }

            seen[chapterUrl] = true;

            let nameEl = e.select(".comic-info-chapter-name-content, .comic-info-chapter-name").first();
            let chapterName = nameEl ? cleanText(nameEl.text()) : "";
            if (!chapterName) chapterName = cleanText(e.text());
            if (!chapterName) chapterName = cleanText(e.attr("title"));
            if (!chapterName) chapterName = "Chương " + (chapters.length + 1);

            chapterName = chapterName.replace(/^#\d+\.\s*/, "");

            chapters.push({
                name: chapterName,
                url: chapterUrl,
                host: BASE_URL
            });
        }
    }

    if (chapters.length === 0) {
        return Response.error("Không tìm thấy chương nào trên trang này. Cấu trúc mục lục của nguồn có thể đã thay đổi.");
    }

    if (chapters.length > 1) {
        let firstNum = -1;
        let lastNum = -1;

        for (let f = 0; f < chapters.length; f++) {
            let fn = extractChapterNumber(chapters[f]);
            if (fn !== -1) {
                firstNum = fn;
                break;
            }
        }

        for (let l = chapters.length - 1; l >= 0; l--) {
            let ln = extractChapterNumber(chapters[l]);
            if (ln !== -1) {
                lastNum = ln;
                break;
            }
        }

        if (firstNum !== -1 && lastNum !== -1 && firstNum > lastNum) {
            chapters.reverse();
        }
    }

    return Response.success(chapters);
}

function extractChapterNumber(item) {
    let text = (item.name || "") + " " + (item.url || "");
    let m = text.match(/chuong[-\s]*(\d+)/i);
    if (!m) m = text.match(/chap[-\s]*(\d+)/i);
    if (!m) m = text.match(/\/chuong-(\d+)/i);
    if (!m) m = text.match(/(\d+)/);
    if (!m) return -1;
    return parseInt(m[1], 10);
}
