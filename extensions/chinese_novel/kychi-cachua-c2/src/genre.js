load("config.js");

function execute() {
    var g = String(GENDER);
    var base = FANQIE_URL + "/api/author/library/book_list/v0/?page_count=20&creation_status=-1&word_count=-1&book_type=-1&sort=0&gender=" + g;

    function buildUrl(catId) {
        return base + "&category_id=" + String(catId) + "&page_index={{page}}";
    }

    var list = [];
    var seen = {};
    var res = fetchPage(FANQIE_URL + "/api/author/book/category_list/v0/?book_type=0&gender=" + g, { timeout: 15000, cache: 86400 });

    if (!res || !res.ok) {
        return Response.error("Không thể tải danh sách thể loại (HTTP " + (res ? res.status : "unknown") + "). Kiểm tra kết nối và thử lại.");
    }

    var json = SafeJson(res);
    if (!json || json.code !== 0 || !json.data || !Array.isArray(json.data)) {
        return Response.error("Dữ liệu thể loại không đúng định dạng. Thử tải lại sau.");
    }

    function addItem(item) {
        if (!item || !item.category_id || !item.name) return;
        var cid = String(item.category_id);
        if (seen[cid]) return;
        seen[cid] = true;
        list.push({
            title: cleanText(item.name),
            input: buildUrl(cid),
            script: "gen.js"
        });
    }

    var groups = MAIN_GENRE_ONLY
        ? ["\u4E3B\u5206\u7C7B"]
        : ["\u4E3B\u5206\u7C7B", "\u4E3B\u9898", "\u89D2\u8272", "\u60C5\u8282"];

    for (var gi = 0; gi < groups.length; gi++) {
        var targetLabel = groups[gi];
        for (var i = 0; i < json.data.length; i++) {
            var item = json.data[i];
            if (item && item.label === targetLabel) addItem(item);
        }
    }

    if (!MAIN_GENRE_ONLY) {
        for (var j = 0; j < json.data.length; j++) {
            addItem(json.data[j]);
        }
    }

    if (list.length === 0) {
        return Response.error("Không tìm thấy thể loại phù hợp. Kiểm tra lại cấu hình hoặc thử tải lại sau.");
    }

    return Response.success(list);
}
