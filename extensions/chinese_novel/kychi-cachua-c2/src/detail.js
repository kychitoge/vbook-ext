load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    var bookId = getBookId(url);
    if (!bookId) return Response.error("Không tìm thấy ID truyện");

    var response = fetchPage(BASE_URL + "/detail?book_id=" + bookId, { timeout: 15000, cache: 3600 });

    if (!response || !response.ok) {
        return Response.error("Lỗi kết nối proxy (HTTP " + (response ? response.status : "unknown") + ")");
    }

    var json = SafeJson(response);
    if (!json)            return Response.error("Lỗi phân tích dữ liệu");
    if (json.code !== 0)  return Response.error("Lỗi máy chủ: " + (json.message || json.code));
    if (!json.data)       return Response.error("Dữ liệu truyện trống");

    var b = json.data;

    var statusVal = b.creation_status !== undefined ? b.creation_status : b.status;
    var ongoing = (statusVal === 1 || statusVal === "1");
    if (statusVal === undefined || statusVal === null || statusVal === "") ongoing = true;

    var infoLines = [];
    if (b.score)             infoLines.push("评分: " + b.score);
    if (b.word_number)       infoLines.push("\u5B57\u6570: " + formatNum(b.word_number) + "\u5B57");
    if (b.read_count)        infoLines.push("\u9605\u8BFB: " + formatNum(b.read_count));
    if (b.last_chapter_title) infoLines.push("\u6700\u65B0: " + decodeText(b.last_chapter_title));

    var detailStr = infoLines.join("\n");

    var genres = [];
    if (b.category) {
        genres.push({ title: decodeText(b.category), input: decodeText(b.category), script: "search.js" });
    }
    if (b.pure_category_tags) {
        var tags = String(b.pure_category_tags).split(",");
        for (var i = 0; i < tags.length; i++) {
            var tag = decodeText(tags[i].trim());
            if (tag && tag !== decodeText(b.category || "")) {
                genres.push({ title: tag, input: tag, script: "search.js" });
            }
        }
    }
    if (genres.length > 6) genres = genres.slice(0, 6);

    return Response.success({
        name:        decodeText(b.book_name || ""),
        cover:       b.thumb_url || "",
        host:        BASE_URL,
        author:      decodeText(b.author || ""),
        description: decodeText(cleanText(b.abstract || "")),
        ongoing:     ongoing,
        detail:      detailStr,
        url:         bookLink(bookId),
        type:        "chinese_novel",
        format:      "novel",
        tags:        genres,
        genres:      genres.length > 0 ? genres : undefined
    });
}
