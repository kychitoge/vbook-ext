load('config.js');

function execute(input, page) {
    var pathInput = input;
    if (typeof input === 'object' && input !== null && input.length !== undefined) {
        pathInput = input[0];
        page = input[1];
    }
    page = page ? String(page) : '1';
    var inputPage = parseInt(page, 10);
    
    if (pathInput.indexOf('http') === 0) {
        pathInput = pathInput.replace(/^(?:https?:\/\/)?(?:[^\/]+)/, '');
    }

    var url = "";
    if (pathInput.indexOf('?') !== -1) {
        var parts = pathInput.split('?');
        var path = parts[0];
        var query = parts[1];
        if (path.slice(-1) !== '/') path += '/';
        url = BASE_URL + path + (page === '1' ? "" : "page/" + page + "/") + "?" + query;
    } else {
        var path = pathInput;
        if (path.slice(-1) !== '/') path += '/';
        url = BASE_URL + path + (page === '1' ? "" : "page/" + page + "/");
    }
    
    var doc = loadDocument(url);
    if (!doc) return Response.error("Không thể tải danh sách truyện");
    
    var items = doc.select(".page-item-detail, .c-tabs-item__content");
    var novels = [];
    var size = getSize(items);
    
    for (var i = 0; i < size; i++) {
        var item = getElement(items, i);
        if (!item) continue;
        
        var titleA = item.select(".post-title a, .item-thumb a, .tab-thumb a").first();
        if (!titleA) continue;
        
        var name = cleanText(titleA.text() || titleA.attr("title"));
        var link = normalizeUrl(titleA.attr("href"));
        if (!name || !link) continue;
        
        var img = item.select("img").first();
        var cover = "";
        if (img) {
            cover = img.attr("data-src") || img.attr("src") || "";
            if (cover.indexOf("//") === 0) cover = "https:" + cover;
            if (cover && cover.indexOf("http") !== 0) cover = BASE_URL + cover;
            cover = encodeURI(cover);
        }
        
        var info = cleanText(item.select(".trangthai, .trang-thai").text());
        var summary = cleanText(item.select(".except-summary").text());
        var desc = info ? info + (summary ? " - " + summary : "") : summary;
        
        novels.push({
            name: name,
            link: link,
            cover: cover,
            description: desc,
            host: BASE_URL
        });
    }
    
    var nextPage = null;
    var gotoPage = doc.select(".madara-quick-pagination input#madara_goto_page").first();
    if (gotoPage) {
        var maxPage = parseInt(gotoPage.attr("max"), 10);
        if (maxPage && inputPage < maxPage) {
            nextPage = String(inputPage + 1);
        }
    }
    
    return Response.success(novels, nextPage);
}
