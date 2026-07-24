load("config.js");

function buildApiUrl(inputUrl, page) {
    if (!inputUrl) return BASE_URL + "/api/search-novels?page=" + (page || 1);

    var strUrl = inputUrl + "";
    if (strUrl.indexOf("http") < 0 && strUrl.indexOf("/") < 0 && strUrl.indexOf("webtruyendich.com") < 0) {
        return BASE_URL + "/api/search-novels?keyword=" + encodeURIComponent(strUrl) + "&page=" + (page || 1);
    }

    var path = strUrl.split("?")[0];
    var queryStr = strUrl.split("?")[1] || "";

    var params = {};
    if (queryStr) {
        var pairs = queryStr.split("&");
        for (var i = 0; i < pairs.length; i++) {
            var parts = pairs[i].split("=");
            if (parts[0]) params[parts[0]] = decodeURIComponent(parts[1] || "");
        }
    }

    if (path.indexOf("/the-loai/") >= 0) {
        var genreSlug = path.split("/the-loai/")[1];
        if (genreSlug) params.genre = genreSlug;
    }

    if (path.indexOf("/xep-hang/") >= 0) {
        var rankSlug = path.split("/xep-hang/")[1];
        if (rankSlug) params.sort = rankSlug;
    }

    params.page = String(page || 1);

    var queryArr = [];
    for (var k in params) {
        if (params[k] !== undefined && params[k] !== null && params[k] !== "") {
            queryArr.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
        }
    }

    return BASE_URL + "/api/search-novels?" + queryArr.join("&");
}

function execute(url, page) {
    var curPage = parseInt(page || "1", 10);
    var apiUrl = buildApiUrl(url, curPage);
    var res = fetch(apiUrl, {
        headers: {
            "User-Agent": typeof BASE_UA !== "undefined" ? BASE_UA : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/plain, */*"
        }
    });

    if (!res || !res.ok) return Response.success([]);
    var json = res.json();
    if (!json) return Response.success([]);

    var dataArr = json.novels || json.data || json.items || (Array.isArray(json) ? json : []);
    var books = [];
    for (var b = 0; b < dataArr.length; b++) {
        var bk = toBook(dataArr[b]);
        if (bk && bk.name && bk.link) books.push(bk);
    }

    var nextPage = "";
    var current = json.page || json.current_page || curPage;
    var last = json.total_pages || json.last_page;

    if (last && current < last) {
        nextPage = String(current + 1);
    } else if (books.length >= 10) {
        nextPage = String(curPage + 1);
    }

    return Response.success(books, nextPage);
}
