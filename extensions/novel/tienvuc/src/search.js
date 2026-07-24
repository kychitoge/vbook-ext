load('config.js');

function execute(key, page) {
    if (!page) page = '1';
    var response = fetch(BASE_URL + '/api/search', {
        method: "GET",
        queries: {
            search: key,
            page: page,
            limit: '10'
        }
    });
    if (response.ok) {
        var data = response.json();
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
        return Response.success(list);
    }
    return Response.success([]);
}