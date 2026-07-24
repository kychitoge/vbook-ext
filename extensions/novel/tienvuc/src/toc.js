load('config.js');

function execute(url) {
    var slug = url.split('/').pop();
    var response = fetch(BASE_URL + '/api/reading/' + slug + '/chapters');
    if (response.ok) {
        var json = response.json();
        var allChap = json.docs;
        var list = [];
        allChap.forEach(function(chap) {
            var buy = chap.coins > 0 && chap.isBought === false;
            list.push({
                name: 'Chương ' + chap.num + ': ' + chap.name,
                url: url + '/chuong-' + chap.num,
                pay: buy,
                host: BASE_URL
            });
        });
        return Response.success(list);
    }
    return Response.error("Không thể tải danh sách chương");
}