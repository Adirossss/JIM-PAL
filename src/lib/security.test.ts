import { describe, expect, it } from 'vitest';
import indexHtml from '../../index.html?raw';

/** Parses the Content-Security-Policy meta tag into directive name -> sources. */
function cspDirectives(html: string): Map<string, string[]> {
  const match = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  if (!match) throw new Error('index.html has no Content-Security-Policy meta tag');
  return new Map(
    match[1]!
      .split(';')
      .map((part) => part.trim().split(/\s+/))
      .filter((tokens) => tokens[0])
      .map(([name, ...sources]) => [name!, sources]),
  );
}

describe('Content-Security-Policy', () => {
  const csp = cspDirectives(indexHtml);

  it('only allows scripts and connections from this origin', () => {
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('script-src')).toEqual(["'self'"]);
    expect(csp.get('connect-src')).toEqual(["'self'"]);
  });

  it('blocks plugins and base-tag hijacking', () => {
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'self'"]);
  });

  it('never allows remote scripts or styles', () => {
    for (const name of ['script-src', 'style-src']) {
      const sources = csp.get(name) ?? [];
      expect(sources.some((s) => s.startsWith('http') || s === '*' || s === "'unsafe-eval'")).toBe(false);
    }
  });
});
