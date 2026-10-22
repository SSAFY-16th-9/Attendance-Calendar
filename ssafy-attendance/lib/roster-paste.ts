// Reads a pasted roster, one person per line in either order: "홍길동 gildong", "gildong,홍길동", or two cells copied from a sheet.
// A header line such as "이름 아이디" is skipped.
export function parseRoster(text: string) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !(/이름/.test(line) && /아이디/.test(line))).map(line => {
    const cells = line.split(/[\t,;]+|\s+/).map(cell => cell.trim()).filter(Boolean);
    const username = cells.find(cell => /^[A-Za-z0-9._-]+$/.test(cell)) ?? "";
    return { name: cells.filter(cell => cell !== username).join(" "), username };
  });
}
