load('config.js');

function execute(url) {
    var articleId = extractArticleId(url);
    if (!articleId) return Response.error("Không tìm thấy Article ID");

    var tocUrl = BASE_URL + "/api/chapter/list/" + articleId + "?lang=zh-CN";
    var response = fetchWithUA(tocUrl);

    if (response.ok) {
        var json = SafeJson(response);
        var chapters = [];
        var chapterList = (json && json.data) ? json.data : null;

        if (chapterList && Array.isArray(chapterList)) {
            chapterList.forEach(function(item) {
                var chapterId = item.chapterid || item.id;
                if (chapterId) {
                    chapters.push({
                        name: item.chaptername || "",
                        url: BASE_URL + "/api/chapter/content/" + articleId + "/" + chapterId + "?lang=zh-CN",
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
