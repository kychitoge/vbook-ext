load('config.js');

function execute(key, page) {
    if (!page) page = 1;
    var url = BASE_URL + "/api/novel/search?q=" + encodeURIComponent(key) + "&page=" + page + "&limit=20&lang=zh-CN";

    var response = fetchWithUA(url);
    if (response.ok) {
        var json = SafeJson(response);
        var list = [];
        var bookList = (json && json.data && json.data.items) ? json.data.items : null;

        if (bookList && Array.isArray(bookList)) {
            bookList.forEach(function(item) {
                var bookId = item.articleid || item.id;
                var name = item.articlename || item.title;
                if (name && bookId) {
                    list.push({
                        name: name,
                        cover: Cover(bookId),
                        author: item.author || "",
                        description: Clean(item.intro || ""),
                        detail: item.author || "",
                        link: BASE_URL + "/novel.html?articleid=" + bookId + "&lang=zh-TW",
                        host: BASE_URL
                    });
                }
            });
        }

        var next = (list.length >= 20) ? (parseInt(page, 10) + 1).toString() : null;
        return Response.success(list, next);
    }
    return Response.error("Lỗi tìm kiếm truyện (HTTP " + (response ? response.status : "không rõ") + ")");
}
