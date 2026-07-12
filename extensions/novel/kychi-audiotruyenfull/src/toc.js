load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    
    // 1. Try direct POST fetch first (using fetchPage for proper headers)
    try {
        var response = fetchPage(url + "ajax/chapters/", { method: "POST" });
        if (response.ok) {
            var els = response.html().select("li.wp-manga-chapter a");
            var chapters = parseChapters(els);
            if (chapters.length > 0) return Response.success(chapters);
        }
    } catch (e) {}
    
    // 2. Fallback to Browser context if direct fetch is blocked by Cloudflare or fails
    if (typeof Engine !== 'undefined' && Engine && typeof Engine.newBrowser === 'function') {
        var browser = null;
        try {
            browser = Engine.newBrowser();
            browser.setUserAgent(BASE_UA);
            var page = browser.launch(url, 15000); // Load story page first to solve Cloudflare challenge
            if (page) {
                // Wait for Cloudflare challenge to be solved
                var html = "";
                var retries = 10;
                var els = null;
                while (retries > 0) {
                    html = browser.callJs("document.documentElement.outerHTML", 5000) || "";
                    if (html.indexOf("Just a moment") === -1 && html.indexOf("DDoS protection") === -1) {
                        // Check if chapters are already loaded/rendered in the page DOM
                        var doc = Html.parse(html);
                        var tempEls = doc.select("li.wp-manga-chapter a");
                        if (getSize(tempEls) > 0) {
                            els = tempEls;
                            break;
                        }
                    }
                    sleep(1000);
                    retries--;
                }
                
                var chapters = [];
                if (els && getSize(els) > 0) {
                    chapters = parseChapters(els);
                } else {
                    // Try executing POST request inside browser context (uses cookies bypass Cloudflare)
                    var js = "var xhr = new XMLHttpRequest();" +
                             "xhr.open('POST', '" + url + "ajax/chapters/', false);" +
                             "xhr.send();" +
                             "xhr.responseText;";
                    var ajaxHtml = browser.callJs(js, 8000);
                    if (ajaxHtml) {
                        var elsAjax = Html.parse(ajaxHtml).select("li.wp-manga-chapter a");
                        chapters = parseChapters(elsAjax);
                    }
                }
                
                if (browser.close) browser.close();
                if (chapters.length > 0) return Response.success(chapters);
            } else {
                if (browser.close) browser.close();
            }
        } catch (e) {
            if (browser && browser.close) browser.close();
        }
    }
    
    return Response.error("Không tìm thấy chương nào.");
}

function parseChapters(els) {
    var chapters = [];
    var size = getSize(els);
    if (size === 0) return chapters;
    
    for (var i = 0; i < size; i++) {
        var a = getElement(els, i);
        if (!a) continue;
        
        var name = cleanText(a.text()).replace(/^\d+\.\s*/, "");
        var href = normalizeUrl(a.attr("href"));
        if (name && href) {
            chapters.push({
                name: name,
                url: href,
                host: BASE_URL
            });
        }
    }
    chapters.reverse();
    return chapters;
}
