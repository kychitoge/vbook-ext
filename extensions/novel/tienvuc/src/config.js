let BASE_URL = "https://tienvuc.blog";
try {
    if (CONFIG_URL) {
        BASE_URL = CONFIG_URL;
    }
} catch (error) {}

var BASE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function normalizeUrl(url) {
    if (!url) return "";
    url = String(url).trim();
    if (url.indexOf("http") === 0) return url;
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("/") === 0) return BASE_URL + url;
    return BASE_URL + "/" + url;
}

function cleanText(text) {
    if (!text) return "";
    return String(text).replace(/\s+/g, " ").trim();
}

var Response = {
    success: function(data, data2) {
        return JSON.stringify({ code: 0, data: data, data2: data2 });
    },
    error: function(data) {
        return JSON.stringify({ code: 1, data: data });
    }
};

function getSize(els) {
    if (!els) return 0;
    try {
        if (typeof els.size === 'function') return els.size();
        if (typeof els.size === 'number') return els.size;
        if (typeof els.length === 'number') return els.length;
    } catch (e) {}
    return 0;
}

function getElement(els, index) {
    if (!els || getSize(els) <= index) return null;
    try {
        if (typeof els.get === 'function') return els.get(index);
    } catch (e) {}
    return els[index];
}

function fetchPage(url, options) {
    if (!options) options = {};
    var headers = {
        'User-Agent': BASE_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
        'Referer': BASE_URL + '/'
    };
    if (options.headers) {
        for (var key in options.headers) {
            headers[key] = options.headers[key];
        }
    }
    options.headers = headers;
    return fetch(url, options);
}