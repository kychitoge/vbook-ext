load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    let response = fetchPage(url);
    if (!response.ok) {
        return Response.error("Không thể tải danh sách trang mục lục (HTTP " + response.status + "). Kiểm tra kết nối mạng hoặc tên miền trong cài đặt, rồi thử lại.");
    }

    let doc = response.html();
    let data = [];
    let anchors = doc.select("#list-chapter .pagination a, #list-chapter .custom-pagination-list a, #mobile-list-chapter .pagination a, .custom-pagination-list a, .pagination a");

    let lastPage = 1;
    for (let i = 0; i < anchors.size(); i++) {
        let a = anchors.get(i);
        if (!a) continue;
        let href = a.attr("href") + "";
        if (!href) continue;
        let match = href.match(/page=(\d+)/);
        if (match) {
            let pNum = parseInt(match[1], 10);
            if (pNum > lastPage) lastPage = pNum;
        }
    }

    for (let p = 1; p <= lastPage; p++) {
        if (p === 1) {
            data.push(url);
        } else {
            data.push(url + (url.indexOf("?") >= 0 ? "&" : "?") + "page=" + p);
        }
    }

    return Response.success(data);
}
