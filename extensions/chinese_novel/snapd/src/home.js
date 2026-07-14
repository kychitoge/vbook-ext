// home.js
load('config.js');

function execute() {
    return Response.success([
        { title: "首页", input: "index", script: "gen.js" },
        { title: "排行榜", input: "top", script: "gen.js" },
        { title: "全本", input: "finish", script: "gen.js" },
        { title: "玄幻", input: "xuanhuan", script: "gen.js" },
        { title: "都市", input: "dushi", script: "gen.js" }
    ]);
}
