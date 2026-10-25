// Curated Samples per Spec §11

export interface Sample {
  id: string;
  name: string;
  tagline: string;
  bugReport: string;
  code: string;
}

export const SAMPLES: Sample[] = [
  {
    id: 'paginate',
    name: 'Sample 1: paginate',
    tagline: 'Warm-up · Off-by-one pagination',
    bugReport:
      'Page numbers start at 1, but paginate(items, 1, 2) returns the second page instead of the first. Page 1 of [1,2,3,4,5] with 2 per page should be [1,2].',
    code: `function paginate(items, page, perPage) {
  const start = page * perPage;
  return items.slice(start, start + perPage);
}`
  },
  {
    id: 'mergeIntervals',
    name: 'Sample 2: mergeIntervals (Hero)',
    tagline: 'Hero demo · Silently drops unsorted intervals',
    bugReport:
      'mergeIntervals drops intervals when the input isn\'t sorted: mergeIntervals([[8,10],[1,3],[2,6]]) returns [[8,10]] but should return [[1,6],[8,10]]. Intervals that touch, like [1,3] and [3,5], should also be merged into [1,5].',
    code: `function mergeIntervals(intervals) {
  const result = [];
  for (const current of intervals) {
    const last = result[result.length - 1];
    if (last && current[0] < last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      result.push(current);
    }
  }
  return result;
}`
  },
  {
    id: 'parseDuration',
    name: 'Sample 3: parseDuration',
    tagline: 'Subtle reasoning · Regex decimals misread',
    bugReport:
      'parseDuration("1.5h") returns 18000 but should return 5400 seconds. Decimal values are being misread.',
    code: `function parseDuration(str) {
  const units = { h: 3600, m: 60, s: 1 };
  let total = 0;
  const parts = str.match(/\\d+[hms]/g) || [];
  for (const p of parts) {
    total += parseInt(p) * units[p.slice(-1)];
  }
  return total;
}`
  }
];
