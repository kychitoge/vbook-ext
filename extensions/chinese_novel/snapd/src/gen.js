// gen.js
load('config.js');

function execute(url, page) {
    if (!page) page = "1";
    
    var sortName = url;
    if (url.indexOf("http") === 0) {
        var match = url.match(/\/([a-zA-Z0-9_-]+)\/?$/);
        if (match) {
            sortName = match[1];
        }
    }
    
    sortName = cleanText(sortName);
    
    var sortUrl = API_URL + "/api/sort?sort=" + sortName;
    var response = fetch(sortUrl);
    
    if (!response.ok) return Response.error("Không thể kết nối đến máy chủ API.");
    
    var json;
    try {
        json = JSON.parse(response.text());
    } catch (e) {
        return Response.error("Lỗi phân tích dữ liệu phản hồi từ máy chủ.");
    }
    
    var list = json.data || [];
    var pageNum = parseInt(page) || 1;
    var pageSize = 20;
    var startIdx = (pageNum - 1) * pageSize;
    var endIdx = pageNum * pageSize;
    
    var sliced = list.slice(startIdx, endIdx);
    var data = [];
    
    sliced.forEach(function(item) {
        if (!item.id) return;
        var cover = "https://www.snapd.net/bookimg/" + Math.floor(item.id / 1000) + "/" + item.id + ".jpg";
        data.push({
            name: item.title || "",
            link: BASE_DETAIL_URL + "/book/" + item.id + "/",
            cover: cover,
            description: item.intro || "",
            host: BASE_DETAIL_URL
        });
    });
    
    var nextPage = null;
    if (endIdx < list.length) {
        nextPage = String(pageNum + 1);
    }
    
    return Response.success(data, nextPage);
}
