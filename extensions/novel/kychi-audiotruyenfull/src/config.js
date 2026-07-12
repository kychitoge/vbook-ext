var BASE_URL = "https://vip.audiotruyenfull.org";
try {
    if (typeof CONFIG_URL !== 'undefined' && CONFIG_URL) {
        BASE_URL = CONFIG_URL;
    }
} catch (e) {}
var BASE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function normalizeUrl(url) {
    if (!url) return "";
    url = String(url).trim();
    if (url.indexOf("http") === 0 || url.indexOf("//") === 0) {
        if (url.indexOf("//") === 0) url = "https:" + url;
        
        var cleanUrl = url.split(/[?#]/)[0];
        var detailRegex = /^(?:https?:\/\/)?(?:web\.|vip\.)?audiotruyenfull\.org\/(?:story\/|truyen\/)?([^:\/\n?]+)\/?$/i;
        
        if (detailRegex.test(cleanUrl)) {
            var match = cleanUrl.match(detailRegex);
            var slug = match[1];
            if (slug !== 'the-loai' && slug !== 'page' && slug !== 'trang-thai') {
                return BASE_URL + "/truyen/" + slug + "/";
            }
        }
        url = url.replace(/^(?:https?:\/\/)?(?:web\.|vip\.)?audiotruyenfull\.org/i, BASE_URL);
    } else {
        url = BASE_URL + (url.indexOf("/") === 0 ? url : "/" + url);
    }
    return url;
}

function cleanText(text) {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
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

function loadDocument(url) {
    var response = fetchPage(url);
    if (response.ok) return response.html();
    
    if (typeof Engine !== 'undefined' && Engine && typeof Engine.newBrowser === 'function') {
        var browser = null;
        try {
            browser = Engine.newBrowser();
            browser.setUserAgent(BASE_UA);
            var page = browser.launch(url, 15000);
            if (page) {
                if (browser.close) browser.close();
                return page;
            }
            if (browser.close) browser.close();
        } catch (e) {
            if (browser && browser.close) browser.close();
        }
    }
    return null;
}
