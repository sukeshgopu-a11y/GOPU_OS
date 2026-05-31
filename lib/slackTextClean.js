const replacements = [
  ["â€”", "-"],
  ["â€“", "-"],
  ["â†’", "->"],
  ["â‰¤", "<="],
  ["â‰¥", ">="],
  ["â‚¹", "Rs."],
  ["Â·", "-"],
  ["â€¢", "-"],
  ["â”", "-"],
  ["âœ…", ":white_check_mark:"],
  ["âœ“", ":white_check_mark:"],
  ["âœ—", ":x:"],
  ["âŒ", ":x:"],
  ["âš ï¸", ":warning:"],
  ["âš ", ":warning:"],
  ["â³", ":hourglass_flowing_sand:"],
  ["ðŸ’°", ":moneybag:"],
  ["ðŸ“‹", ":clipboard:"],
  ["ðŸ“£", ":mega:"],
  ["ðŸ“§", ":email:"],
  ["ðŸ“Š", ":bar_chart:"],
  ["ðŸ“…", ":calendar:"],
  ["ðŸŒ…", ":sunrise:"],
  ["ðŸŒ™", ":crescent_moon:"],
  ["ðŸ’¡", ":bulb:"],
  ["ðŸ”", ":mag:"],
  ["ðŸ–¥ï¸", ":desktop_computer:"],
  ["âš™ï¸", ":gear:"],
  ["ðŸŸ¢", ":large_green_circle:"],
  ["ðŸŸ¡", ":large_yellow_circle:"],
  ["1ï¸âƒ£", "1."],
  ["2ï¸âƒ£", "2."],
  ["3ï¸âƒ£", "3."],
  ["4ï¸âƒ£", "4."],
  ["5ï¸âƒ£", "5."],
  ["6ï¸âƒ£", "6."],
  ["7ï¸âƒ£", "7."]
];

export function cleanSlackText(value = "") {
  let text = String(value || "");
  for (const [from, to] of replacements) {
    text = text.split(from).join(to);
  }
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function compactSlackValue(value = "", fallback = "Not recorded") {
  const cleaned = cleanSlackText(value);
  return cleaned || fallback;
}
