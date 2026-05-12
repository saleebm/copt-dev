export async function readLine(): Promise<string> {
  for await (const line of console) {
    return line;
  }
  return "";
}

export async function readBlock(
  endSentinels: readonly string[] = ["."]
): Promise<string> {
  const lines: string[] = [];
  for await (const line of console) {
    const trimmed = line.trim();
    if (endSentinels.includes(trimmed)) break;
    lines.push(line);
  }
  return lines.join("\n").trim();
}

export async function readChoice(
  prompt: string,
  validKeys: readonly string[]
): Promise<string> {
  while (true) {
    process.stdout.write(`${prompt} `);
    const raw = (await readLine()).trim().toLowerCase();
    if (validKeys.includes(raw)) return raw;
    console.log(`  → expected one of: ${validKeys.join(", ")}`);
  }
}
