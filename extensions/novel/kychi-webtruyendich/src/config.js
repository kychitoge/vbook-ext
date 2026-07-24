var BASE_URL = "https://webtruyendich.com";
var BASE_UA = "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36";
var AI_PRIORITY = "Vietphrase";

try {
    if (typeof CONFIG_URL !== 'undefined' && CONFIG_URL) {
        BASE_URL = CONFIG_URL + "";
    }
    if (typeof CONFIG_UA !== 'undefined' && CONFIG_UA) {
        BASE_UA = CONFIG_UA + "";
    }
    if (typeof CONFIG_AI !== 'undefined' && CONFIG_AI) {
        AI_PRIORITY = CONFIG_AI + "";
    }
} catch (e) {}

var BASE_ORIGIN = String(BASE_URL || '').replace(/\/+$/, '');

function normalizeUrl(url) {
    if (!url) return "";
    url = String(url).trim();
    if (!url) return "";
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
        return url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_ORIGIN);
    }
    if (url.charAt(0) === "/") return BASE_ORIGIN + url;
    return BASE_ORIGIN + "/" + url;
}

function normalizeCoverUrl(cover) {
    if (!cover) return "";
    cover = normalizeUrl(cover);
    try {
        var urlObj = new URL(cover);
        urlObj.pathname = urlObj.pathname
            .split("/")
            .map(function(p) {
                try {
                    return encodeURIComponent(decodeURIComponent(p));
                } catch (err) {
                    return encodeURIComponent(p);
                }
            })
            .join("/");
        return urlObj.toString() + "";
    } catch (e) {
        return encodeURI(cover) + "";
    }
}

function cleanText(text) {
    if (!text) return "";
    return String(text).replace(/\s+/g, " ").trim();
}

if (typeof Response === 'undefined') {
    var Response = {
        success: function(data, data2) {
            return JSON.stringify({ code: 0, data: data, data2: data2 });
        },
        error: function(data) {
            return JSON.stringify({ code: 1, data: data });
        }
    };
}

function toAbs(url) {
    if (!url) return "";
    url = String(url).trim();
    if (url.indexOf("http") === 0) return url;
    if (url.indexOf("//") === 0) return "https:" + url;
    return BASE_ORIGIN + (url.indexOf("/") === 0 ? "" : "/") + url;
}

function toBook(item) {
    if (!item) return null;
    var title = String(item.title || item.name || item.novel_title || "").trim();
    if (title) title = title.replace(/^Bìa truyện\s+/i, '').trim();

    var slug = String(item.url || item.slug || item.novel_slug || "").trim();
    var link = slug.indexOf("http") === 0 ? slug : (BASE_ORIGIN + "/truyen/" + slug);
    var cover = toAbs(item.thumbnail || item.cover || item.image || "");

    var meta = [];
    if (item.author || item.novel_author) meta.push(item.author || item.novel_author);
    if (item.genre_name) meta.push(item.genre_name);
    if (item.status || item.novel_status) meta.push(item.status || item.novel_status);
    if (item.max_chapters) meta.push(item.max_chapters + " chương");

    return {
        name: title,
        link: toAbs(link),
        cover: cover,
        description: meta.join(" · "),
        host: BASE_ORIGIN
    };
}

function fetchPage(url, options) {
    if (!options) options = {};
    var headers = {
        'User-Agent': BASE_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        'Referer': BASE_ORIGIN + '/'
    };
    if (options.headers) {
        for (var key in options.headers) {
            headers[key] = options.headers[key];
        }
    }
    options.headers = headers;
    return fetch(url, options);
}
