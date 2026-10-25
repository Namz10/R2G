import * as Diff from 'diff';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export function computeLineDiff(original: string, modified: string) {
  const parts = Diff.diffLines(original, modified);
  let additions = 0;
  let deletions = 0;

  const lines: DiffLine[] = [];

  for (const part of parts) {
    const partLines = part.value.replace(/\n$/, '').split('\n');
    for (const line of partLines) {
      if (part.added) {
        additions++;
        lines.push({ type: 'added', value: line });
      } else if (part.removed) {
        deletions++;
        lines.push({ type: 'removed', value: line });
      } else {
        lines.push({ type: 'unchanged', value: line });
      }
    }
  }

  return { lines, additions, deletions };
}
