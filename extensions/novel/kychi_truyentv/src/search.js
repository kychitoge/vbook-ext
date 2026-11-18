load("config.js");

function toSlug(str) {
    if (!str) return "";
    let slug = String(str).toLowerCase();

    let from = "\u00e0\u00e1\u1ea1\u1ea3\u00e3\u00e2\u1ea7\u1ea5\u1ead\u1ea9\u1eab\u0103\u1eb1\u1eaf\u1eb7\u1eb3\u1eb5\u00e8\u00e9\u1eb9\u1ebb\u1ebd\u00ea\u1ec1\u1ebf\u1ec7\u1ec3\u1ec5\u00ec\u00ed\u1ecb\u1ec9\u0129\u00f2\u00f3\u1ecd\u1ecf\u00f5\u00f4\u1ed3\u1ed1\u1ed9\u1ed5\u1ed7\u01a1\u1edd\u1edb\u1ee3\u1edf\u1ee1\u00f9\u00fa\u1ee5\u1ee7\u0169\u01b0\u1eeb\u1ee9\u1ef1\u1eed\u1eef\u1ef3\u00fd\u1ef5\u1ef7\u1ef9\u0111";
    let to = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";

    for (let i = 0; i < from.length; i++) {
        slug = slug.split(from.charAt(i)).join(to.charAt(i));
    }

    return slug
        .replace(/[^a-z0-9\- ]/g, "")
        .replace(/\s+/g, "-")
        .replace(/\-+/g, "-")
        .replace(/^\-+|\-+$/g, "");
}

function execute(query, page) {
    let keyword = query ? String(query) : "";
    let key = toSlug(keyword);
    page = page ? String(page) : "1";

    let fetchUrl = BASE_URL + "/tim-kiem?tukhoa=" + encodeURIComponent(key) + "&page=" + page;
    let response = fetchPage(fetchUrl);
    if (!response.ok) {
        return Response.error("Không thể tìm kiếm truyện (HTTP " + response.status + "). Kiểm tra kết nối mạng hoặc tên miền trong cài đặt, rồi thử lại.");
    }

    let doc = response.html();
    let data = parseBookList(doc);

    let next = data.length > 0 ? extractNextPage(doc, page) : "";

    return Response.success(data, next);
}
