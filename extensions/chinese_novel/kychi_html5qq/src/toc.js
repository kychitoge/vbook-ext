load('config.js');

function execute(url) {
    var bookId = extractBookId(url);
    if (!bookId) return Response.error("Không tìm thấy Book ID");

    var tocUrl = BOOKSHELF_BASE_URL + "/qbread/api/book/all-chapter?bookId=" + bookId;
    var response = fetchWithUA(tocUrl);

    if (response.ok) {
        var json = SafeJson(response);
        var rows = (json && json.rows) ? json.rows : [];
        var chapters = [];

        if (Array.isArray(rows)) {
            rows.forEach(function(item) {
                var serialId = item.serialID || item.id;
                var name = item.serialName || "";
                if (serialId && name) {
                    var chapterUrl = BASE_URL + "/be-api/content/ads-read?bookId=" + bookId + "&serialId=" + serialId;
                    chapters.push({
                        name: name,
                        url: chapterUrl,
                        host: BASE_URL
                    });
                }
            });
        }

        if (chapters.length === 0) {
            return Response.error("Danh sách chương trống hoặc bị lỗi");
        }

        return Response.success(chapters);
    }
    return Response.error("Lỗi tải danh sách chương (HTTP " + (response ? response.status : "không rõ") + ")");
}
