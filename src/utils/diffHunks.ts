import { diffLines } from 'diff'

export type DiffSegmentKind = 'same' | 'added' | 'removed'

export interface DiffSegment {
  kind: DiffSegmentKind
  /** Only true for a 'same' segment long enough to hide by default, GitHub-PR style. */
  collapsed: boolean
  /** 1-indexed line number (in this side's own numbering) of the first line in the segment. */
  startLine: number
  lines: string[]
}

// How many unchanged lines to keep visible immediately around a change, same
// idea as `git diff -U3`. A 'same' run longer than CONTEXT_LINES*2 plus this
// many extra lines gets its middle collapsed — short gaps stay fully visible
// rather than producing an awkward "Show 1 more line" toggle.
const CONTEXT_LINES = 3
const MIN_COLLAPSED_LINES = 4

/**
 * Splits a line-level diff into two independently-scrollable, GitHub-PR-style
 * segment lists — one per side — where a large unchanged run is trimmed down
 * to a few lines of leading/trailing context plus a single collapsed segment
 * for the hidden middle. The caller renders collapsed segments as a "Show N
 * unchanged lines" toggle instead of real rows, so a huge file with a small,
 * localized change renders only a handful of DOM rows by default instead of
 * the whole file — the performance win is a side effect of matching the
 * familiar GitHub review UX, not a separate optimization.
 */
export function buildDiffSegments(
  current: string,
  proposed: string,
): { left: DiffSegment[]; right: DiffSegment[]; hasChanges: boolean } {
  const parts = diffLines(current, proposed)
  const left: DiffSegment[] = []
  const right: DiffSegment[] = []
  let leftLine = 1
  let rightLine = 1
  let hasChanges = false

  const pushSame = (lines: string[]) => {
    if (lines.length > CONTEXT_LINES * 2 + MIN_COLLAPSED_LINES) {
      const before = lines.slice(0, CONTEXT_LINES)
      const hidden = lines.slice(CONTEXT_LINES, lines.length - CONTEXT_LINES)
      const after = lines.slice(lines.length - CONTEXT_LINES)
      let l = leftLine
      let r = rightLine
      if (before.length) {
        left.push({ kind: 'same', collapsed: false, startLine: l, lines: before })
        right.push({ kind: 'same', collapsed: false, startLine: r, lines: before })
        l += before.length
        r += before.length
      }
      left.push({ kind: 'same', collapsed: true, startLine: l, lines: hidden })
      right.push({ kind: 'same', collapsed: true, startLine: r, lines: hidden })
      l += hidden.length
      r += hidden.length
      if (after.length) {
        left.push({ kind: 'same', collapsed: false, startLine: l, lines: after })
        right.push({ kind: 'same', collapsed: false, startLine: r, lines: after })
      }
    } else {
      left.push({ kind: 'same', collapsed: false, startLine: leftLine, lines })
      right.push({ kind: 'same', collapsed: false, startLine: rightLine, lines })
    }
    leftLine += lines.length
    rightLine += lines.length
  }

  for (const part of parts) {
    const lines = part.value.replace(/\n$/, '').split('\n')
    if (part.added) {
      hasChanges = true
      right.push({ kind: 'added', collapsed: false, startLine: rightLine, lines })
      rightLine += lines.length
    } else if (part.removed) {
      hasChanges = true
      left.push({ kind: 'removed', collapsed: false, startLine: leftLine, lines })
      leftLine += lines.length
    } else {
      pushSame(lines)
    }
  }

  return { left, right, hasChanges }
}
