load("config.js");

function execute(input, page) {
    var keyword = "";
    if (Array.isArray(input)) {
        keyword = input[0] || "";
        if (!page) page = input[1] || 1;
    } else {
        keyword = input || "";
        if (!page) page = 1;
    }

    var searchUrl = BASE_URL + "/api/search-novels?keyword=" + encodeURIComponent(keyword) + "&page=" + (page || 1);
    var res = fetch(searchUrl, { headers: { "X-Requested-With": "XMLHttpRequest", "Accept": "application/json" } });

    if (!res || !res.ok) return Response.success([]);
    var json = res.json();
    if (!json) return Response.success([]);

    var dataArr = json.data || json.novels || json.items || (Array.isArray(json) ? json : []);
    var books = [];
    for (var i = 0; i < dataArr.length; i++) {
        var bk = toBook(dataArr[i]);
        if (bk && bk.name && bk.link) books.push(bk);
    }

    var nextPage = "";
    var curPage = parseInt(page || "1", 10);
    var current = json.current_page || json.page || curPage;
    var last = json.last_page || json.total_pages;

    if (last && current < last) nextPage = String(current + 1);
    else if (books.length >= 10) nextPage = String(curPage + 1);

    return Response.success(books, nextPage);
}
