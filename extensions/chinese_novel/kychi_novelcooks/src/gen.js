load('config.js');

function execute(url, page) {
    if (!page) page = 1;
    var finalUrl = url.replace("{{page}}", page);

    // Handle Ranking Endpoint
    if (url.indexOf("/novel/rank/fanqie") !== -1) {
        var rankName = "";
        var mRank = url.match(/rank_name=([^&]+)/);
        if (mRank) rankName = decodeURIComponent(mRank[1]);

        var responseRank = fetchWithUA(BASE_URL + "/api/novel/rank/fanqie?lang=zh-CN");
        if (responseRank.ok) {
            var jsonRank = SafeJson(responseRank);
            var dataRank = (jsonRank && jsonRank.data) ? jsonRank.data : jsonRank;
            var listRank = [];

            if (dataRank && Array.isArray(dataRank)) {
                dataRank.forEach(function(rank) {
                    if (!rankName || rank.rank_name === rankName) {
                        var books = rank.books || [];
                        books.forEach(function(book) {
                            var bookId = book.my_novel_id || book.fanqie_book_id || book.id;
                            var name = book.title || book.articlename;
                            if (name && bookId) {
                                listRank.push({
                                    name: name,
                                    cover: Cover(bookId),
                                    author: book.author || "",
                                    description: Clean(book.intro || ""),
                                    detail: (rank.rank_name || "") + " - Top " + (book.rank_position || ""),
                                    link: BASE_URL + "/novel.html?articleid=" + bookId + "&lang=zh-TW",
                                    host: BASE_URL,
                                    rank_pos: parseInt(book.rank_position, 10) || 999
                                });
                            }
                        });
                    }
                });
            }

            // De-duplicate
            var uniqueList = [];
            var seen = {};
            listRank.forEach(function(item) {
                var key = item.link;
                if (!seen[key]) {
                    seen[key] = true;
                    uniqueList.push(item);
                }
            });

            // Sort by rank position ascending
            uniqueList.sort(function(a, b) {
                return a.rank_pos - b.rank_pos;
            });

            // Clean up temporary property
            uniqueList.forEach(function(item) {
                delete item.rank_pos;
            });

            return Response.success(uniqueList, null);
        }
        return Response.error("Lỗi tải bảng xếp hạng (HTTP " + (responseRank ? responseRank.status : "không rõ") + ")");
    }

    // Handle Normal Category Listings & Search
    var response = fetchWithUA(finalUrl);
    if (response.ok) {
        var json = SafeJson(response);
        var list = [];
        var bookList = null;
        if (json && json.data) {
            if (Array.isArray(json.data)) {
                bookList = json.data;
            } else if (json.data.data && Array.isArray(json.data.data)) {
                bookList = json.data.data;
            } else if (json.data.items && Array.isArray(json.data.items)) {
                bookList = json.data.items;
            }
        }

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
    return Response.error("Lỗi tải danh sách truyện (HTTP " + (response ? response.status : "không rõ") + ")");
}
