// detail.js
load('config.js');
load('crypto.js');
function getGenreSlug(name) {
    if (!name) return "top";
    if (name.indexOf("玄幻") >= 0) return "xuanhuan";
    if (name.indexOf("武侠") >= 0) return "wuxia";
    if (name.indexOf("都市") >= 0) return "dushi";
    if (name.indexOf("历史") >= 0) return "lishi";
    if (name.indexOf("网游") >= 0) return "wangyou";
    if (name.indexOf("科幻") >= 0) return "kehuan";
    if (name.indexOf("女生") >= 0 || name.indexOf("言情") >= 0 || name.indexOf("女生") >= 0) return "mm";
    return "top";
}

function execute(url) {
    var apiId = "";
    
    if (url.indexOf("read/") > -1) {
        var response = fetchPage(url);
        if (!response.ok) return Response.error("Không thể tải trang chi tiết truyện từ máy chủ.");
        var doc = response.html();
        var html = doc.html();
        var match = html.match(/addBookCase\('(\d+)'\)/) || html.match(/book_error\('(\d+)'/);
        if (!match) return Response.error("Không thể tìm thấy mã truyện từ trang web.");
        apiId = match[1];
    } else {
        var match = url.match(/book\/(\d+)/);
        if (!match) return Response.error("Định dạng liên kết không hợp lệ.");
        apiId = match[1];
    }
    
    var apiUrl = get_api_url('book', { id: parseInt(apiId, 10) });
    var apiResponse = fetchPage(apiUrl);
    
    if (!apiResponse.ok) return Response.error("Không thể kết nối đến máy chủ API.");
    
    var json;
    try {
        json = JSON.parse(apiResponse.text());
    } catch (e) {
        return Response.error("Lỗi phân tích dữ liệu chi tiết truyện từ máy chủ API.");
    }
    
    var cover = "https://www.snapd.net/bookimg/" + Math.floor(json.id / 1000) + "/" + json.id + ".jpg";
    var statusText = cleanText(json.full);
    var ongoing = (statusText.indexOf("完") === -1 && statusText.indexOf("全") === -1);
    
    var detailParts = [
        "<b>分类:</b> " + cleanText(json.sortname),
        "<b>状态:</b> " + statusText,
        "<b>更新:</b> " + cleanText(json.lastchapter)
    ];
    
    var genres = [];
    if (json.sortname) {
        genres.push({
            title: cleanText(json.sortname),
            input: getGenreSlug(json.sortname),
            script: "gen.js"
        });
    }

    return Response.success({
        name: cleanText(json.title),
        cover: cover,
        host: BASE_DETAIL_URL,
        author: cleanText(json.author),
        description: cleanText(json.intro),
        detail: detailParts.join("<br>"),
        ongoing: ongoing,
        genres: genres,
        link: BASE_DETAIL_URL + "/book/" + json.id + "/"
    });
}
