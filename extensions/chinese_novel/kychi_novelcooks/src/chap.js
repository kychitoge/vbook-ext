load('config.js');

function execute(url) {
    var response = fetchWithUA(url);
    if (response.ok) {
        var json = SafeJson(response);
        var data = (json && json.data) ? json.data : null;
        if (!data) return Response.error("Nội dung chương trống hoặc bị lỗi");

        var content = data.content || "";
        if (content) {
            return Response.success(Clean(content));
        }
        return Response.error("Nội dung chương trống");
    }
    return Response.error("Lỗi tải nội dung chương (HTTP " + (response ? response.status : "không rõ") + ")");
}
