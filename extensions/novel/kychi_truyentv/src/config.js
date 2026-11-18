let BASE_URL = "https://www.tvtruyen1.com";
try {
    if (DOMAIN) {
        let customDomain = String(DOMAIN).trim().replace(/\/+$/, "");
        if (customDomain) BASE_URL = customDomain;
    }
} catch (error) {}

let BASE_UA = "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36";

function fetchPage(url, options) {
    if (!options) options = {};
    let headers = {
        "User-Agent": BASE_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": BASE_URL + "/"
    };

    if (options.headers) {
        for (let key in options.headers) {
            headers[key] = options.headers[key];
        }
    }
    options.headers = headers;

    return fetch(url, options);
}

function normalizeUrl(url) {
    if (!url) return "";
    let raw = String(url).trim();
    if (!raw) return "";
    if (raw.indexOf("//") === 0) {
        raw = "https:" + raw;
    }
    if (raw.indexOf("http") === 0) {
        return raw.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/i, BASE_URL).replace(/\/$/, "");
    }
    if (raw.indexOf("/") === 0) {
        return (BASE_URL + raw).replace(/\/$/, "");
    }
    return (BASE_URL + "/" + raw).replace(/\/$/, "");
}

function cleanText(text) {
    if (!text) return "";
    return (text + "").replace(/\s+/g, " ").trim();
}

function cleanHtml(htm) {
    if (!htm) return "";
    return (htm + "")
        .replace(/·/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/<p>\s*(?:&nbsp;)?\s*<\/p>/gi, "")
        .replace(/<\/p>\s*<p[^>]*>/gi, "<br>")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
        .trim();
}

function cleanDescription(htm) {
    if (!htm) return "";
    return (htm + "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
        .trim();
}

function parseBookList(doc) {
    let data = [];
    let seen = {};

    let comicCards = doc.select(".comic-card");
    for (let i = 0; i < comicCards.size(); i++) {
        let e = comicCards.get(i);
        let a = e.select(".comic-title a, a[itemprop='url']").first();
        if (!a) a = e.select("a").first();
        if (!a) continue;

        let nameEl = e.select(".comic-title h3, h3[itemprop='name'], h3").first();
        let name = nameEl ? cleanText(nameEl.text()) : cleanText(a.attr("title") || a.text());
        let link = a.attr("href");
        if (!name || !link) continue;
        let fullLink = normalizeUrl(link);
        if (seen[fullLink]) continue;
        seen[fullLink] = true;

        let img = e.select("img.item-img, img[itemprop='image'], img").first();
        let cover = img ? (img.attr("src") || img.attr("data-src") || img.attr("data-image") || "") + "" : "";
        let authorEl = e.select(".author, .view-overlay").first();
        let author = authorEl ? cleanText(authorEl.text()) : "";

        data.push({ name: name, link: fullLink, cover: cover, description: author, host: BASE_URL });
    }

    let listRows = doc.select(".list-truyen .row, .list-new .row, .col-truyen-main .row");
    for (let j = 0; j < listRows.size(); j++) {
        let e2 = listRows.get(j);
        let a2 = e2.select(".home-new-comic-title a, .col-title a, a[itemprop='url']").first();
        if (!a2) continue;

        let name2 = cleanText(a2.attr("title") || a2.text());
        let link2 = a2.attr("href");
        if (!name2 || !link2) continue;
        let fullLink2 = normalizeUrl(link2);
        if (seen[fullLink2]) continue;
        seen[fullLink2] = true;

        let chapEl = e2.select(".col-chap a, .chapter-text").first();
        let chapText = chapEl ? cleanText(chapEl.text()) : "";
        let timeEl = e2.select(".col-time").first();
        let timeText = timeEl ? cleanText(timeEl.text()) : "";
        let desc = chapText;
        if (timeText) desc = desc ? (desc + " • " + timeText) : timeText;

        data.push({ name: name2, link: fullLink2, cover: "", description: desc, host: BASE_URL });
    }

    let infoCards = doc.select(".info-mobile-card");
    for (let k = 0; k < infoCards.size(); k++) {
        let e3 = infoCards.get(k);
        let a3 = e3.select(".name a").first();
        if (!a3) continue;

        let name3 = cleanText(a3.attr("title") || a3.text());
        let link3 = a3.attr("href");
        if (!name3 || !link3) continue;
        let fullLink3 = normalizeUrl(link3);
        if (seen[fullLink3]) continue;
        seen[fullLink3] = true;

        let img3 = e3.select(".info-image img, img").first();
        let cover3 = img3 ? (img3.attr("src") || img3.attr("data-src") || img3.attr("data-image") || "") + "" : "";
        let authorEl3 = e3.select(".author a, .author").first();
        let author3 = authorEl3 ? cleanText(authorEl3.text()) : "";

        data.push({ name: name3, link: fullLink3, cover: cover3, description: author3, host: BASE_URL });
    }

    return data;
}
