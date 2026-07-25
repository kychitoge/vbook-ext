load('config.js');

function execute(url) {
    if (!url) return Response.error("URL không hợp lệ");

    var baseUrlNoSlash = url.replace(/\/+$/, '');
    var dirUrl = baseUrlNoSlash + "/dir";

    var response = fetch(dirUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": BASE_URL
        }
    });

    if (!response.ok) {
        response = fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": BASE_URL
            }
        });
    }

    if (!response.ok) {
        return Response.error("Lỗi tải mục lục: " + response.status);
    }

    var doc = response.html();
    var chapters = [];

    var els = doc.select(".all a[href*='.html']");
    if (els.size() === 0) {
        els = doc.select("a[href*='.html']");
    }

    for (var i = 0; i < els.size(); i++) {
        var el = els.get(i);
        var href = el.attr("href");
        var name = el.text().trim();
        if (href && href.match(/\/\d+\/\d+\.html/) && name) {
            chapters.push({
                name: name,
                url: normalizeUrl(href),
                host: BASE_URL
            });
        }
    }

    return Response.success(chapters);
}
