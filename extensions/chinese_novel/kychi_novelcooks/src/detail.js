load('config.js');

function execute(url) {
    var articleId = extractArticleId(url);
    if (!articleId) return Response.error("Không tìm thấy Article ID");

    var apiUrl = BASE_URL + "/api/novel/detail/" + articleId + "?lang=zh-CN";
    var response = fetchWithUA(apiUrl);
    if (response.ok) {
        var json = SafeJson(response);
        var data = (json && json.data) ? json.data : null;
        if (!data) return Response.error("Không tìm thấy thông tin chi tiết truyện");

        var isOngoing = (parseInt(data.fullflag, 10) !== 1);
        var desc = Clean(data.intro || "");
        if (desc) {
            desc = desc.replace(/\n/g, "<br>");
        }

        var statusStr = isOngoing ? "连载中" : "已完结";
        var updateTime = "";
        if (data.lastupdate) {
            try {
                var date = new Date(parseInt(data.lastupdate, 10) * 1000);
                var y = date.getFullYear();
                var m = date.getMonth() + 1;
                if (m < 10) m = '0' + m;
                var d = date.getDate();
                if (d < 10) d = '0' + d;
                updateTime = d + '/' + m + '/' + y;
            } catch (e) {}
        }

        var detailText = "作者: " + (data.author || "未知")
            + "<br>状态: " + statusStr
            + "<br>最新: " + (data.lastchapter || "未更新");

        if (updateTime) {
            detailText += "<br>更新: " + updateTime;
        }
        if (data.role) {
            detailText += "<br>主角: " + data.role;
        }

        var lang = "zh-TW";
        if (url) {
            var mLang = url.match(/lang=([^&]+)/);
            if (mLang) lang = mLang[1];
        }

        var genres = [];
        if (data.tag_list && Array.isArray(data.tag_list)) {
            data.tag_list.forEach(function(tag) {
                var tagName = "";
                if (tag) {
                    if (typeof tag === 'string') {
                        tagName = tag;
                    } else if (typeof tag === 'object') {
                        tagName = tag.keyword || tag.tag_name || tag.name || "";
                    }
                }
                tagName = String(tagName).trim();
                if (tagName) {
                    genres.push({
                        title: tagName,
                        input: BASE_URL + "/api/novel/search?q=" + encodeURIComponent(tagName) + "&page={{page}}&limit=20&lang=zh-CN",
                        script: "gen.js"
                    });
                }
            });
        }

        var suggests = [];
        if (data.author) {
            suggests.push({
                title: "同作者推荐: " + data.author,
                input: BASE_URL + "/api/novel/search?q=" + encodeURIComponent(data.author) + "&page={{page}}&limit=20&lang=zh-CN",
                script: "gen.js"
            });
        }

        return Response.success({
            name: data.articlename || "",
            cover: Cover(articleId),
            host: BASE_URL,
            author: data.author || "",
            description: desc,
            ongoing: isOngoing,
            genres: genres.length > 0 ? genres : undefined,
            suggests: suggests.length > 0 ? suggests : undefined,
            detail: detailText,
            link: BASE_URL + "/novel.html?articleid=" + articleId + "&lang=" + lang
        });
    }
    return Response.error("Lỗi tải thông tin chi tiết truyện (HTTP " + (response ? response.status : "không rõ") + ")");
}
