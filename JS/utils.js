// utils.js
export async function fetchJSON(url, signal = null) {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// utils.js (añadir al final)

export function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const normalizedText = removeAccents(text.toLowerCase());
    const normalizedQuery = removeAccents(query.toLowerCase());
    const matches = [];
    let searchFrom = 0;
    while (searchFrom < normalizedText.length) {
        const index = normalizedText.indexOf(normalizedQuery, searchFrom);
        if (index === -1) break;
        matches.push({ start: index, end: index + normalizedQuery.length });
        searchFrom = index + 1;
    }
    if (matches.length === 0) return escapeHtml(text);
    let result = '', lastEnd = 0;
    for (const m of matches) {
        result += escapeHtml(text.substring(lastEnd, m.start));
        result += `<mark class="search-highlight">${escapeHtml(text.substring(m.start, m.end))}</mark>`;
        lastEnd = m.end;
    }
    return result + escapeHtml(text.substring(lastEnd));
}

export function highlightExactWord(text, query) {
    if (!query) return escapeHtml(text);
    const normalizedText = removeAccents(text.toLowerCase());
    const normalizedQuery = removeAccents(query.toLowerCase().trim());
    const regex = new RegExp(`\\b${escapeRegExp(normalizedQuery)}\\b`, 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(normalizedText)) !== null) {
        matches.push({ start: match.index, end: match.index + normalizedQuery.length });
    }
    if (matches.length === 0) return escapeHtml(text);
    let result = '', lastEnd = 0;
    for (const m of matches) {
        result += escapeHtml(text.substring(lastEnd, m.start));
        result += `<mark class="search-highlight">${escapeHtml(text.substring(m.start, m.end))}</mark>`;
        lastEnd = m.end;
    }
    return result + escapeHtml(text.substring(lastEnd));
}

export function isExactWordMatch(text, query) {
    const normalized = removeAccents(text.toLowerCase());
    const normalizedQ = removeAccents(query.toLowerCase().trim());
    const regex = new RegExp(`\\b${escapeRegExp(normalizedQ)}\\b`, 'i');
    return regex.test(normalized);
}
