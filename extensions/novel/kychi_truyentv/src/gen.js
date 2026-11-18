load("config.js");

function execute(url, page) {
    if (!url) return Response.success([], "");
    page = page ? String(page) : "1";

    let fetchUrl = normalizeUrl(url);
    if (page !== "1") {
        fetchUrl = fetchUrl.replace(/([?&])page=\d+/, "") + (fetchUrl.indexOf("?") >= 0 ? "&" : "?") + "page=" + page;
    }

    let response = fetchPage(fetchUrl);
    if (!response.ok) {
        return Response.error("Không thể tải danh sách truyện (HTTP " + response.status + "). Kiểm tra kết nối mạng hoặc tên miền trong cài đặt, rồi thử lại.");
    }

    let doc = response.html();
    let data = parseBookList(doc);

    let next = "";
    if (data.length > 0) {
        let nextEl = doc.select(".custom-pagination-list .nav-next a, .pagination .nav-next a, .pagination li.active + li a").first();
        if (nextEl) {
            let href = nextEl.attr("href") + "";
            let match = href.match(/page=(\d+)/);
            next = match ? match[1] : String(parseInt(page, 10) + 1);
        }
    }

    return Response.success(data, next);
}
