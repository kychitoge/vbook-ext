let BASE_URL = "https://novel.cooks.tw";
var BASE_UA = "Mozilla/5.0 (Android 11; Mobile; rv:147.0) Gecko/147.0 Firefox/147.0";

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
    opt.headers["Accept-Language"] = "zh-CN,zh-TW;q=0.9,zh;q=0.8,en;q=0.6";
    opt.headers["Referer"] = "https://novel.cooks.tw/";
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
    return 'https://pic.cooks.tw/' + Math.floor(parseInt(id, 10) / 1000) + '/' + id + '/' + id + 's.jpg';
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

function extractArticleId(url) {
    var m = String(url).match(/(?:detail|list|content)\/(\d+)/);
    if (!m) {
        m = String(url).match(/articleid=(\d+)/);
    }
    if (!m) {
        m = String(url).match(/\/(\d+)/);
    }
    return m ? m[1] : "";
}
