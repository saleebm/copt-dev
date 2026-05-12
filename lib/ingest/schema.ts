// Request validators for the ingest endpoints. iOS Shortcuts ships scalars as
// strings (form fields, query params), so schemas coerce strings → arrays/numbers
// where the underlying field is typed. See docs/INGEST.md for the request shapes.
import { z } from "zod";

const urlList = z
  .union([z.array(z.string()), z.string()])
  .transform((value) => (Array.isArray(value) ? value : value.split(/\r?\n/)))
  .pipe(
    z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .url("each url must be a valid URL")
      )
      .min(0)
  );

const flexibleBoolean = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }
    return value.trim().toLowerCase() === "true";
  });

export const urlIngestSchema = z
  .object({
    urls: urlList.optional().default([]),
    notes: z.string().optional().default(""),
    force: flexibleBoolean.optional().default(false),
  })
  .refine(
    (data) => data.urls.length > 0 || data.notes.trim().length > 0,
    "urls or notes required"
  );

export type UrlIngestInput = z.infer<typeof urlIngestSchema>;

export const imageMetadataSchema = z.object({
  batchId: z.string().trim().min(1, "batchId required"),
  imageIndex: z.coerce.number().int().min(0),
  totalCount: z.coerce.number().int().min(1),
  notes: z.string().optional().default(""),
});

export type ImageIngestMetadata = z.infer<typeof imageMetadataSchema>;

const TYPE_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
};

export function extensionForContentType(contentType: string): string {
  const lower = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  return TYPE_TO_EXT[lower] ?? "bin";
}
