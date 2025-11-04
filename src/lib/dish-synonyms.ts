// Synonym and normalization map for dish names to canonical labels
// Helps stabilize naming and improve nutrition lookup hit rate.

type Synonym = { pattern: RegExp; replace: string | ((m: RegExpMatchArray) => string) };

const SYNONYMS: Array<Synonym> = [
  // Pasta and Italian dishes
  { pattern: /spaghetti\s+(with\s+)?meat\s+sauce/i, replace: 'Spaghetti Bolognese' },
  { pattern: /bolognese/i, replace: 'Spaghetti Bolognese' },
  { pattern: /mac(\s+and\s+|\s*&\s*|\s*n\s*)cheese|mac\s*'?n\s*'?cheese/i, replace: 'Macaroni and Cheese' },
  { pattern: /lasagne?/i, replace: 'Lasagna' },
  { pattern: /carbonara/i, replace: 'Spaghetti Carbonara' },
  { pattern: /alfredo/i, replace: 'Fettuccine Alfredo' },

  // Burgers and fries
  { pattern: /cheeseburger/i, replace: 'Hamburger' },
  { pattern: /burger/i, replace: 'Hamburger' },
  { pattern: /fries|french\s*fried\s*potatoes/i, replace: 'French Fries' },

  // Rice dishes
  { pattern: /chicken\s+fried\s+rice/i, replace: 'Chicken Fried Rice' },
  { pattern: /beef\s+fried\s+rice/i, replace: 'Beef Fried Rice' },
  { pattern: /egg\s+fried\s+rice/i, replace: 'Egg Fried Rice' },

  // Tacos and Mexican
  { pattern: /beef\s+tacos?/i, replace: 'Beef Tacos' },
  { pattern: /chicken\s+tacos?/i, replace: 'Chicken Tacos' },
  { pattern: /fish\s+tacos?/i, replace: 'Fish Tacos' },

  // Breakfast
  { pattern: /omelet+e?/i, replace: 'Egg Omelette' },
  { pattern: /pancakes?/i, replace: 'Pancakes' },
  { pattern: /waffles?/i, replace: 'Waffles' },

  // Smoothies
  { pattern: /(blackberry|blueberry|strawberry)\s*(yogurt)?\s*smoothie/i, replace: (m: RegExpMatchArray) => {
      const berry = (m[0].match(/blackberry|blueberry|strawberry/i) || [''])[0];
      return `${capitalize(berry)} Yogurt Smoothie`.trim();
    } },
];

function capitalize(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; }

export function normalizeDishName(name: string): string {
  if (!name) return name;
  let out = name.trim();
  for (const entry of SYNONYMS) {
    const match = out.match(entry.pattern);
    if (!match) continue;
    if (typeof entry.replace === 'string') {
      out = out.replace(entry.pattern, entry.replace);
    } else {
      out = out.replace(entry.pattern, entry.replace(match));
    }
  }
  // Clean generic suffixes
  out = out.replace(/\b(dish|meal|food)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
  // Title case basic normalization if short
  if (out.length < 60) {
    out = out.split(' ').map(w => /^(and|with|of|in|on|the|a|an)$/i.test(w) ? w.toLowerCase() : capitalize(w)).join(' ');
  }
  return out;
}
