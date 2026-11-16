let BASE_URL = "https://truyencv.io";
try {
  if (DOMAIN) {
    BASE_URL = String(DOMAIN).trim().replace(/\/+$/, "");
  }
} catch (error) {
}
let API_URL = BASE_URL + "/wp-json";

function normalizeUrl(url) {
  if (!url) return "";
  return String(url).replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);
}

var CACHED_TOKEN = "";

function getLocalStorageItem(key) {
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.getItem === "function") {
      return localStorage.getItem(key);
    }
  } catch (e) {}
  return null;
}

function setLocalStorageItem(key, value) {
  try {
    if (typeof localStorage !== "undefined" && localStorage && typeof localStorage.setItem === "function") {
      localStorage.setItem(key, value);
      return true;
    }
  } catch (e) {}
  return false;
}

function isTokenValid(token) {
  if (!token) return false;
  var t = String(token).trim();
  if (t === "" || t.toLowerCase() === "null" || t.toLowerCase() === "undefined") {
    return false;
  }
  return true;
}

function isEmailPasswordValid(email, password) {
  if (!email || !password) return false;
  var e = String(email).trim();
  var p = String(password).trim();
  if (e === "" || e.toLowerCase() === "null" || e.toLowerCase() === "undefined") return false;
  if (p === "" || p.toLowerCase() === "null" || p.toLowerCase() === "undefined") return false;
  return true;
}

function checkConfigured() {
  try {
    if (typeof USER_TOKEN !== "undefined" && isTokenValid(USER_TOKEN)) {
      return true;
    }
  } catch (e) {}

  if (isTokenValid(CACHED_TOKEN)) {
    return true;
  }

  try {
    var cached = getLocalStorageItem("truyencv_auth_token");
    if (isTokenValid(cached)) {
      CACHED_TOKEN = cached.trim();
      return true;
    }
  } catch (e) {}

  try {
    if (typeof USER_EMAIL !== "undefined" && typeof USER_PASSWORD !== "undefined") {
      if (isEmailPasswordValid(USER_EMAIL, USER_PASSWORD)) {
        return true;
      }
    }
  } catch (e) {}

  return false;
}

function loginAndGetToken(username, password) {
  var bodyObj = {
    username: username,
    password: password
  };
  var body = JSON.stringify(bodyObj);

  // Cách 1: Sử dụng fetch chuẩn của JSBridge (Cho phép truyền header đầy đủ, tránh 504)
  try {
    var response = fetch(API_URL + "/jwt-auth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Dart/3.11 (dart:io)",
        "Accept": "application/json"
      },
      body: body
    });

    if (response && response.ok) {
      try {
        var json = response.json();
        if (json && json.token) {
          setLocalStorageItem("truyencv_auth_token", json.token);
          CACHED_TOKEN = json.token;
          return json.token;
        }
      } catch (jsonErr) {}

      var responseText = "";
      if (typeof response.text === "function") {
        responseText = response.text();
      } else if (typeof response.string === "function") {
        responseText = response.string();
      } else {
        responseText = String(response);
      }

      if (responseText) {
        var json = JSON.parse(responseText);
        if (json && json.token) {
          setLocalStorageItem("truyencv_auth_token", json.token);
          CACHED_TOKEN = json.token;
          return json.token;
        }
      }
    }
  } catch (e) {
    try {
      Log.log("Login fetch error: " + (e.message || e));
    } catch (err) {}
  }

  // Cách 2: Fallback qua Http.post của OkHttp nếu fetch lỗi
  try {
    var req = Http.post(API_URL + "/jwt-auth/v1/token");
    
    // Kiểm tra xem đối tượng req của Java có hỗ trợ phương thức headers() không để tránh crash
    if (req && typeof req.headers === "function") {
      req = req.headers({
        "Content-Type": "application/json",
        "User-Agent": "Dart/3.11 (dart:io)",
        "Accept": "application/json"
      });
    }

    var responseText = req.body(body).string("utf-8");

    if (responseText) {
      var json = JSON.parse(responseText);
      if (json && json.token) {
        setLocalStorageItem("truyencv_auth_token", json.token);
        CACHED_TOKEN = json.token;
        return json.token;
      }
    }
  } catch (e) {
    try {
      Log.log("Login Http.post error: " + (e.message || e));
    } catch (err) {}
  }

  return "";
}

function getToken() {
  try {
    if (typeof USER_TOKEN !== "undefined" && isTokenValid(USER_TOKEN)) {
      return USER_TOKEN.trim();
    }
  } catch (e) {}

  if (isTokenValid(CACHED_TOKEN)) {
    return CACHED_TOKEN.trim();
  }

  try {
    var cached = getLocalStorageItem("truyencv_auth_token");
    if (isTokenValid(cached)) {
      CACHED_TOKEN = cached.trim();
      return CACHED_TOKEN;
    }
  } catch (e) {}

  try {
    if (typeof USER_EMAIL !== "undefined" && typeof USER_PASSWORD !== "undefined") {
      var email = USER_EMAIL.trim();
      var password = USER_PASSWORD.trim();
      if (isEmailPasswordValid(email, password)) {
        var token = loginAndGetToken(email, password);
        if (isTokenValid(token)) {
          CACHED_TOKEN = token;
          return token;
        }
      }
    }
  } catch (e) {}

  return "";
}

function fetchApi(url, options) {
  if (!options) options = {};

  var headers = {
    "User-Agent": "Dart/3.11 (dart:io)",
    "Content-Type": "application/json"
  };

  var token = getToken();
  if (token) {
    headers["Authorization"] = token.indexOf("Bearer") === 0 ? token : "Bearer " + token;
  }

  if (options.headers) {
    for (var key in options.headers) {
      headers[key] = options.headers[key];
    }
  }

  options.headers = headers;
  var response = fetch(url, options);

  if (!response.ok && (response.status === 401 || response.status === 403)) {
    try {
      if (typeof USER_EMAIL !== "undefined" && USER_EMAIL && typeof USER_PASSWORD !== "undefined" && USER_PASSWORD) {
        var email = USER_EMAIL.trim();
        var password = USER_PASSWORD.trim();
        if (email !== "" && password !== "") {
          setLocalStorageItem("truyencv_auth_token", "");
          CACHED_TOKEN = "";
          var newToken = loginAndGetToken(email, password);
          if (newToken) {
            options.headers["Authorization"] = "Bearer " + newToken;
            response = fetch(url, options);
          }
        }
      }
    } catch (e) {}
  }

  return response;
}

function decodeHtmlEntities(text) {
  if (text === undefined || text === null) {
    return "";
  }
  return String(text)
    .replace(/&#8230;/g, "…")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#0*39;/g, "'")
    .replace(/&#(\d+);/g, function(_, code) {
      return String.fromCharCode(parseInt(code, 10));
    });
}

function cleanText(text) {
  if (text === undefined || text === null) {
    return "";
  }
  return decodeHtmlEntities(String(text)).replace(/\s+/g, " ").trim();
}

function stripHtml(html) {
  if (html === undefined || html === null) {
    return "";
  }
  return cleanText(String(html).replace(/<[^>]*>/g, " "));
}

function getResponseHeader(response, name) {
  if (!response) return "";
  let lower = String(name).toLowerCase();
  if (response.header && typeof response.header === "function") {
    return response.header(name) || response.header(lower) || "";
  }
  if (response.headers) {
    if (typeof response.headers.get === "function") {
      return response.headers.get(name) || response.headers.get(lower) || "";
    }
    return response.headers[name] || response.headers[lower] || "";
  }
  return "";
}

function cleanChapterContent(html) {
  if (html === undefined || html === null) {
    return "";
  }

  let text = String(html);

  // 1. Sửa các ký tự escape dấu ngoặc kép bọc trong chuỗi JSON của WordPress
  text = text.replace(/\\\\\\"/g, '"').replace(/\\\\"/g, '"').replace(/\\"/g, '"');

  // 2. Loại bỏ script/style và chuẩn hóa xuống dòng
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 3. Chuẩn hóa các thẻ br/p thành <br/> và loại bỏ các thẻ HTML/CSS thừa
  text = text.replace(/<br\s*\/?>/gi, "<br/>");
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, "<br/><br/>");
  text = text.replace(/<p[^>]*>/gi, "").replace(/<\/p>/gi, "<br/>");
  text = text.replace(/<(?!br\s*\/?>)[^>]+>/gi, "");

  // 4. Giới hạn số lượng thẻ br liền nhau tối đa là 2
  text = text.replace(/(<br\/>\s*){3,}/g, "<br/><br/>");

  // 5. Giải mã các ký tự thực thể HTML phổ biến
  text = decodeHtmlEntities(text);

  // 6. Loại bỏ khoảng trống và thẻ br thừa ở đầu/cuối
  text = text.trim().replace(/^(<br\/>\s*)+/, "").replace(/(<br\/>\s*)+$/, "");

  return text;
}

function cleanDescription(html) {
  if (html === undefined || html === null) {
    return "";
  }

  let text = String(html);

  // 1. Loại bỏ script/style và chuyển các tag khối thành newline \n
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n");
  text = text.replace(/<p[^>]*>/gi, "").replace(/<\/p>/gi, "\n");
  text = text.replace(/<div[^>]*>/gi, "").replace(/<\/div>/gi, "\n");
  text = text.replace(/<[^>]*>/g, " ");

  // 2. Chuẩn hóa literal "/r/n", "/n", "\r\n", "\n" thành newline "\n"
  text = text.replace(/\/r\/n/gi, "\n").replace(/\/n/gi, "\n");
  text = text.replace(/\\r\\n/gi, "\n").replace(/\\n/gi, "\n");

  // 3. Giải mã thực thể HTML và thu gọn dấu gạch ngang dài
  text = decodeHtmlEntities(text);
  text = text.replace(/—{3,}/g, "—————");

  // 4. Chuẩn hóa từng dòng và xuất ra <br/> để vBook hiển thị xuống dòng chuẩn
  let lines = text.split("\n");
  let cleanedLines = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/[ \t]+/g, " ").trim();
    cleanedLines.push(line);
  }

  text = cleanedLines.join("<br/>").trim();
  text = text.replace(/(<br\/>\s*){3,}/g, "<br/><br/>");
  text = text.replace(/^(<br\/>\s*)+/, "").replace(/(<br\/>\s*)+$/, "");

  return text;
}

function getSlugFromUrl(url) {
  if (!url) return "";
  var cleanUrl = String(url).replace(/[?#].*$/, "").replace(/\/+$/, "");
  var parts = cleanUrl.split("/");
  return parts[parts.length - 1];
}

function getTitleText(item) {
  if (!item || !item.title) return "";
  if (typeof item.title === "string") {
    return cleanText(item.title);
  }
  if (item.title.rendered) {
    return stripHtml(item.title.rendered);
  }
  return cleanText(item.title);
}

function extractCoverUrl(item) {
  if (!item) return "";

  if (item._embedded && item._embedded["wp:featuredmedia"] && item._embedded["wp:featuredmedia"][0]) {
    return item._embedded["wp:featuredmedia"][0].source_url || "";
  }

  return item.cover || "";
}

function collectTerms(item, taxonomies) {
  var list = [];
  if (!item || !item._embedded || !item._embedded["wp:term"]) {
    return list;
  }

  var groups = item._embedded["wp:term"];
  for (var i = 0; i < groups.length; i++) {
    var termGroup = groups[i];
    if (!Array.isArray(termGroup)) {
      continue;
    }

    for (var j = 0; j < termGroup.length; j++) {
      var term = termGroup[j];
      if (taxonomies && taxonomies.length > 0 && taxonomies.indexOf(term.taxonomy) === -1) {
        continue;
      }
      list.push(term);
    }
  }

  return list;
}

function extractAuthorName(item) {
  var authorTerms = collectTerms(item, ["author_tax"]);
  if (authorTerms.length > 0 && authorTerms[0].name) {
    return authorTerms[0].name;
  }

  if (item && item._embedded && item._embedded.author && item._embedded.author[0]) {
    return item._embedded.author[0].name || "Đang cập nhật";
  }

  if (item && typeof item.author === "string" && cleanText(item.author)) {
    return cleanText(item.author);
  }

  if (item && item.author && typeof item.author.name === "string" && cleanText(item.author.name)) {
    return cleanText(item.author.name);
  }

  return "Đang cập nhật";
}

function parseApiList(data) {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.chapters)) {
    return data.chapters;
  }
  if (data && Array.isArray(data.results)) {
    return data.results;
  }
  if (data && Array.isArray(data.data)) {
    return data.data;
  }
  if (data && Array.isArray(data.items)) {
    return data.items;
  }
  return [];
}

function buildMangaLink(slug) {
  return BASE_URL + "/truyen/" + slug + "/";
}

function fetchMangaByUrl(url, withEmbed) {
  let embedQuery = withEmbed ? "_embed=wp:featuredmedia,author,wp:term" : "";
  if (url && /^\d+$/.test(String(url).trim())) {
    let idUrl = API_URL + "/wp/v2/manga/" + String(url).trim() + (embedQuery ? "?" + embedQuery : "");
    let idRes = fetchApi(idUrl);
    if (!idRes.ok) return { ok: false, status: idRes.status, item: null };
    let idItem = idRes.json();
    if (!idItem || !idItem.id) return { ok: true, status: 200, item: null };
    return { ok: true, status: 200, item: idItem };
  }

  let slug = getSlugFromUrl(url);
  if (!slug) {
    return { ok: false, status: 0, item: null, invalidUrl: true };
  }

  let slugUrl = API_URL + "/wp/v2/manga?slug=" + encodeURIComponent(slug) + (embedQuery ? "&" + embedQuery : "");
  let response = fetchApi(slugUrl);
  if (!response.ok) {
    return { ok: false, status: response.status, item: null };
  }

  let data = response.json();
  if (Array.isArray(data) && data.length > 0) {
    return { ok: true, status: 200, item: data[0] };
  }

  // Fallback when WP ?slug= returns [] for some newly published/cached posts
  let searchQuery = slug.replace(/-/g, " ");
  let searchUrl = API_URL + "/wp/v2/manga?search=" + encodeURIComponent(searchQuery) + "&per_page=10" + (embedQuery ? "&" + embedQuery : "");
  let searchRes = fetchApi(searchUrl);
  if (searchRes.ok) {
    let searchData = searchRes.json();
    if (Array.isArray(searchData)) {
      for (let i = 0; i < searchData.length; i++) {
        if (searchData[i] && searchData[i].slug === slug) {
          return { ok: true, status: 200, item: searchData[i] };
        }
      }
    }
  }

  return { ok: true, status: 200, item: null };
}
