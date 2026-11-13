// Myers' O(ND) diff over two sequences of strings, grouped into runs. Used for document text, where
// the two sides are mostly the same and the order of what differs matters. Each step keeps only the
// diagonals it can have reached (2d + 3 of them at step d), so memory grows with the square of the
// number of edits, not with their number times the longest possible diff; past maxEdits the sequences
// are reported as too different to diff (null).
const DEFAULT_MAX_EDITS = 2000;

export function diffSequences(a: readonly string[], b: readonly string[], maxEdits = DEFAULT_MAX_EDITS): DiffRun[] | null {
  const max = Math.min(a.length + b.length, maxEdits);
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  for (let d = 0; d <= max; d++) {
    // Before step d only diagonals -d+1 to d-1 have been set, and backtracking from d reads k-1 and k+1
    trace.push(v.slice(offset - d - 1, offset + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < a.length && y < b.length && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= a.length && y >= b.length) return group(backtrack(trace, a, b));
    }
  }
  return null;
}

function backtrack(trace: Int32Array[], a: readonly string[], b: readonly string[]): DiffStep[] {
  const steps: DiffStep[] = [];
  let x = a.length;
  let y = b.length;
  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    // trace[d] starts at diagonal -d-1
    const offset = d + 1;
    const k = x - y;
    const previousK = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? k + 1 : k - 1;
    const previousX = v[offset + previousK];
    const previousY = previousX - previousK;
    while (x > previousX && y > previousY) {
      steps.push({ kind: "equal", item: a[x - 1] });
      x--;
      y--;
    }
    if (d > 0) {
      if (x === previousX) steps.push({ kind: "insert", item: b[previousY] });
      else steps.push({ kind: "delete", item: a[previousX] });
    }
    x = previousX;
    y = previousY;
  }
  return steps.reverse();
}

function group(steps: DiffStep[]): DiffRun[] {
  const runs: DiffRun[] = [];
  for (const step of steps) {
    const last = runs.at(-1);
    if (last?.kind === step.kind) last.items.push(step.item);
    else runs.push({ kind: step.kind, items: [step.item] });
  }
  return runs;
}

export interface DiffRun {
  kind: "equal" | "delete" | "insert";
  items: string[];
}

interface DiffStep {
  kind: DiffRun["kind"];
  item: string;
}
