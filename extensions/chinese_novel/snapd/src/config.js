let BASE_URL = "https://m.snapd.net";
var BASE_UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

try {
    if (typeof CONFIG_URL !== 'undefined' && CONFIG_URL) {
        BASE_URL = CONFIG_URL;
    }
    if (typeof CONFIG_UA !== 'undefined' && CONFIG_UA) {
        BASE_UA = CONFIG_UA;
    }
} catch (e) {}

var BASE_ORIGIN = String(BASE_URL || '').replace(/\/+$/, '');
var BASE_DETAIL_URL = (typeof DETAIL_URL !== 'undefined' && DETAIL_URL) ? DETAIL_URL.trim() : "https://7e72b5fe.bqg691.cc";
var API_URL = "https://apibi.cc";

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

function encrypt(text) {
    var code = CryptoJS.MD5("book@token.html").toString();
    var iv = CryptoJS.enc.Utf8.parse(code.substring(0, 16));
    var key = CryptoJS.enc.Utf8.parse(code.substring(16));
    return CryptoJS.AES.encrypt(text, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    }).toString();
}

function get_api_url(action, params) {
    var token = encrypt(JSON.stringify(params));
    return API_URL + "/api/" + action + "?token=" + encodeURIComponent(token);
}

function cleanText(text) {
    if (!text) return "";
    return String(text).replace(/\s+/g, " ").trim();
}

function normalizeUrl(url) {
    if (!url) return "";
    url = String(url).trim();
    if (url.indexOf("http") === 0) return url;
    if (url.indexOf("//") === 0) return "https:" + url;
    
    if (url.charAt(0) === "/") return (BASE_ORIGIN + url).replace(/([^:]\/)\/+/g, '$1');
    return (BASE_ORIGIN + "/" + url).replace(/([^:]\/)\/+/g, '$1');
}

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
        'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8',
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
