var BASE_URL = "https://www.timotxt.com";

try {
    if (typeof DOMAIN !== 'undefined' && DOMAIN) {
        BASE_URL = DOMAIN;
    }
} catch (e) {}

var Response = {
    success: function(data, next) {
        return JSON.stringify({ code: 0, data: data, data2: next });
    },
    error: function(data) {
        return JSON.stringify({ code: 1, data: String(data || '') });
    }
};

function normalizeUrl(url) {
    if (!url) return "";
    var str = String(url).trim();
    if (str.indexOf("http://") === 0 || str.indexOf("https://") === 0) {
        return str;
    }
    if (str.indexOf("//") === 0) {
        return "https:" + str;
    }
    if (str.indexOf("/") === 0) {
        return BASE_URL + str;
    }
    return BASE_URL + "/" + str;
}
