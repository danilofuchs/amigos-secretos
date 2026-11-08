'use client';
import { useEffect } from 'react';

export function InkFilter() {
  useEffect(() => {
    const targets =
      'h1,h2,.brand,.letter-message,.letter-postscript,.notebook-footnote,.demo-caption,.empty-slip-front>p,.name-slip>span,.share-slip>strong>span,.handwritten,.notebook .written-input,.name-entry textarea';
    let marked = new Set<Element>();
    document.documentElement.removeAttribute('data-ink-selection');
    function syncSelection() {
      const next = new Set<Element>();
      const selection = document.getSelection();
      if (selection && !selection.isCollapsed) {
        const candidates = document.querySelectorAll(targets);
        for (let i = 0; i < selection.rangeCount; i++) {
          const range = selection.getRangeAt(i);
          for (const element of candidates) {
            if (!range.intersectsNode(element)) continue;
            const contents = document.createRange();
            contents.selectNodeContents(element);
            const overlap = range.cloneRange();
            if (overlap.compareBoundaryPoints(Range.START_TO_START, contents) < 0)
              overlap.setStart(contents.startContainer, contents.startOffset);
            if (overlap.compareBoundaryPoints(Range.END_TO_END, contents) > 0)
              overlap.setEnd(contents.endContainer, contents.endOffset);
            if (!overlap.collapsed && overlap.toString().length > 0) next.add(element);
          }
        }
      }
      const active = document.activeElement;
      if (
        (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
        active.selectionStart !== null &&
        active.selectionStart !== active.selectionEnd &&
        active.matches(targets)
      )
        next.add(active);
      for (const element of marked)
        if (!next.has(element)) element.removeAttribute('data-ink-selection');
      for (const element of next)
        if (!marked.has(element)) element.setAttribute('data-ink-selection', '');
      marked = next;
    }
    document.addEventListener('selectionchange', syncSelection);
    document.addEventListener('select', syncSelection, true);
    syncSelection();
    return () => {
      document.removeEventListener('selectionchange', syncSelection);
      document.removeEventListener('select', syncSelection, true);
      for (const element of marked) element.removeAttribute('data-ink-selection');
    };
  }, []);
  return (
    <svg className="ink-filter-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <filter
          id="ballpoint-ink"
          x="-3%"
          y="-5%"
          width="106%"
          height="110%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".11 .72"
            numOctaves="3"
            seed="12"
            stitchTiles="stitch"
            result="fiber"
          />
          <feColorMatrix
            in="fiber"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  22 0 0 0 -7"
            result="coverage"
          />
          <feComponentTransfer in="coverage" result="soft-coverage">
            <feFuncA type="linear" slope=".35" intercept=".65" />
          </feComponentTransfer>
          <feComposite in="SourceGraphic" in2="soft-coverage" operator="in" result="ink" />
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".008 .075"
            numOctaves="2"
            seed="5"
            result="pressure"
          />
          <feColorMatrix
            in="pressure"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .7 0 0 0 .6"
            result="pressure-alpha"
          />
          <feComposite in="ink" in2="pressure-alpha" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
