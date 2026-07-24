load('config.js');

function execute(url, page) {
    if (!page) page = '1';
    var response = fetch(BASE_URL + '/api/categories/' + url + '/books', {
        method: "GET",
        queries: {
            slug: url,
            page: page,
            limit: '10'
        }
    });
    if (response.ok) {
        var data = response.json();
        var allPage = Math.floor(data.totalDocs / 10) + 1;
        var next = null;
        if (parseInt(page) < allPage) {
            next = String(parseInt(page) + 1);
        }
        var list = [];
        var allBook = data.docs;
        allBook.forEach(function(book) {
            var vip = book.vip === true ? "【Truyện VIP】 " : '';
            list.push({
                name: book.name,
                link: book.slug,
                cover: book.cover.domain + '/' + book.cover.url,
                description: vip + book.author.name,
                host: BASE_URL
            });
        });
        return Response.success(list, next);
    }
    return Response.success([]);
}