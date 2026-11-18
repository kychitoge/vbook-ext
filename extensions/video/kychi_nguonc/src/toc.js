load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    let slug = url.split("/").pop().split("?")[0].split("#")[0];
    if (!slug) return Response.error("URL phim không hợp lệ");

    let apiUrl = BASE_URL + "/api/film/" + slug;
    let response = fetch(apiUrl, {
        headers: defaultHeaders(BASE_URL + "/")
    });
    if (!response.ok) return Response.error("HTTP " + response.status);

    let resJson = response.json();
    let movie = resJson.movie || (resJson.data && resJson.data.movie);
    if (!movie) return Response.error("Không tìm thấy dữ liệu phim");

    let episodesData = Array.isArray(movie.episodes) ? movie.episodes : [];
    let list = [];

    let serversWithData = episodesData.filter(function (server) {
        return server && Array.isArray(server.items) && server.items.some(function (item) {
            return item && item.embed;
        });
    }).length;

    let hasMultipleServers = serversWithData > 1;

    episodesData.forEach(function (server) {
        if (!server || !Array.isArray(server.items)) return;
        let serverName = server.server_name || "Nguồn";
        let epItems = [];

        server.items.forEach(function (item) {
            if (!item || !item.embed) return;
            let name = item.name ? String(item.name).trim() : "";
            let epName = name || "Tập";

            if (name && !isNaN(name) && name.toLowerCase().indexOf("tập") === -1) {
                epName = "Tập " + name;
            }

            epItems.push({
                name: epName,
                url: String(item.embed).trim(),
                description: "",
                lock: false,
                pay: false
            });
        });

        if (epItems.length > 0) {
            if (hasMultipleServers) {
                list.push({
                    name: serverName,
                    type: "section"
                });
            }
            list = list.concat(epItems);
        }
    });

    return Response.success(list);
}
