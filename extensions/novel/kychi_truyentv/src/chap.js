load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    let response = fetchPage(url);
    if (!response.ok) {
        return Response.error("Không thể tải nội dung chương (HTTP " + response.status + "). Kiểm tra kết nối mạng hoặc tên miền trong cài đặt, rồi thử lại.");
    }

    let doc = response.html();
    let content = "";
    let selectors = [
        "#chapter-content",
        ".chapter-content",
        "#chapter-c",
        ".chapter-c",
        ".chapter-con",
        "#content",
        ".content-chap",
        ".reading-content",
        "#reading-content",
        ".chapter-detail",
        "#chapter-detail-content",
        ".box-content"
    ];

    for (let i = 0; i < selectors.length; i++) {
        let el = doc.select(selectors[i]).first();
        if (!el) continue;
        el.select(".quang-cao, script, style, .ads, .signature, .adsbygoogle, .quang-cao-holder").remove();
        let html = el.html() + "";
        if (html && html.trim().length > 0) {
            content = html;
            break;
        }
    }

    if (content) {
        return Response.success(cleanHtml(content));
    }

    return Response.error("Không tìm thấy nội dung chương. Chương này có thể yêu cầu đăng nhập hoặc nguồn đã đổi cấu trúc.");
}
