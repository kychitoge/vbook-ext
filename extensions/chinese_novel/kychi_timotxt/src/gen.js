load('config.js');

function execute(input, page) {
    input = input || "/bookstack/";
    page = page || "1";

    var targetUrl = input;
    if (targetUrl.indexOf("?") !== -1) {
        targetUrl += "&page=" + page;
    } else {
        if (targetUrl.charAt(targetUrl.length - 1) !== "/") {
            targetUrl += "/";
        }
        targetUrl += "?page=" + page;
    }

    targetUrl = normalizeUrl(targetUrl);

    var response = fetch(targetUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": BASE_URL
        }
    });

    if (!response.ok) {
        return Response.error("Lỗi truy cập danh mục: " + response.status);
    }

    var doc = response.html();
    var items = [];

    var rows = doc.select(".row");
    for (var i = 0; i < rows.size(); i++) {
        var row = rows.get(i);
        var linkEl = row.select("a[href*='/']").first();
        var href = linkEl.attr("href");
        if (href && href.match(/\/\d+\/$/)) {
            var name = row.select("h3, h2, .title").text().trim();
            if (!name) {
                name = linkEl.text().trim();
            }
            var cover = row.select("img").attr("src");
            var author = row.select(".author, span.author").text().trim();
            var chapCount = row.select(".chap, .chapter, .latest, .count").text().trim();
            if (!chapCount) {
                var spans = row.select("span, p");
                for (var s = 0; s < spans.size(); s++) {
                    var st = spans.get(s).text().trim();
                    if (st && st !== author && (st.indexOf("章") !== -1 || st.indexOf("話") !== -1 || st.indexOf("集") !== -1 || st.indexOf("連載") !== -1 || st.indexOf("完結") !== -1)) {
                        chapCount = st;
                        break;
                    }
                }
            }

            items.push({
                name: name,
                cover: normalizeUrl(cover),
                link: normalizeUrl(href),
                description: author,
                tag: chapCount || "không search trên vbook"
            });
        }
    }

    if (items.length === 0) {
        var cards = doc.select("a[href*='/']");
        for (var j = 0; j < cards.size(); j++) {
            var a = cards.get(j);
            var h = a.attr("href");
            if (h && h.match(/\/\d+\/$/)) {
                var imgEl = a.select("img");
                if (imgEl.size() > 0) {
                    var title = a.attr("title") || imgEl.attr("alt") || a.text().trim();
                    var img = imgEl.attr("src");
                    if (title && h) {
                        items.push({
                            name: title,
                            cover: normalizeUrl(img),
                            link: normalizeUrl(h),
                            description: "",
                            tag: ""
                        });
                    }
                }
            }
        }
    }

    var nextPage = "";
    if (items.length > 0) {
        var currentPageNum = parseInt(page, 10) || 1;
        var hasNext = doc.select("a:contains('»')").size() > 0 || doc.select("a:contains('>')").size() > 0 || doc.select(".pagination .next").size() > 0 || doc.select("a[href*='page=" + (currentPageNum + 1) + "']").size() > 0;
        if (hasNext || items.length >= 18) {
            nextPage = String(currentPageNum + 1);
        }
    }

    return Response.success(items, nextPage);
}
