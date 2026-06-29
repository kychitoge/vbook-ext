load('config.js');

function execute() {
    return Response.success([
        { title: "热门小说", input: BASE_URL + "/api/novel/hot?lang=zh-CN", script: "gen.js" },
        { title: "男频最热", input: BASE_URL + "/api/novel/rank/fanqie?rank_name=" + encodeURIComponent("男频阅读榜"), script: "gen.js" },
        { title: "男频新书", input: BASE_URL + "/api/novel/rank/fanqie?rank_name=" + encodeURIComponent("男频新书榜"), script: "gen.js" },
        { title: "女频最热", input: BASE_URL + "/api/novel/rank/fanqie?rank_name=" + encodeURIComponent("女频阅读榜"), script: "gen.js" },
        { title: "女频新书", input: BASE_URL + "/api/novel/rank/fanqie?rank_name=" + encodeURIComponent("女频新书榜"), script: "gen.js" },
        { title: "西方奇幻", input: BASE_URL + "/api/novel/list?sortid=1&page={{page}}&limit=20&lang=zh-CN", script: "gen.js" },
        { title: "東方仙俠", input: BASE_URL + "/api/novel/list?sortid=2&page={{page}}&limit=20&lang=zh-CN", script: "gen.js" }
    ]);
}
