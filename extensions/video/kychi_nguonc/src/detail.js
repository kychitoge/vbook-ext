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
    if (!movie) return Response.error("Không tìm thấy thông tin phim");

    let genres = [];
    let suggests = [];
    let infoParts = [];

    let originalName = movie.original_name || movie.origin_name;
    if (originalName) infoParts.push("Tên gốc: " + originalName);
    infoParts.push("Trạng thái: " + (movie.current_episode || "Đang cập nhật") + " / " + (movie.total_episodes || "?"));
    let quality = ((movie.quality || "") + " " + (movie.language || "")).trim();
    if (quality) infoParts.push("Chất lượng: " + quality);
    if (movie.time && movie.time !== "null") infoParts.push("Thời lượng: " + movie.time);
    if (movie.director && movie.director !== "N/A") infoParts.push("Đạo diễn: " + movie.director);
    if (movie.casts && movie.casts !== "N/A") infoParts.push("Diễn viên: " + movie.casts);

    if (movie.category) {
        let categories = movie.category;

        if (categories["1"] && Array.isArray(categories["1"].list)) {
            let formats = categories["1"].list.map(function (item) { return item.name; }).filter(Boolean);
            if (formats.length > 0) infoParts.push("Định dạng: " + formats.join(", "));
        }

        if (categories["2"] && Array.isArray(categories["2"].list)) {
            let genresList = categories["2"].list;
            let genreNames = [];
            genresList.forEach(function (item) {
                if (!item || !item.name) return;
                genreNames.push(item.name);
                let gSlug = item.slug || slugifyCategory(item.name);
                if (gSlug) {
                    genres.push({
                        title: item.name,
                        input: "/api/films/the-loai/" + gSlug,
                        script: "search.js"
                    });
                }
            });
            if (genreNames.length > 0) {
                infoParts.push("Thể loại: " + genreNames.join(", "));
                let firstGenre = genresList[0];
                let firstGenreSlug = firstGenre && (firstGenre.slug || slugifyCategory(firstGenre.name));
                if (firstGenreSlug) {
                    suggests.push({
                        title: "Cùng thể loại: " + firstGenre.name,
                        input: "/api/films/the-loai/" + firstGenreSlug,
                        script: "search.js"
                    });
                }
            }
        }

        if (categories["3"] && Array.isArray(categories["3"].list)) {
            let yearsList = categories["3"].list;
            let years = yearsList.map(function (item) { return item.name; }).filter(Boolean);
            if (years.length > 0) {
                infoParts.push("Năm: " + years.join(", "));
                suggests.push({
                    title: "Phim cùng năm " + years[0],
                    input: "/api/films/nam-phat-hanh/" + years[0],
                    script: "search.js"
                });
            }
        }

        if (categories["4"] && Array.isArray(categories["4"].list)) {
            let countriesList = categories["4"].list;
            let countryNames = [];
            countriesList.forEach(function (item) {
                if (!item || !item.name) return;
                countryNames.push(item.name);
                let cSlug = item.slug || slugifyCategory(item.name);
                if (cSlug) {
                    genres.push({
                        title: item.name,
                        input: "/api/films/quoc-gia/" + cSlug,
                        script: "search.js"
                    });
                }
            });
            if (countryNames.length > 0) {
                infoParts.push("Quốc gia: " + countryNames.join(", "));
                let firstCountry = countriesList[0];
                let firstCountrySlug = firstCountry && (firstCountry.slug || slugifyCategory(firstCountry.name));
                if (firstCountrySlug) {
                    suggests.push({
                        title: "Phim cùng quốc gia: " + firstCountry.name,
                        input: "/api/films/quoc-gia/" + firstCountrySlug,
                        script: "search.js"
                    });
                }
            }
        }
    }

    let ongoing = true;
    let status = (movie.status || "").toLowerCase();
    let currentEp = movie.current_episode ? String(movie.current_episode).toLowerCase().trim() : "";
    if (status === "completed" || status === "hoanthanh" || status === "hoàn thành") {
        ongoing = false;
    } else if (currentEp === "full" || currentEp.indexOf("hoàn tất") !== -1) {
        ongoing = false;
    }

    let cover = normalizeImageUrl(movie.thumb_url || movie.poster_url);
    let description = movie.description ? String(movie.description).replace(/<[^>]*>/g, "").trim() : "";

    return Response.success({
        name: movie.name || "",
        author: (movie.director && movie.director !== "N/A") ? movie.director : "Đang cập nhật",
        cover: cover,
        description: description,
        detail: infoParts.join("<br>"),
        url: url,
        type: "video",
        format: "series",
        ongoing: ongoing,
        locale: "vi",
        genres: genres,
        suggests: suggests,
        host: BASE_URL
    });
}
