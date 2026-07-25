// config.js — TruyenTv Extension
var BASE_URL = "https://www.tvtruyen.cc";

try { if (CONFIG_URL) BASE_URL = CONFIG_URL; } catch (e) {}

var BASE_UA = 'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36';

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

function fetchPage(url, options) {
    if (!options) options = {};
    var headers = {
        'User-Agent': BASE_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
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

function normalizeUrl(u) {
    if (!u) return "";
    var url = String(u).trim();
    if (url.indexOf("//") === 0) {
        url = "https:" + url;
    } else if (url.indexOf("http") !== 0) {
        if (url.indexOf("/") === 0) url = BASE_URL + url;
        else url = BASE_URL + "/" + url;
    }
    return url.replace(/\/$/, "");
}

function cleanText(text) {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
}

function cleanHtml(htm) {
    if (!htm) return '';
    return htm
        .replace(/·/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/<p>\s*(?:&nbsp;)?\s*<\/p>/gi, '')
        .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .trim();
}

function cleanDescription(htm) {
    if (!htm) return '';
    return htm
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .trim();
}
