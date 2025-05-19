"use node";

import { internalAction } from "convex/_generated/server.js";
import type { Document } from "@langchain/core/documents";
import * as doclingApiTypes from "../utils/docling_api_types";
import { v } from "convex/values";
import { api } from "convex/_generated/api";

// Document types that don't need processing
const SKIP_PROCESSING_TYPES = ["url", "site", "documents", "youtube"] as const;

// Default docling processing options
const DEFAULT_DOCLING_OPTIONS = {
  from_formats: doclingApiTypes.supportedFormats,
  to_formats: ["md"],
  image_export_mode: "referenced",
  do_ocr: true,
  force_ocr: false,
  ocr_engine: "easyocr",
  pdf_backend: "dlparse_v4",
  table_mode: "accurate",
  pipeline: "standard",
  page_range: [1, 9223372036854776000],
  document_timeout: 604800,
  abort_on_error: false,
  return_as_file: false,
  do_table_structure: true,
  include_images: true,
  images_scale: 2,
  do_code_enrichment: false,
  do_formula_enrichment: false,
  do_picture_classification: false,
  do_picture_description: false,
  picture_description_area_threshold: 0.05,
} as const;

export const loadDocling = internalAction({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    langchainDocument?: Document & { metadata: { url: string } };
  }> => {
    // Get document from database
    const document = await ctx.runQuery(api.routes.documents.get, {
      documentId: args.documentId,
    });
    if (!document) {
      throw new Error("Document not found");
    }

    // Get document URL
    let documentUrl: string;
    if (typeof document.key === "string") {
      documentUrl = document.key;
    } else {
      const url = await ctx.storage.getUrl(document.key);
      if (!url) throw new Error("Failed to get storage URL");
      documentUrl = url;
    }

    // Skip processing for certain document types
    if (SKIP_PROCESSING_TYPES.includes(document.type as any)) {
      return { langchainDocument: undefined };
    }

    // Process document through docling API
    const response = await fetch(
      "http://localhost:5001/v1alpha/convert/source",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          options: DEFAULT_DOCLING_OPTIONS,
          http_sources: [{ url: documentUrl, headers: {} }],
        }),
      },
    );

    const responseBody = await response.json();
    const mdContent = responseBody.document.md_content as string;

    return {
      langchainDocument: {
        pageContent: mdContent,
        metadata: { url: documentUrl },
      },
    };
  },
});
