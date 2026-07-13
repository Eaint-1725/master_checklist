// Parses a numeric contract term that may appear as digits only ("75
// days"), words only ("seventy-five days"), or the common "word (digit)"
// form ("fourteen (14) days") — preferring the digit in parentheses when
// both are present, since that's the least ambiguous representation.

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

function wordsToNumber(text: string): number | null {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token in TENS) {
      const next = tokens[i + 1];
      if (next && next in ONES && ONES[next] < 10) {
        return TENS[token] + ONES[next];
      }
      return TENS[token];
    }
    if (token in ONES) {
      return ONES[token];
    }
  }
  return null;
}

/**
 * Extracts a single integer from a raw contract-term phrase. Returns null
 * when nothing parseable is found.
 */
export function parseWordOrDigitNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;

  const parenMatch = text.match(/\((\d+)\)/);
  if (parenMatch) return Number(parenMatch[1]);

  const digitMatch = text.match(/\d+/);
  if (digitMatch) return Number(digitMatch[0]);

  return wordsToNumber(text);
}
