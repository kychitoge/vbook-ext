// search.js
load('config.js');

function execute(input, page) {
    var key = input;
    var p = page || '1';
    
    // Hỗ trợ cả định dạng tham số mảng (vBook cũ) và chuỗi (vBook mới)
    if (typeof input !== 'string' && getSize(input) >= 1) {
        key = getElement(input, 0);
        p = getElement(input, 1) || '1';
    }
    
    key = cleanText(key);
    if (!key) return Response.success([], null);
    
    var searchUrl = API_URL + "/api/search?q=" + encodeURIComponent(key);
    var response = fetchPage(searchUrl);
    
    if (!response.ok) return Response.error("Không thể kết nối đến máy chủ API.");
    
    var json;
    try {
        json = JSON.parse(response.text());
    } catch (e) {
        return Response.error("Lỗi phân tích dữ liệu phản hồi từ máy chủ.");
    }
    
    var list = json.data || [];
    var pageNum = parseInt(p, 10) || 1;
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
            host: BASE_DETAIL_URL,
            author: item.author || ""
        });
    });
    
    var nextPage = null;
    if (endIdx < list.length) {
        nextPage = String(pageNum + 1);
    }
    
    return Response.success(data, nextPage);
}
