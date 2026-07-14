// toc.js
load('config.js');
load('crypto.js');
function execute(url) {
    var match = url.match(/book\/(\d+)/) || url.match(/read\/(\d+)/);
    if (!match) return Response.success([]);
    var apiId = match[1];
    
    var apiUrl = get_api_url('booklist', { id: parseInt(apiId, 10) });
    var response = fetchPage(apiUrl);
    
    if (!response.ok) return Response.success([]);
    
    var json;
    try {
        json = JSON.parse(response.text());
    } catch (e) {
        return Response.success([]);
    }
    
    var list = json.list || [];
    var chapters = [];
    
    list.forEach(function(name, index) {
        chapters.push({
            name: cleanText(name),
            url: BASE_DETAIL_URL + "/book/" + apiId + "/" + (index + 1) + ".html",
            host: BASE_DETAIL_URL
        });
    });
    
    return Response.success(chapters);
}
