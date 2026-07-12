load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var doc = loadDocument(url);
    if (!doc) return Response.success([]);
    
    var items = doc.select(".related-manga .related-reading-wrap");
    var novels = [];
    var size = getSize(items);
    
    for (var i = 0; i < size; i++) {
        var item = getElement(items, i);
        if (!item) continue;
        
        var titleA = item.select(".related-reading-content h5 a, a").first();
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
        
        var duplicate = false;
        for (var j = 0; j < novels.length; j++) {
            if (novels[j].link === link) {
                duplicate = true;
                break;
            }
        }
        
        if (!duplicate) {
            novels.push({
                name: name,
                link: link,
                cover: cover,
                description: "",
                host: BASE_URL
            });
        }
    }
    
    return Response.success(novels);
}
