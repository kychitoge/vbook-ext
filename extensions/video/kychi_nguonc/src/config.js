let BASE_URL = "https://phim.nguonc.com";
try {
    if (DOMAIN) {
        BASE_URL = String(DOMAIN).trim().replace(/\/+$/, "");
    }
} catch (error) {
}

let CATEGORY_SLUG_MAP = {
    "hai": "phim-hai",
    "nhac": "phim-nhac",
    "ca-na-da": "canada",
    "phi-lip-pin": "philippines",
    "bra-xin": "brazil"
};

function normalizeUrl(url) {
    if (url && typeof url !== "string") {
        if (url.length > 0) {
            url = url[0];
        } else {
            url = BASE_URL;
        }
    }
    url = String(url || BASE_URL).trim().replace(/\/+$/, "");
    if (!url) return BASE_URL;
    if (url.indexOf("/") === 0) return BASE_URL + url;
    return url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);
}

function normalizeImageUrl(url) {
    if (!url) return "";
    url = String(url).trim();
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("/") === 0) return BASE_URL + url;
    return url;
}

function slugifyCategory(name) {
    if (!name) return "";
    let slug = String(name).toLowerCase()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
        .replace(/[èéẹẻẽêềếệểễ]/g, "e")
        .replace(/[ìíịỉĩ]/g, "i")
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
        .replace(/[ùúụủũưừứựửữ]/g, "u")
        .replace(/[ỳýỵỷỹ]/g, "y")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return CATEGORY_SLUG_MAP[slug] || slug;
}

function defaultHeaders(referer) {
    return {
        "User-Agent": UserAgent.chrome(),
        "Referer": referer || (BASE_URL + "/")
    };
}

function parseCards(json) {
    let list = [];
    let items = [];
    if (json) {
        if (Array.isArray(json.items)) {
            items = json.items;
        } else if (json.data && Array.isArray(json.data.items)) {
            items = json.data.items;
        }
    }

    items.forEach(function (item) {
        if (!item || !item.name || !item.slug) return;
        let cover = normalizeImageUrl(item.poster_url || item.thumb_url);

        let descParts = [];
        if (item.year) descParts.push(String(item.year));
        if (item.current_episode) descParts.push(String(item.current_episode));
        let qualityText = "";
        if (item.quality) qualityText += String(item.quality);
        if (item.language) qualityText += (qualityText ? " " : "") + String(item.language);
        if (qualityText) descParts.push(qualityText);

        list.push({
            name: String(item.name).trim(),
            link: BASE_URL + "/phim/" + item.slug,
            cover: cover,
            description: descParts.join(" • "),
            host: BASE_URL
        });
    });
    return list;
}

function fetchListing(url, page) {
    page = page || "1";
    let base = normalizeUrl(url);
    let fetchUrl = base + (base.indexOf("?") === -1 ? "?" : "&") + "page=" + page;

    let response = fetch(fetchUrl, {
        headers: defaultHeaders(BASE_URL + "/")
    });
    if (!response.ok) return Response.error("HTTP " + response.status);

    let json = response.json();
    let list = parseCards(json);

    let next = "";
    let paginate = json.paginate || (json.data && json.data.paginate);
    if (paginate) {
        let currentPage = parseInt(paginate.current_page || page, 10);
        let totalPages = parseInt(paginate.total_page || paginate.last_page || 0, 10);
        if (currentPage < totalPages) {
            next = String(currentPage + 1);
        }
    }

    return Response.success(list, next);
}
