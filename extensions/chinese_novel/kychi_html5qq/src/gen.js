load('config.js');

function execute(url, page) {
    if (!page) page = 1;
    var startVal = (parseInt(page, 10) - 1) * 20;
    var finalUrl = url.replace("{{page}}", startVal);

    var response = fetchWithUA(finalUrl);
    if (response.ok) {
        var json = SafeJson(response);
        var rows = (json && json.rows) ? json.rows : [];
        var list = [];

        if (Array.isArray(rows)) {
            rows.forEach(function(item) {
                var bookId = item.resourceID || item.resourceId || item.id;
                var name = item.resourceName || item.title;
                if (name && bookId) {
                    var status = (String(item.isfinish) === 'true' || item.isfinish === true) ? '已完结' : '连载中';
                    var score = item.userscore ? (item.userscore + '分') : '';
                    var subject = item.subject || '';
                    var subtype = item.subtype || '';
                    
                    var detailParts = [];
                    if (score) detailParts.push(score);
                    if (subject || subtype) detailParts.push((subject ? (subject + '·') : '') + subtype);
                    detailParts.push(status);

                    list.push({
                        name: name,
                        cover: item.picurl || Cover(bookId),
                        author: item.author || '',
                        description: Clean(item.summary || item.intro || ''),
                        detail: detailParts.join(' • '),
                        link: BOOKSHELF_BASE_URL + "/qbread/api/novel/intro-info?bookid=" + bookId,
                        host: BASE_URL
                    });
                }
            });
        }

        var next = (list.length >= 20) ? (parseInt(page, 10) + 1).toString() : null;
        return Response.success(list, next);
    }
    return Response.error("Lỗi tải danh sách (HTTP " + (response ? response.status : "không rõ") + ")");
}
