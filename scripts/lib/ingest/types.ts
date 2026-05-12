// Shared types for the worker pipeline. PipelineInput is the union the worker
// hands to every pipeline stage; each stage narrows on `kind`.
import type { IngestSubmission, PostType } from "@/lib/generated/prisma";

export type IngestKind = "url" | "image" | "note";

export type StagedImage = {
  submissionId: string;
  index: number;
  stagedFilePath: string;
  extension: string;
};

export type PipelineInput =
  | {
      kind: "url";
      submission: IngestSubmission;
      urls: string[];
      notes: string;
      force: boolean;
    }
  | {
      kind: "note";
      submission: IngestSubmission;
      notes: string;
    }
  | {
      kind: "image";
      submissions: IngestSubmission[];
      batchId: string;
      notes: string;
      images: StagedImage[];
    };

export type GeminiOutput = {
  slug: string;
  title: string;
  type: PostType;
  body: string;
  frontmatter: Record<string, unknown>;
  rawMdx: string;
};

export type PipelineResult = {
  postSlug: string;
  branch: string;
  prUrl: string;
  filePath: string;
};
