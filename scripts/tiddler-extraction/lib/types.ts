export type RawTiddler = {
  title: string;
  tags: string[];
  created: string;
  modified: string;
  body: string;
};

export type WikiLink = {
  label: string;
  target: string;
  external: boolean;
};

export type Quote = {
  text: string;
  attribution: string | null;
};

export type HlexiconEntry = {
  term: string;
  definition: string;
  aliases: string[];
  sourceTitle: string;
  sourceModified: string;
};

export type MetaLabel = {
  raw: string;
  date: string | null;
  author: string | null;
  description: string | null;
};

export type ExtractedSignals = {
  links: WikiLink[];
  quotes: Quote[];
  blockquotes: string[];
  headings: { level: number; text: string }[];
  metaLabels: MetaLabel[];
  hlexiconRefs: string[];
};

export type ScoredTiddler = RawTiddler & {
  signals: ExtractedSignals;
  score: number;
  bodyLength: number;
};

export type ConcreteProposal = {
  concept: string;
  mentionCount: number;
  sampleContexts: string[];
  hasOwnTiddler: boolean;
};
