load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var response = fetchWithFallback(url);
    if (!response.ok) {
        return Response.error('HTTP Error: ' + response.status);
    }

    var rawHtml = response.text();
    var doc = Html.parse(rawHtml);

    // Priority 1: Try standard DOM content selectors
    var contentEl = doc.select('#read-content').first();
    if (!contentEl || !contentEl.html() || contentEl.html().length < 100) {
        contentEl = doc.select('#chapter-content').first();
    }
    if (!contentEl || !contentEl.html() || contentEl.html().length < 100) {
        contentEl = doc.select('.content-chap').first();
    }
    if (!contentEl || !contentEl.html() || contentEl.html().length < 100) {
        contentEl = doc.select('.chapter-c').first();
    }

    if (contentEl && contentEl.html() && contentEl.html().length >= 100) {
        contentEl.select('.slide').remove();
        var data = cleanHtml(contentEl.html());
        return Response.success(data);
    }

    // Priority 2: Extract Next.js RSC stream payload from script tags
    var nextData = extractNextContent(rawHtml);
    if (nextData && nextData.length > 50) {
        return Response.success(cleanHtml(nextData));
    }

    return Response.error('Không lấy được nội dung chương. Vui lòng kiểm tra trang nguồn.');
}

function cleanRscSuffix(text) {
    if (!text) return '';
    
    var cutIdx = text.search(/\d+:\[/);
    if (cutIdx > 0) text = text.substring(0, cutIdx);

    cutIdx = text.search(/\d+:\{/);
    if (cutIdx > 0) text = text.substring(0, cutIdx);

    cutIdx = text.search(/","[a-zA-Z0-9_]+":/);
    if (cutIdx > 0) text = text.substring(0, cutIdx);

    cutIdx = text.search(/",\{"slug":/);
    if (cutIdx > 0) text = text.substring(0, cutIdx);

    return text.trim();
}

function extractNextContent(rawHtml) {
    if (!rawHtml) return '';
    var candidates = [];
    var regex = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g;

    function processContent(contentStr) {
        var match;
        while ((match = regex.exec(contentStr)) !== null) {
            var raw = match[1];
            
            var decoded = '';
            try {
                decoded = JSON.parse('"' + raw + '"');
            } catch (err) {
                continue;
            }

            // Next.js RSC payload encodes strings with actual newlines.
            // Split by the boundary \n[0-9a-f]+: to separate independent React nodes,
            // while keeping internal newlines inside the chapter text node intact.
            var chunks = decoded.split(/\n[0-9a-f]+:/i);
            
            for (var i = 0; i < chunks.length; i++) {
                var chunk = chunks[i];
                
                // Clean Next.js Text node prefix e.g. "T3911," or just string prefix
                var cleaned = chunk.replace(/^T[0-9a-f]+,?"?/i, '');
                
                cleaned = cleanRscSuffix(cleaned);
                
                // Remove trailing quote if any
                if (cleaned.length > 0 && cleaned.charAt(cleaned.length - 1) === '"') {
                    cleaned = cleaned.substring(0, cleaned.length - 1);
                }
                
                if (cleaned.length > 500) {
                    candidates.push(cleaned);
                }
            }
        }
    }

    // Extract script tags manually to bypass JSoup escape corruption
    var startIndex = 0;
    while (true) {
        var startTag = rawHtml.indexOf('<script', startIndex);
        if (startTag === -1) break;
        var endTag = rawHtml.indexOf('</script>', startTag);
        if (endTag === -1) break;
        
        var scriptContent = rawHtml.substring(startTag, endTag);
        startIndex = endTag;

        if (scriptContent.indexOf('self.__next_f.push') >= 0) {
            processContent(scriptContent);
        }
    }

    if (candidates.length > 0) {
        candidates.sort(function(a, b) {
            return b.length - a.length;
        });
        return candidates[0];
    }

    return '';
}

function cleanHtml(htm) {
    if (!htm) return '';
    return htm
        .replace(/·/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/<p>\s*(?:&nbsp;)?\s*<\/p>/gi, '')
        .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .trim();
}