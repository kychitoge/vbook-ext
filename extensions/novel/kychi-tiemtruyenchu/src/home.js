load("config.js");

function execute() {
    return Response.success([
        {
            title: "Tiệm Truyện Chữ",
            input: BASE_URL,
            script: "gen.js"
        }
    ]);
}
