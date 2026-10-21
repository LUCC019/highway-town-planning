import { escapeHtml } from "./site.js?v=20260923-7";

function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function cells(line) {
  const result = [];
  let value = "", quoted = false, escaped = false;
  for (const character of line.trim().replace(/^\|/, "").replace(/\|$/, "")) {
    if (escaped) { value += character; escaped = false; continue; }
    if (character === "\\") { escaped = true; continue; }
    if (character === "`") quoted = !quoted;
    if (character === "|" && !quoted) { result.push(value.trim()); value = ""; }
    else value += character;
  }
  result.push(value.trim());
  return result;
}

function tableInline(text) {
  return text.split(/<br\s*\/?>/i).map(inline).join("<br>");
}

export function renderRetailDocument(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const output = [];
  let sectionOpen = false;
  const isBlock = (line) => !line.trim() || /^(#{1,4} |```|> |\| |[-*] |\d+\. )/.test(line);
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    const heading = line.match(/^(#{1,4}) (.+)$/);
    if (heading) {
      if (heading[1].length === 2) {
        if (sectionOpen) output.push("</section>");
        output.push('<section class="retail-document-section">');
        sectionOpen = true;
      }
      const tag = heading[1].length <= 2 ? "h2" : "h3";
      output.push(`<${tag}>${inline(heading[2])}</${tag}>`);
      index += 1; continue;
    }
    if (line.startsWith("```")) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      output.push(`<p class="retail-formula">${escapeHtml(code.join("\n"))}</p>`);
      index += 1; continue;
    }
    if (line.startsWith("> ")) {
      const quote = [];
      while (index < lines.length && lines[index].startsWith("> ")) quote.push(lines[index++].slice(2));
      output.push(`<aside class="retail-document-note">${quote.map(text => `<p>${inline(text)}</p>`).join("")}</aside>`);
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      while (index < lines.length && lines[index].startsWith("|")) rows.push(cells(lines[index++]));
      const columns = rows.shift();
      if (rows[0]?.every(value => /^:?-{3,}:?$/.test(value))) rows.shift();
      const wide = columns.length >= 6 ? " retail-wide-table" : "";
      let widths = Array(columns.length).fill(100 / columns.length);
      if (columns.length === 2) widths = columns[0] === "道具" ? [18, 82] : [40, 60];
      if (columns.length === 3) widths = columns[0] === "解锁日" ? [10, 28, 62] : columns[0] === "配置键" ? [30, 23, 47] : [28, 30, 42];
      if (columns.length === 6) widths = columns[0] === "商品ID" ? [8, 16, 8, 12, 14, 42] : [10, 18, 26, 10, 22, 14];
      const colgroup = `<colgroup>${widths.map(width => `<col style="width:${width}%">`).join("")}</colgroup>`;
      output.push(`<div class="shop-table-scroll"><table class="shop-business-table retail-document-table${wide}">${colgroup}<thead><tr>${columns.map(value => `<th>${inline(value)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map((_, cell) => `<td>${tableInline(row[cell] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^(?:[-*] |\d+\. )/.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const expression = ordered ? /^\d+\. / : /^[-*] /;
      const list = [];
      while (index < lines.length && expression.test(lines[index])) list.push(`<li>${inline(lines[index++].replace(expression, ""))}</li>`);
      output.push(`<${ordered ? "ol" : "ul"}>${list.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && !isBlock(lines[index])) paragraph.push(lines[index++]);
    output.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }
  if (sectionOpen) output.push("</section>");
  return output.join("\n");
}
