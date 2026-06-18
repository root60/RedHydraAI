import type { ResearchBundle, ResearchSource } from '../types';

const withTimeout = async <T>(promise: Promise<T>, ms = 7500): Promise<T> => {
  let timeoutId = 0;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('Request timed out')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

function cleanSnippet(value: unknown): string {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 380);
}

function dedupe(sources: ResearchSource[]): ResearchSource[] {
  const seen = new Set<string>();
  const output: ResearchSource[] = [];
  for (const source of sources) {
    const key = `${source.title.toLowerCase()}|${source.url}`;
    if (seen.has(key) || !source.title || !source.url) continue;
    seen.add(key);
    output.push(source);
  }
  return output.slice(0, 12);
}

async function searchWikipedia(query: string): Promise<ResearchSource[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=5`;
  const response = await withTimeout(fetch(url));
  if (!response.ok) return [];
  const data = await response.json();
  return (data?.query?.search || []).map((item: any) => ({
    title: item.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
    snippet: cleanSnippet(item.snippet),
    source: 'Wikipedia' as const
  }));
}

async function searchDuckDuckGo(query: string): Promise<ResearchSource[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
  const response = await withTimeout(fetch(url));
  if (!response.ok) return [];
  const data = await response.json();
  const results: ResearchSource[] = [];
  if (data.AbstractText && data.AbstractURL) {
    results.push({ title: data.Heading || query, url: data.AbstractURL, snippet: cleanSnippet(data.AbstractText), source: 'DuckDuckGo' });
  }
  for (const topic of data.RelatedTopics || []) {
    if (topic.FirstURL && topic.Text) {
      results.push({ title: topic.Text.split(' - ')[0] || query, url: topic.FirstURL, snippet: cleanSnippet(topic.Text), source: 'DuckDuckGo' });
    }
  }
  return results.slice(0, 5);
}

async function searchCrossref(query: string): Promise<ResearchSource[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=5&select=title,URL,abstract,published-print,published-online,container-title`;
  const response = await withTimeout(fetch(url));
  if (!response.ok) return [];
  const data = await response.json();
  return (data?.message?.items || []).map((item: any) => {
    const published = item['published-print']?.['date-parts']?.[0]?.join('-') || item['published-online']?.['date-parts']?.[0]?.join('-') || undefined;
    return {
      title: Array.isArray(item.title) ? item.title[0] : item.title || 'Crossref result',
      url: item.URL,
      snippet: cleanSnippet(item.abstract || (Array.isArray(item['container-title']) ? item['container-title'][0] : 'Scholarly reference indexed by Crossref.')),
      published,
      source: 'Crossref' as const
    };
  });
}

async function searchHackerNews(query: string): Promise<ResearchSource[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`;
  const response = await withTimeout(fetch(url));
  if (!response.ok) return [];
  const data = await response.json();
  return (data?.hits || []).map((hit: any) => ({
    title: hit.title || hit.story_title || 'Hacker News result',
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    snippet: cleanSnippet(`${hit.points || 0} points, ${hit.num_comments || 0} comments. ${hit.author ? `By ${hit.author}.` : ''}`),
    published: hit.created_at?.slice(0, 10),
    source: 'HackerNews' as const
  }));
}

export function shouldRunWebResearch(text: string): { run: boolean; deep: boolean; query: string } {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const forcedWeb = lower.startsWith('/web ');
  const forcedDeep = lower.startsWith('/research ') || lower.startsWith('/deepresearch ') || lower.startsWith('/deep-research ');
  const wantsCurrent = /\b(latest|current|today|news|recent|live|web search|search web|sources|citation|research)\b/i.test(trimmed);
  const query = trimmed.replace(/^\/(web|research|deepresearch|deep-research)\s+/i, '').trim();
  return { run: forcedWeb || forcedDeep || wantsCurrent, deep: forcedDeep || lower.includes('deep research'), query: query || trimmed };
}

export async function runWebResearch(query: string, mode: 'web' | 'deep' = 'web'): Promise<ResearchBundle> {
  const tasks = mode === 'deep'
    ? [searchWikipedia(query), searchDuckDuckGo(query), searchCrossref(query), searchHackerNews(query)]
    : [searchWikipedia(query), searchDuckDuckGo(query), searchHackerNews(query)];

  const settled = await Promise.allSettled(tasks);
  const sources = dedupe(settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
  const summary = sources.length
    ? `Found ${sources.length} live source${sources.length === 1 ? '' : 's'} from ${Array.from(new Set(sources.map((s) => s.source))).join(', ')}.`
    : 'No live public source returned results. The chat answer will use local reasoning only.';

  return { query, mode, sources, summary };
}

export function researchBundleToContext(bundle: ResearchBundle): string {
  if (!bundle.sources.length) return '';
  return [
    `Live ${bundle.mode === 'deep' ? 'deep research' : 'web search'} results for: ${bundle.query}`,
    ...bundle.sources.map((item, index) => `[${index + 1}] ${item.title}\nSource: ${item.source}${item.published ? `, date: ${item.published}` : ''}\nURL: ${item.url}\nSnippet: ${item.snippet}`)
  ].join('\n\n');
}
