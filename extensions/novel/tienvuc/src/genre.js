load('config.js');

function execute() {
    var response = fetch(BASE_URL + '/api/categories/all');
    if (response.ok) {
        var allCate = response.json();
        var data = [];
        allCate.forEach(function(item) {
            data.push({
                title: item.name,
                input: item.slug,
                script: 'cate.js'
            });
        });
        return Response.success(data);
    }
    return Response.error("Không thể tải danh mục");
}