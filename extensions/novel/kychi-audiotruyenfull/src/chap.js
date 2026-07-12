load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var doc = loadDocument(url);
    if (!doc) return Response.error("Không thể tải nội dung chương");
    
    var contentEl = doc.select(".reading-content .text-left, .text-left").first();
    if (contentEl) {
        contentEl.select("script, style, iframe, [id^=tts-], .c-content-readmore, .ads, .adsbygoogle, div[style*='z-index: 101']").remove();
        
        var firstEl = contentEl.select("p, h1, h2, h3, h4").first();
        if (firstEl) {
            var text = cleanText(firstEl.text());
            if (/^(chương|chap)\s*(\d+|:)/i.test(text)) {
                firstEl.remove();
            }
        }
        
        var html = contentEl.html();
        if (html && html.trim()) {
            return Response.success(html);
        }
    }
    
    return Response.error("Nội dung chương trống");
}
