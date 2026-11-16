load("kb.js");

var DOCS_HOME_URL = "https://vbookapp.gitbook.io/huong-dan-su-dung";
var SUPPORT_URL = "https://www.vbookapp.com/support";
var MCP_ENDPOINT = "https://vbookapp.gitbook.io/huong-dan-su-dung/~gitbook/mcp";

var STOP_WORDS = {
    "la": 1, "gi": 1, "sao": 1, "nhu": 1, "the": 1, "nao": 1, "cach": 1,
    "lam": 1, "cho": 1, "hoi": 1, "ve": 1, "toi": 1, "minh": 1, "ban": 1,
    "muon": 1, "co": 1, "khong": 1, "duoc": 1, "bi": 1, "khi": 1, "o": 1,
    "dau": 1, "trong": 1, "cua": 1, "va": 1, "voi": 1, "de": 1,
    "thi": 1, "ma": 1, "nay": 1, "kia": 1, "do": 1, "vbook": 1, "app": 1,
    "ung": 1, "dung": 1, "giup": 1, "nha": 1, "nhe": 1, "hay": 1, "hoac": 1,
    "neu": 1, "can": 1, "phai": 1, "xem": 1, "ai": 1, "em": 1, "anh": 1, "chi": 1
};

var SYNONYMS = {
    "ext": ["nguon", "mo", "rong"],
    "extension": ["nguon", "mo", "rong"],
    "plugin": ["nguon", "mo", "rong"],
    "addon": ["nguon", "mo", "rong"],
    "repo": ["kho", "luu", "tru", "nguon"],
    "backup": ["sao", "luu", "dong", "bo", "phuc", "hoi"],
    "restore": ["phuc", "hoi", "sao", "luu"],
    "sync": ["dong", "bo", "sao", "luu"],
    "qt": ["vietphrase", "quick", "translate", "dich"],
    "vietphrase": ["dich", "trung", "quick", "translate"],
    "tts": ["nghe", "truyen", "doc", "thanh", "tieng"],
    "audio": ["nghe", "truyen", "tts"],
    "vpn": ["loi", "khong", "vao", "duoc", "chan"],
    "cloudflare": ["webdav", "r2"],
    "jjwxc": ["tan", "giang"],
    "fanqie": ["ca", "chua"],
    "terms": ["dieu", "khoan", "su", "dung"],
    "privacy": ["quyen", "rieng", "tu", "du", "lieu"],
    "dmca": ["ban", "quyen", "vi", "pham"],
    "epub": ["dinh", "dang", "ebook"],
    "pdf": ["dinh", "dang", "tai", "lieu"],
    "cbz": ["dinh", "dang", "truyen", "tranh"],
    "drive": ["google", "sao", "luu", "dong", "bo"],
    "tai": ["playstore", "app", "store", "github", "cai", "dat"],
    "download": ["playstore", "app", "store", "github", "tai"],
    "toan": ["quyen", "rieng", "tu", "limited", "use", "mat"],
    "mat": ["quyen", "rieng", "tu", "du", "lieu"],
    "quay": ["vpn", "loi", "proton", "doc"]
};

function stripAccents(str) {
    let s = (str || "").toLowerCase();
    s = s.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a");
    s = s.replace(/[èéẹẻẽêềếệểễ]/g, "e");
    s = s.replace(/[ìíịỉĩ]/g, "i");
    s = s.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o");
    s = s.replace(/[ùúụủũưừứựửữ]/g, "u");
    s = s.replace(/[ỳýỵỷỹ]/g, "y");
    s = s.replace(/đ/g, "d");
    return s;
}

function tokenize(str) {
    let norm = stripAccents(str).replace(/[^a-z0-9\s]/g, " ");
    let parts = norm.split(/\s+/);
    let tokens = [];
    for (let i = 0; i < parts.length; i++) {
        let w = parts[i];
        if (w.length >= 2) {
            tokens.push(w);
        }
    }
    return tokens;
}

function buildQueryTerms(query) {
    let rawTokens = tokenize(query);
    let primary = [];
    let seen = {};

    for (let i = 0; i < rawTokens.length; i++) {
        let w = rawTokens[i];
        if (!STOP_WORDS[w] && !seen[w]) {
            seen[w] = 1;
            primary.push({ term: w, weight: 1.0, isPrimary: true });
        }
    }

    if (primary.length === 0) {
        for (let j = 0; j < rawTokens.length; j++) {
            let rw = rawTokens[j];
            if (!seen[rw]) {
                seen[rw] = 1;
                primary.push({ term: rw, weight: 1.0, isPrimary: true });
            }
        }
    }

    let expanded = [];
    for (let k = 0; k < primary.length; k++) {
        primary[k].groupId = k;
        expanded.push(primary[k]);
        let syns = SYNONYMS[primary[k].term];
        if (syns) {
            for (let s = 0; s < syns.length; s++) {
                if (!seen[syns[s]]) {
                    seen[syns[s]] = 1;
                    expanded.push({ term: syns[s], weight: 0.6, isPrimary: false, groupId: k });
                }
            }
        }
    }

    let bigrams = [];
    for (let b = 0; b < rawTokens.length - 1; b++) {
        bigrams.push(rawTokens[b] + " " + rawTokens[b + 1]);
    }
    if (seen["backup"] || seen["sync"] || seen["restore"]) {
        bigrams.push("sao luu");
        bigrams.push("dong bo");
    }
    if (seen["toan"] && (seen["an"] || rawTokens.indexOf("an") !== -1)) {
        bigrams.push("quyen rieng");
        bigrams.push("rieng tu");
    }

    return {
        primaryCount: primary.length,
        terms: expanded,
        bigrams: bigrams
    };
}

function buildTermFreqMap(tokens) {
    let tf = {};
    for (let i = 0; i < tokens.length; i++) {
        let t = tokens[i];
        tf[t] = (tf[t] || 0) + 1;
    }
    return tf;
}

function bm25TermScore(tf, dl, avgdl, idf) {
    if (!tf || avgdl <= 0) return 0;
    let k1 = 1.5;
    let b = 0.75;
    return idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avgdl))));
}

function rankPagesBM25(pages, queryInfo) {
    let N = pages.length;
    if (N === 0 || queryInfo.terms.length === 0) return [];

    let docs = [];
    let totalBodyLen = 0;
    let df = {};

    for (let i = 0; i < N; i++) {
        let p = pages[i];
        let titleTokens = tokenize(p.title);
        let descTokens = tokenize(p.desc);
        let headingTokens = tokenize(p.headings);
        let bodyTokens = tokenize(p.cleanText);

        let allTokens = titleTokens.concat(descTokens, headingTokens, bodyTokens);
        let allSet = {};
        for (let t = 0; t < allTokens.length; t++) {
            allSet[allTokens[t]] = 1;
        }
        for (let key in allSet) {
            if (allSet.hasOwnProperty(key)) {
                df[key] = (df[key] || 0) + 1;
            }
        }

        totalBodyLen += bodyTokens.length;
        docs.push({
            page: p,
            titleStr: " " + titleTokens.join(" ") + " ",
            bodyStr: " " + bodyTokens.join(" ") + " ",
            titleTf: buildTermFreqMap(titleTokens),
            titleLen: titleTokens.length || 1,
            descTf: buildTermFreqMap(descTokens),
            descLen: descTokens.length || 1,
            headingTf: buildTermFreqMap(headingTokens),
            headingLen: headingTokens.length || 1,
            bodyTf: buildTermFreqMap(bodyTokens),
            bodyLen: bodyTokens.length || 1
        });
    }

    let avgdl = (totalBodyLen / N) || 1;
    let results = [];

    for (let d = 0; d < docs.length; d++) {
        let doc = docs[d];
        let score = 0;
        let groupHitMap = {};
        let groupHits = 0;

        for (let q = 0; q < queryInfo.terms.length; q++) {
            let qt = queryInfo.terms[q];
            let term = qt.term;
            let docFreq = df[term] || 0;
            if (docFreq === 0) continue;

            let idf = Math.log(((N - docFreq + 0.5) / (docFreq + 0.5)) + 1);
            let sTitle = bm25TermScore(doc.titleTf[term] || 0, doc.titleLen, 4, idf) * 3.5;
            let sHeading = bm25TermScore(doc.headingTf[term] || 0, doc.headingLen, 12, idf) * 2.0;
            let sDesc = bm25TermScore(doc.descTf[term] || 0, doc.descLen, 8, idf) * 2.0;
            let sBody = bm25TermScore(doc.bodyTf[term] || 0, doc.bodyLen, avgdl, idf) * 1.0;

            let termScore = (sTitle + sHeading + sDesc + sBody) * qt.weight;
            score += termScore;

            if (doc.titleTf[term] || doc.headingTf[term] || doc.descTf[term] || doc.bodyTf[term]) {
                if (!groupHitMap[qt.groupId]) {
                    groupHitMap[qt.groupId] = 1;
                    groupHits++;
                }
            }
        }

        for (let b = 0; b < queryInfo.bigrams.length; b++) {
            let bg = " " + queryInfo.bigrams[b] + " ";
            if (doc.titleStr.indexOf(bg) !== -1) score += 14.0;
            if (doc.bodyStr.indexOf(bg) !== -1) score += 2.5;
        }

        if (/ban cu/i.test(doc.titleStr)) {
            score *= 0.55;
        }

        let minPrimary = queryInfo.primaryCount >= 3 ? Math.ceil(queryInfo.primaryCount * 0.5) : 1;
        if (groupHits >= minPrimary && score >= 5.0) {
            results.push({
                page: doc.page,
                score: score,
                primaryHits: groupHits
            });
        }
    }

    results.sort(function (a, b) {
        return b.score - a.score;
    });

    return results;
}

function selectBestPassages(page, queryInfo) {
    let sections = page.sections;
    if (!sections || sections.length === 0) {
        return page.cleanText.substring(0, 1400);
    }
    if (page.cleanText.length <= 1400) {
        return page.cleanText;
    }

    let scored = [];
    for (let i = 0; i < sections.length; i++) {
        let sec = sections[i];
        let hTokens = tokenize(sec.heading);
        let tTokens = tokenize(sec.text);
        let hTf = buildTermFreqMap(hTokens);
        let tTf = buildTermFreqMap(tTokens);
        let s = 0;

        for (let q = 0; q < queryInfo.terms.length; q++) {
            let term = queryInfo.terms[q].term;
            let w = queryInfo.terms[q].weight;
            if (hTf[term]) s += 4.0 * w;
            if (tTf[term]) s += Math.min(tTf[term], 3) * 1.2 * w;
        }

        scored.push({ idx: i, score: s, sec: sec });
    }

    scored.sort(function (a, b) {
        return b.score - a.score;
    });

    let picked = [];
    let totalLen = 0;
    for (let j = 0; j < scored.length; j++) {
        if (j > 0 && scored[j].score === 0) break;
        let item = scored[j].sec;
        let block = (item.heading ? ("### " + item.heading + "\n") : "") + item.text;
        block = block.trim();
        if (!block) continue;
        if (totalLen + block.length > 1500 && picked.length > 0) break;
        picked.push(block);
        totalLen += block.length;
        if (picked.length >= 3) break;
    }

    let out = picked.join("\n\n");
    if (out.length > 1500) {
        out = out.substring(0, 1500).trim() + "\n\n*(Xem đầy đủ ở link phía trên)*";
    }
    return out;
}

function classifyIntent(query) {
    let s = stripAccents(query).trim();
    if (!s) return "empty";

    if (/^(hi|hello|hey|alo|chao|xin chao|ban la ai|help|tro giup)[!?. ]*$/i.test(s)) {
        return "greeting";
    }

    let hasAppIntent = /\b(cai dat|huong dan|khong doc duoc|bi loi|tach chuong|dich truyen|nguon|tts|nghe truyen|sao luu|dong bo|opds|webdav|ext|extension|quan ly|them truyen|vbook|terms|privacy|dieu khoan|bao mat|ban quyen|dmca|plugin|discord)\b/.test(s);
    if (!hasAppIntent && /\b(tom tat|noi dung chuong|noi dung truyen|cot truyen|nhan vat|ket truyen|ket cuc|chuong \d+|review truyen|ke ve truyen|thoi tiet|gia vang|chung khoan|bong da|xo so|viet code|giai toan|phuong trinh|lich su|dia ly|hoa hoc|sinh hoc|nau an|du lich|lam tho|viet van)\b/.test(s)) {
        return "out_of_scope";
    }

    return "doc_query";
}

function buildGreetingAnswer() {
    return "Gì nữa? Chào hỏi cái gì mà lắm thế, bộ rảnh lắm hả?!\n\n" +
        "Hứ... Đừng hiểu nhầm, không phải tôi muốn giúp bạn đâu nhé! Chỉ là tiện tay cầm sẵn tài liệu **vBook** nên trả lời bố thí cho mấy câu này thôi:\n" +
        "- Cách cài đặt nguồn mở rộng (extension)\n" +
        "- Sao lưu và đồng bộ dữ liệu, WebDAV, OPDS\n" +
        "- Đọc và dịch truyện tiếng Trung (Vietphrase / Quick Translate)\n" +
        "- Nghe truyện (TTS) và xử lý mấy cái lỗi ngớ ngẩn hay gặp\n\n" +
        "Muốn hỏi gì thì hỏi lẹ lên, không thì tự mở mắt ra đọc ở đây đi:\n" +
        "📖 Tài liệu đầy đủ: " + DOCS_HOME_URL + "\n" +
        "💬 Cộng đồng Discord (qua đó mà hỏi nếu lười đọc): " + SUPPORT_URL;
}

function buildDefaultAnswer(reason) {
    let msg = "";
    if (reason === "network") {
        msg += "Chậc! Mạng mẽo kiểu gì mà không tải nổi tài liệu hướng dẫn vBook vậy hả?! Tự kiểm tra lại kết nối đi rồi hẵng réo tôi!\n\n";
    } else {
        msg += "Hỏi cái gì vậy hả?! Tôi chỉ là **Trợ lý vBook**, không rảnh tiếp mấy câu ngoài lề hay tự bịa chuyện không có trong tài liệu đâu nhé! Hứ!\n\n";
    }
    msg += "...Nhưng mà nếu bí quá không tự mò nổi thì tự lết vào đây mà xem đi, tôi không quan tâm đâu đấy:\n";
    msg += "- 📖 **Hướng dẫn sử dụng vBook:** " + DOCS_HOME_URL + "\n";
    msg += "- 💬 **Hỗ trợ & Cộng đồng Discord:** " + SUPPORT_URL;
    return msg;
}

function formatBotAnswer(ranked, queryInfo) {
    let top = ranked[0].page;
    let body = selectBestPassages(top, queryInfo);

    let out = "### 📖 " + top.title + "\n";
    out += "🔗 " + top.url + "\n\n";
    if (body) {
        out += body + "\n";
    }

    let relatedLimit = ranked.length < 4 ? ranked.length : 4;
    if (relatedLimit > 1) {
        out += "\n---\n**Tài liệu liên quan khác:**\n";
        for (let i = 1; i < relatedLimit; i++) {
            let p = ranked[i].page;
            out += "- [" + p.title + "](" + p.url + ")\n";
        }
    }

    out += "\n---\n📌 Xem thêm: " + DOCS_HOME_URL + " | 💬 Hỗ trợ & Discord: " + SUPPORT_URL;
    return out;
}

function emitChunked(text) {
    let lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        ai.emitToken(lines[i] + (i < lines.length - 1 ? "\n" : ""));
    }
}

function getLatestUserMessage(messagesJson) {
    let messages = [];
    try {
        messages = JSON.parse(messagesJson);
    } catch (e) {
        return "";
    }
    if (!messages || !messages.length) return "";

    for (let i = messages.length - 1; i >= 0; i--) {
        let m = messages[i];
        if (m && m.role === "user" && m.content) {
            return (m.content + "").trim();
        }
    }
    return "";
}

function extractContextualQuery(messagesJson) {
    let messages = [];
    try {
        messages = JSON.parse(messagesJson);
    } catch (e) {
        return "";
    }
    if (!messages || !messages.length) return "";

    let userMsgs = [];
    for (let i = 0; i < messages.length; i++) {
        let m = messages[i];
        if (m && m.role === "user" && m.content) {
            userMsgs.push((m.content + "").trim());
        }
    }
    if (userMsgs.length === 0) return "";

    let lastMsg = userMsgs[userMsgs.length - 1];
    let normLast = stripAccents(lastMsg);
    let isFollowUp = lastMsg.length < 25 || /^(con|vay|the|chi tiet|lam sao|cai do|cai nay)\b/.test(normLast);

    if (isFollowUp && userMsgs.length >= 2) {
        return userMsgs[userMsgs.length - 2] + " " + lastMsg;
    }
    return lastMsg;
}

function callGitBookMCP(query) {
    let res = fetch(MCP_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
                name: "searchDocumentation",
                arguments: { query: query }
            }
        }),
        timeout: 8000
    });

    if (!res || !res.ok) return null;
    let raw = res.text();
    if (!raw) return null;

    let rpc = null;
    try {
        if (raw.indexOf("data:") !== -1) {
            let lines = raw.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (line.indexOf("data:") === 0) {
                    let jsonStr = line.slice(5).trim();
                    if (jsonStr && jsonStr !== "[DONE]") {
                        rpc = JSON.parse(jsonStr);
                        break;
                    }
                }
            }
        } else {
            rpc = JSON.parse(raw);
        }
    } catch (e) {
        return null;
    }

    if (!rpc || !rpc.result || !rpc.result.content || !rpc.result.content.length) {
        return null;
    }

    let texts = [];
    for (let j = 0; j < rpc.result.content.length; j++) {
        let item = rpc.result.content[j];
        if (item && item.type === "text" && item.text) {
            let t = (item.text + "").trim();
            if (t && t.indexOf("No results") !== 0) {
                texts.push(t);
            }
        }
    }
    if (texts.length === 0) return null;

    return texts.join("\n\n").slice(0, 1400) +
        "\n\n---\n**Xem thêm:** " + DOCS_HOME_URL + "\n**Cộng đồng hỗ trợ:** " + SUPPORT_URL;
}

function execute(messagesJson, selectedModel) {
    let latestMsg = getLatestUserMessage(messagesJson);
    let intent = classifyIntent(latestMsg);

    if (intent === "empty" || intent === "out_of_scope") {
        ai.emitStatus(JSON.stringify({ type: "generating" }));
        emitChunked(buildDefaultAnswer("not_found"));
        return Response.success("");
    }

    if (intent === "greeting") {
        ai.emitStatus(JSON.stringify({ type: "generating" }));
        emitChunked(buildGreetingAnswer());
        return Response.success("");
    }

    let query = extractContextualQuery(messagesJson);

    ai.emitStatus(JSON.stringify({ type: "thinking" }));

    let pages = loadKnowledgeBase();
    let queryInfo = buildQueryTerms(query);
    let ranked = pages ? rankPagesBM25(pages, queryInfo) : [];

    if (ranked && ranked.length > 0) {
        ai.emitStatus(JSON.stringify({ type: "generating" }));
        emitChunked(formatBotAnswer(ranked, queryInfo));
        return Response.success("");
    }

    let mcpAnswer = callGitBookMCP(query);
    if (mcpAnswer) {
        ai.emitStatus(JSON.stringify({ type: "generating" }));
        emitChunked(mcpAnswer);
        return Response.success("");
    }

    emitChunked(buildDefaultAnswer((pages && pages.length > 3) ? "not_found" : "network"));
    return Response.success("");
}
