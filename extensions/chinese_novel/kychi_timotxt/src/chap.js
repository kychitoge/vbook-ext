load('config.js');

function execute(url) {
    if (!url) return Response.error("URL chương không hợp lệ");

    url = normalizeUrl(url);

    var response = fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": BASE_URL
        }
    });

    if (!response.ok) {
        return Response.error("Lỗi tải nội dung chương: " + response.status);
    }

    var doc = response.html();
    var title = doc.select("h1, .chapter-title, .title").text().trim();

    doc.select("script, style, iframe, .ads, .tamedia-ad, div[id*='ad'], div[class*='ad'], div:contains('溫馨提示'), p:contains('溫馨提示')").remove();

    var contentEl = doc.select(".content");
    if (contentEl.size() === 0) {
        contentEl = doc.select(".chapter-content");
    }
    if (contentEl.size() === 0) {
        contentEl = doc.select("#content");
    }

    var contentHtml = contentEl.html() || "";

    return Response.success(contentHtml, title);
}
