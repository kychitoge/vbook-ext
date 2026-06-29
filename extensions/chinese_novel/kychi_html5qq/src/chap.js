load('config.js');

function execute(url) {
    var bookIdMatch = url.match(/bookId=(\d+)/);
    var serialIdMatch = url.match(/serialId=(\d+)/);

    var bookId = bookIdMatch ? bookIdMatch[1] : null;
    var serialId = serialIdMatch ? serialIdMatch[1] : null;

    if (!bookId || !serialId) {
        return Response.error("Không tìm thấy ID truyện hoặc chương trong URL: " + url);
    }

    var targetUrl = "https://novel.html5.qq.com/be-api/content/ads-read";
    var payload = {
        Scene: "chapter",
        ContentAnchorBatch: [
            {
                BookID: String(bookId),
                ChapterSeqNo: [parseInt(serialId, 10)]
            }
        ]
    };

    var response = fetchWithUA(targetUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        var json = SafeJson(response);
        var contentData = (json && json.data && json.data.Content && json.data.Content[0]) ? json.data.Content[0] : null;
        var contentArr = contentData ? contentData.Content : null;

        if (Array.isArray(contentArr)) {
            var fullText = contentArr.join('\n');
            return Response.success(Clean(fullText));
        }
        return Response.error("Nội dung chương trống hoặc bị lỗi");
    }

    return Response.error("Lỗi tải nội dung chương (HTTP " + (response ? response.status : "không rõ") + ")");
}
