load('config.js');

function execute() {
    var response = fetchWithUA(BASE_URL + "/api/novel/keywords/map?lang=zh-CN");
    if (response.ok) {
        var json = SafeJson(response);
        var data = (json && json.data) ? json.data : json;
        var genres = [];

        if (data && Array.isArray(data)) {
            data.forEach(function(item) {
                var tagName = item.keyword || item.name;
                if (tagName) {
                    genres.push({
                        title: tagName,
                        input: BASE_URL + "/api/novel/search?q=" + encodeURIComponent(tagName) + "&page={{page}}&limit=20&lang=zh-CN",
                        script: "gen.js"
                    });
                }
            });
        }
        return Response.success(genres);
    }
    return Response.error("Lỗi tải danh mục thể loại");
}
