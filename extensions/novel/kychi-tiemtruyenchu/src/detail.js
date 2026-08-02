load("config.js");

function execute(url) {
    var data = {
        name: DEMO_DETAIL.name,
        cover: DEMO_DETAIL.cover,
        author: DEMO_DETAIL.author,
        description: DEMO_DETAIL.description,
        detail: DEMO_DETAIL.detail,
        url: url || DEMO_DETAIL.url,
        type: DEMO_DETAIL.type,
        format: DEMO_DETAIL.format,
        ongoing: DEMO_DETAIL.ongoing,
        tags: DEMO_DETAIL.tags,
        genres: DEMO_DETAIL.genres,
        suggests: DEMO_DETAIL.suggests,
        comments: DEMO_DETAIL.comments,
        reviews: DEMO_DETAIL.reviews,
        host: DEMO_DETAIL.host
    };
    return Response.success(data);
}
