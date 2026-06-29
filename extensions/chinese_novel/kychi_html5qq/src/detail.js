load('config.js');

function execute(url) {
    var bookId = extractBookId(url);
    if (!bookId) return Response.error("Không tìm thấy Book ID");

    var apiUrl = BOOKSHELF_BASE_URL + "/qbread/api/novel/intro-info?bookid=" + bookId;
    var response = fetchWithUA(apiUrl);
    if (response.ok) {
        var json = SafeJson(response);
        var bookInfo = (json && json.data && json.data.bookInfo) ? json.data.bookInfo : null;
        if (!bookInfo) return Response.error("Không tìm thấy thông tin chi tiết truyện");

        var ongoing = (String(bookInfo.isfinish) !== 'true' && bookInfo.isfinish !== true);
        var statusStr = ongoing ? "连载中" : "已完结";

        var desc = Clean(bookInfo.summary || "");
        if (desc) {
            desc = desc.replace(/\n/g, "<br>");
        }

        var detailText = "作者: " + (bookInfo.author || "未知")
            + "<br>状态: " + statusStr
            + "<br>评分: " + (bookInfo.userscore ? (bookInfo.userscore + "分") : "暂无")
            + "<br>类别: " + (bookInfo.subject || "") + " • " + (bookInfo.subtype || "")
            + "<br>最新: " + (bookInfo.lastSerialname || "未更新");

        var genres = [];
        var tags = [];
        if (bookInfo.subject) tags.push(bookInfo.subject);
        if (bookInfo.subtype) tags.push(bookInfo.subtype);
        if (bookInfo.tag) {
            bookInfo.tag.split('|').forEach(function(t) {
                if (t.trim()) tags.push(t.trim());
            });
        }

        // De-duplicate tags
        var seenTags = {};
        tags.forEach(function(tag) {
            if (tag && !seenTags[tag]) {
                seenTags[tag] = true;
                genres.push({
                    title: tag,
                    input: tag,
                    script: "search.js"
                });
            }
        });

        return Response.success({
            name: bookInfo.resourceName || "",
            cover: bookInfo.picurl || Cover(bookId),
            host: BASE_URL,
            author: bookInfo.author || "",
            description: desc,
            ongoing: ongoing,
            genres: genres.length > 0 ? genres : undefined,
            detail: detailText,
            link: BOOKSHELF_BASE_URL + "/qbread/api/novel/intro-info?bookid=" + bookId
        });
    }
    return Response.error("Lỗi tải thông tin chi tiết truyện (HTTP " + (response ? response.status : "không rõ") + ")");
}
