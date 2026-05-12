export type Lane = "hlexicon" | "concept" | "quote" | "wild";

export type RolledTopic = {
  lane: Lane;
  title: string;
  sourceTitle: string;
  sourceBody: string | null;
  relatedHlexicons: { term: string; definition: string }[];
};

export type SparkAnswer = {
  spark: string;
  answer: string;
};

export type RollState = {
  topic: RolledTopic;
  sparks: string[];
  answers: SparkAnswer[];
  draft: string;
};
