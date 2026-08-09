var BASE_URL = 'https://sstruyen.buzz';
var BASE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

try {
    if (typeof CONFIG_URL !== 'undefined' && CONFIG_URL && String(CONFIG_URL).trim().length > 0) {
        BASE_URL = String(CONFIG_URL).trim();
    }
    if (typeof CONFIG_UA !== 'undefined' && CONFIG_UA && String(CONFIG_UA).trim().length > 0) {
        BASE_UA = String(CONFIG_UA).trim();
    }
} catch (error) {
}

if (BASE_URL.indexOf('http://') !== 0 && BASE_URL.indexOf('https://') !== 0) {
    BASE_URL = 'https://' + BASE_URL;
}
BASE_URL = BASE_URL.replace(/\/+$/, '');
var BASE_ORIGIN = BASE_URL;

if (typeof Response === 'undefined') {
    var Response = {
        success: function(data, next) {
            var n = next !== undefined && next !== null ? String(next) : null;
            return JSON.stringify({ code: 0, data: data, next: n, data2: n });
        },
        error: function(data) {
            return JSON.stringify({ code: 1, data: data });
        }
    };
}

function getApiDomain() {
    var host = BASE_URL.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').trim();
    return 'https://api.' + host;
}

function cleanText(text) {
    if (!text) return '';
    return String(text).replace(/\s+/g, ' ').trim();
}

function normalizeUrl(url) {
    if (!url) return '';
    url = String(url).trim();
    if (!url) return '';

    if (url.indexOf('//') === 0) url = 'https:' + url;
    if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) {
        return url.replace(/([^:]\/)\/+/g, '$1');
    }

    if (url.charAt(0) === '/') return (BASE_ORIGIN + url).replace(/([^:]\/)\/+/g, '$1');
    return (BASE_ORIGIN + '/' + url).replace(/([^:]\/)\/+/g, '$1');
}

function buildPageUrl(url, page) {
    url = normalizeUrl(url);
    page = String(page || '1');
    if (page === '1') return url;

    if (/[?&]page=\d+/i.test(url)) {
        return url.replace(/([?&]page=)\d+/i, '$1' + page);
    }

    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'page=' + page;
}

function fetchPage(url, options) {
    if (!options) options = {};

    var headers = {
        'User-Agent': BASE_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    if (options.headers) {
        for (var key in options.headers) {
            headers[key] = options.headers[key];
        }
    }

    options.headers = headers;
    return fetch(url, options);
}

function fetchWithFallback(url, options) {
    var response = fetchPage(url, options);
    if (!response.ok) {
        var status = response.status;
        if (status === 504 || status === 502 || status === 503 || status === 522 || status === 524 || status === 0 || status === 404) {
            var retryOptions = options || {};
            retryOptions.headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
            };
            var retryResp = fetchPage(url, retryOptions);
            if (retryResp.ok) return retryResp;

            var fallbackUrl = url.replace(/^https?:\/\/[^\/]+/, function(domain) {
                if (domain.indexOf('api.') >= 0) return 'https://api.sstruyen.buzz';
                return 'https://sstruyen.buzz';
            });
            if (fallbackUrl !== url) {
                var fallbackResp = fetchPage(fallbackUrl, retryOptions);
                if (fallbackResp.ok) return fallbackResp;
            }
        }
    }
    return response;
}

if (typeof Response === 'undefined') {
    var Response = {
        success: function(data, next) {
            var n = next !== undefined && next !== null ? String(next) : null;
            return JSON.stringify({ code: 0, data: data, next: n, data2: n });
        },
        error: function(data) {
            return JSON.stringify({ code: 1, data: data });
        }
    };
}

function extractStoryId(html) {
    if (!html) return null;
    var normalized = html.replace(/\\/g, '');
    var patterns = [
        /"data"\s*:\s*\{"id"\s*:\s*(\d+)/,
        /data\s*:\s*\{id\s*:\s*(\d+)/,
        /"novelId"\s*:\s*(\d+)/,
        /novelId\s*:\s*(\d+)/,
        /"storyId"\s*:\s*(\d+)/,
        /storyId\s*:\s*(\d+)/
    ];
    for (var i = 0; i < patterns.length; i++) {
        var match = normalized.match(patterns[i]);
        if (match) return match[1];
    }
    return null;
}