load('config.js');

function execute(key, page) {
    if (!page) page = 1;
    var startVal = (parseInt(page, 10) - 1) * 20;
    var endVal = parseInt(page, 10) * 20 - 1;
    var url = "https://newopensearch.reader.qq.com/wechat?keyword=" + encodeURIComponent(key) + "&start=" + startVal + "&end=" + endVal;

    var response = fetchWithUA(url);
    if (response.ok) {
        var json = SafeJson(response);
        var booklist = (json && json.booklist) ? json.booklist : [];
        var list = [];

        if (Array.isArray(booklist)) {
            booklist.forEach(function(item) {
                var rawBid = item.bid || item.id;
                if (rawBid) {
                    var bookId = 1100000000 + parseInt(rawBid, 10);
                    
                    var category = item.categoryInfoV4 || '';
                    // Category format cleanup if matching Legado replacement
                    // E.g. "1:都市:都市生活,2:言情"
                    category = category.replace(/\d+.*?:(.*?):.*?(,|$)/g, '$1$2').replace(/小说,?/g, '');

                    var updateInfo = item.updateInfo || '';
                    var status = /已更新至|更新至/i.test(updateInfo) ? '连载中' : (updateInfo || '连载中');

                    var detailParts = [];
                    if (category) detailParts.push(category);
                    detailParts.push(status);

                    list.push({
                        name: item.title || '',
                        cover: Cover(bookId),
                        author: item.author || '',
                        description: Clean(item.intro || ''),
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
    return Response.error("Lỗi tìm kiếm truyện (HTTP " + (response ? response.status : "không rõ") + ")");
}
