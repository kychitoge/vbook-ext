load('config.js');

function execute() {
    return Response.success([
        { title: "書庫", input: "/bookstack/", script: "gen.js" },
        { title: "男生頻道", input: "/bookstack/boy/", script: "gen.js" },
        { title: "女生頻道", input: "/bookstack/girl/", script: "gen.js" },
        { title: "連載小說", input: "/bookstack/?end=1", script: "gen.js" },
        { title: "完結小說", input: "/bookstack/?end=2", script: "gen.js" }
    ]);
}
