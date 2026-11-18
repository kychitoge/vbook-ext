load("config.js");

function execute() {
    return Response.success([
        { title: "Truyện hot", input: BASE_URL + "/the-loai/tat-ca/truyen-hot.html", script: "gen.js" },
        { title: "Truyện full", input: BASE_URL + "/the-loai/tat-ca/truyen-full.html", script: "gen.js" },
        { title: "Truyện VIP", input: BASE_URL + "/the-loai/tat-ca/vip.html", script: "gen.js" }
    ]);
}
