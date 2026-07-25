let BASE_URL = "https://truyendichai.top";

try {
    if (DOMAIN) {
        BASE_URL = DOMAIN;
    }
} catch (e) {}

var BASE_ORIGIN = String(BASE_URL || "").replace(/\/+$/, "");

if (typeof Response === "undefined") {
    var Response = {
        success: function(data, data2) {
            return JSON.stringify({ code: 0, data: data, data2: data2 });
        },
        error: function(data) {
            return JSON.stringify({ code: 1, data: data });
        }
    };
}

function fetchPage(url, options) {
    if (!options) options = {};

    var headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": BASE_ORIGIN + "/"
    };

    if (options.headers) {
        for (var key in options.headers) {
            headers[key] = options.headers[key];
        }
    }

    options.headers = headers;
    return fetch(url, options);
}

function normalizeUrl(url) {
    if (!url) return "";
    url = String(url).trim();
    if (!url) return "";

    if (url.indexOf("//") === 0) url = "https:" + url;

    if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
        if (/^https?:\/\/(?:i\.|cdn\.|img\.)/i.test(url) || /\.(?:jpg|jpeg|png|gif|webp)(?:\?.*)?$/i.test(url)) {
            return url;
        }
        var path = url.replace(/^(?:https?:\/\/[^\/]+)/i, "");
        return BASE_ORIGIN + (path.charAt(0) === "/" ? path : "/" + path);
    }

    if (url.charAt(0) === "/") return BASE_ORIGIN + url;
    return BASE_ORIGIN + "/" + url;
}

function buildPageUrl(url, page) {
    url = normalizeUrl(url);
    page = String(page || "1");
    if (page === "1") return url;

    if (/[?&]page=\d+/i.test(url)) {
        return url.replace(/([?&]page=)\d+/i, "$1" + page);
    }

    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "page=" + page;
}

function cleanText(text) {
    if (!text) return "";
    return String(text).replace(/\s+/g, " ").trim();
}

function getSize(els) {
    if (!els) return 0;
    try {
        if (typeof els.size === "function") return els.size();
        if (typeof els.size === "number") return els.size;
        if (typeof els.length === "number") return els.length;
    } catch (e) {}
    return 0;
}

function extractPageToken(nextUrl, fallbackText) {
    var href = String(nextUrl || "");
    var m = href.match(/[?&]page=(\d+)/i);
    if (m) return m[1];

    var txt = cleanText(fallbackText || "");
    if (/^\d+$/.test(txt)) return txt;
    return txt;
}

function detectNextPage(doc) {
    var activeLi = doc.select("ul.pagination li.active").first();
    if (activeLi) {
        var nextLi = doc.select("ul.pagination li.active + li:not(.disabled)").first();
        if (nextLi) {
            var nextA = nextLi.select("a").first();
            if (nextA) {
                return extractPageToken(nextA.attr("href"), nextA.text());
            }
        }
    }
    var nextEl = doc.select(".pagination li.active + li a, .pagination a[aria-label*='Trang sau'], .pagination a:contains('>')").first();
    if (!nextEl) return "";
    return extractPageToken(nextEl.attr("href"), nextEl.text());
}

function collectStoryCards(items, data, seen) {
    if (!items) return;
    items.forEach(function(e) {
        var cls = e.attr("class") || "";
        if (cls.indexOf("work-detail-card") >= 0 || getSize(e.select(".work-chap-link")) > 0) {
            return;
        }

        var titleEl = e.select("a.work-title, h3 a, a[title]").first();
        var title = titleEl ? (titleEl.attr("title") || titleEl.text()) : "";
        title = cleanText(title);

        if (!title || title.indexOf("Đọc từ đầu") >= 0 || title.indexOf("Mới nhất") >= 0) {
            return;
        }

        var link = titleEl ? titleEl.attr("href") : "";
        if (!link) {
            var firstA = e.select("a[href]").first();
            if (firstA) link = firstA.attr("href");
        }
        var href = normalizeUrl(link);
        if (!href || seen[href]) return;
        seen[href] = true;

        var imgEl = e.select("img.work-thumb, img").first();
        var cover = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src")) : "";
        if (cover) {
            cover = normalizeUrl(cover);
        }

        var authorEl = e.select("a.work-tag--author, a[href*='/tac-gia/']").first();
        var author = authorEl ? cleanText(authorEl.text()) : "";

        var descEl = e.select(".work-summary, p.work-summary, p").first();
        var description = descEl ? cleanText(descEl.text()) : "";

        data.push({
            name: title,
            link: href,
            cover: cover,
            author: author,
            description: description,
            host: BASE_URL
        });
    });
}
