let BASE_URL = "https://truyenmo.one";
try {
    if (DOMAIN) {
        let configured = String(DOMAIN).trim().replace(/\/+$/, "");
        if (configured) {
            if (configured.indexOf("http://") !== 0 && configured.indexOf("https://") !== 0) {
                configured = "https://" + configured;
            }
            BASE_URL = configured;
        }
    }
} catch (error) {
}

function getUserAgent() {
    if (typeof UserAgent !== "undefined" && UserAgent && typeof UserAgent.chrome === "function") {
        return UserAgent.chrome();
    }
    return "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";
}

function fetchPage(url, options) {
    if (!options) options = {};

    let headers = {
        "User-Agent": getUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    };

    if (options.headers) {
        for (let key in options.headers) {
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
    if (url.indexOf("/") === 0) return (BASE_URL + url).replace(/([^:]\/)\/+/g, "$1");

    if (!/^https?:\/\//i.test(url)) {
        if (/^(?:www\.)?truyenmo\.[a-z0-9-]+(?:[\/?#]|$)/i.test(url)) {
            url = "https://" + url;
        } else {
            return (BASE_URL + "/" + url).replace(/([^:]\/)\/+/g, "$1");
        }
    }

    return url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);
}

function resolveMediaUrl(url) {
    if (!url) return "";
    url = String(url).trim();
    if (!url) return "";

    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("/") === 0) return (BASE_URL + url).replace(/([^:]\/)\/+/g, "$1");
    if (/^https?:\/\/(?:www\.)?truyenmo\.(?:one|xyz)(?:[\/?#:]|$)/i.test(url)) {
        return url.replace(/^https?:\/\/(?:www\.)?truyenmo\.(?:one|xyz)/i, BASE_URL);
    }
    if (/^https?:\/\//i.test(url)) return url;

    return (BASE_URL + "/" + url).replace(/([^:]\/)\/+/g, "$1");
}

function buildPageUrl(url, page) {
    url = normalizeUrl(url);
    page = String(page || "1").trim() || "1";
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

function extractPageToken(nextUrl, fallbackText) {
    let href = String(nextUrl || "");
    if (!href || href.indexOf("javascript:") === 0) return "";

    let m = href.match(/[?&]page=(\d+)/i);
    if (m) return m[1];
    m = href.match(/\/trang-(\d+)\.html/i);
    if (m) return m[1];

    let txt = cleanText(fallbackText || "");
    if (/^\d+$/.test(txt)) return txt;
    return "";
}

function detectNextPage(doc, currentPage) {
    let curNum = parseInt(String(currentPage || "1"), 10) || 1;
    let nextEl = doc.select(".pagination li.active + li a, .pagination .active + li a, .pagination a[rel='next']").first();
    if (!nextEl) return "";

    let href = (nextEl.attr("href") + "").trim();
    if (!href || href.indexOf("javascript:") === 0) return "";

    let token = extractPageToken(href, nextEl.text() + "");
    if (!token) return "";

    let nextNum = parseInt(token, 10);
    if (!isNaN(nextNum) && nextNum <= curNum) return "";
    return String(token);
}

function collectStoryCards(items, data, seen) {
    items.forEach(function (e) {
        let link = e.select("a[href*='.html']").first();
        if (!link) link = e.select("h3 a[href], h2 a[href], a[href]").first();
        if (!link) return;

        let href = normalizeUrl(link.attr("href") + "");
        if (!href || seen[href]) return;
        seen[href] = true;

        let title = cleanText(link.text() + "");
        if (!title) {
            let titleEl = e.select(".single-story-details h3, .story-item-title, .card-title, h3, h4, h5, h6, h2").first();
            title = titleEl ? cleanText(titleEl.text() + "") : "";
        }
        if (!title) return;

        let cover = "";
        let img = e.select("img").first();
        if (img) {
            let dataSrc = (img.attr("data-src") + "").trim();
            let rawSrc = (img.attr("src") + "").trim();
            if (dataSrc) {
                cover = resolveMediaUrl(dataSrc);
            } else if (rawSrc && rawSrc.indexOf("ajax-loading.gif") === -1) {
                cover = resolveMediaUrl(rawSrc);
            }
        }

        let description = "";
        let descEl = e.select(".chapter, .last_chapter, .chapter-title").first();
        if (descEl) description = cleanText(descEl.text() + "");

        let tag = "";
        let tagEl = e.select(".hot-item span, .is-full").first();
        if (tagEl) tag = cleanText(tagEl.text() + "");

        let item = {
            name: title,
            link: href,
            cover: cover,
            description: description,
            host: BASE_URL
        };
        if (tag) item.tag = tag;

        data.push(item);
    });
}

// TruyenMo injects masked Vietnamese words via inline CSS :before { content: "..."; } on empty <span>s.
// Those strings exist only inside <style> text, never in the DOM, so regex extraction is required.
function extractBeforeContentMap(rawHtml) {
    let map = {};
    let html = String(rawHtml || "");
    if (!html) return map;

    let regex = /\.([a-zA-Z0-9\-_]+)::?(?:before)\s*\{\s*content:\s*"([^"]*)"\s*;?\s*\}/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        let cls = match[1];
        let txt = match[2] || "";
        txt = txt.replace(/\\"/g, "\"").replace(/\\'/g, "'").replace(/\\n/g, " ").replace(/\\r/g, "");
        map[cls] = txt;
    }

    return map;
}

function decodeObfuscatedSpan(content, map) {
    let html = String(content || "");
    if (!html || !map) return html;

    return html.replace(/<span[^>]*class="([^"]+)"[^>]*><\/span>/gi, function (_, clsNames) {
        let classes = String(clsNames || "").split(/\s+/);
        for (let i = 0; i < classes.length; i++) {
            let key = classes[i];
            if (map[key] !== undefined) return map[key];
        }
        return "";
    });
}
