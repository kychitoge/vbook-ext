// chap.js
load('config.js');
load('crypto.js');
function execute(url) {
    var match = url.match(/book\/(\d+)\/(\d+)/) || url.match(/read\/(\d+)\/(\d+)/);
    if (!match) return Response.error("Đường dẫn chương không hợp lệ.");
    
    var apiId = match[1];
    var chapterId = match[2];
    
    var apiUrl = get_api_url('chapter', {
        id: parseInt(apiId, 10),
        chapterid: parseInt(chapterId, 10)
    });
    
    var response = fetchPage(apiUrl);
    if (!response.ok) return Response.error("Không thể tải nội dung chương từ máy chủ API.");
    
    var json;
    try {
        json = JSON.parse(response.text());
    } catch (e) {
        return Response.error("Lỗi phân tích dữ liệu chương từ máy chủ API.");
    }
    
    var txt = json.txt || "";
    var paragraphs = txt.split(/\r?\n/);
    var formattedHtml = "";
    
    paragraphs.forEach(function(para) {
        var cleanPara = cleanText(para);
        if (cleanPara) {
            formattedHtml += "<p>　　" + cleanPara + "</p>";
        }
    });
    
    if (!formattedHtml) return Response.error("Nội dung chương trống.");
    
    return Response.success(formattedHtml);
}
