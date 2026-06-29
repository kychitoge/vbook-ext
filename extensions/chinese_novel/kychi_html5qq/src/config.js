var BASE_URL = "https://novel.html5.qq.com";
var BOOKSHELF_BASE_URL = "https://bookshelf.html5.qq.com";
var BASE_UA = "Mozilla/5.0 (Linux; Android 13; zh-CN) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36 MQQBrowser/13.4";
var Q_GUID = "4aa27c7cf2d9aca3359656ea186488cb";

var Response = {
    success: function(data, next) {
        return JSON.stringify({ code: 0, data: data, data2: next });
    },
    error: function(data) {
        return JSON.stringify({ code: 1, data: String(data || '') });
    }
};

function fetchWithUA(url, options) {
    var opt = options || {};
    opt.headers = opt.headers || {};
    opt.headers["User-Agent"] = BASE_UA;
    opt.headers["Referer"] = "https://bookshelf.html5.qq.com/qbread";
    opt.headers["Q-GUID"] = Q_GUID;
    return fetch(url, opt);
}

function SafeJson(response) {
    if (!response) return null;
    try {
        if (typeof response.json === 'function') return response.json();
        if (typeof response.string === 'function') return JSON.parse(response.string());
        return JSON.parse(response);
    } catch (e) { return null; }
}

function Cover(id) {
    id = String(id || '').replace(/\D/g, '');
    if (!id) return '';
    var tail = parseInt(id.slice(-3), 10) || 0;
    var dir = tail < 10 ? id.slice(-1) : (tail < 100 ? id.slice(-2) : id.slice(-3));
    if (!dir) dir = '0';
    return "https://wfqqreader-1252317822.image.myqcloud.com/cover/" + dir + "/" + id + "/b_" + id + ".jpg";
}

function Clean(c) {
    return String(c || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\r/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function extractBookId(url) {
    var m = String(url).match(/book[iI]d=(\d+)/);
    if (m) return m[1];
    m = String(url).match(/\/(\d+)$/);
    if (m) return m[1];
    m = String(url).match(/\/(\d+)\/?\?/);
    if (m) return m[1];
    return "";
}
