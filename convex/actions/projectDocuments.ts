"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { Document } from "langchain/document";
import { getTextSplitter, getVectorStore } from "../langchain/weaviate";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";

function formatDocUrl(docUrl: string) {
  const url = new URL(docUrl);
  url.host = "backend:3210";
  return url.toString();
}

export const add = action({
  args: {
    documentId: v.id("documents"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<Id<"projectDocuments">> => {
    // First get the document from storage
    const storageDoc = await ctx.runQuery(api.routes.documents.get, {
      documentId: args.documentId,
    });

    // Process document through docling API
    let docUrl: string = "";
    try {
      docUrl = formatDocUrl(
        (await ctx.storage.getUrl(storageDoc.key as Id<"_storage">)) ?? "",
      );
    } catch (error) {
      docUrl = storageDoc.key ?? "";
    }

    let pageContent = "";
    if (storageDoc.type === "file") {
      pageContent = await fetch(
        "http://services:5001/convert/?source=" + docUrl,
        {
          headers: {
            Authorization: `Bearer ${process.env.SERVICE_PASS}`,
          },
        },
      ).then(async (res) => await res.text());
    } else if (storageDoc.type === "url") {
      const res = await fetch(
        "http://services:5002/crawl/?url=" + docUrl + "&max_depth=0",
      );
      const data = (await res.json()) as { url: string; markdown: string }[];
      pageContent = data
        .map((data) => `# ${data.url}\n\n${data.markdown}`)
        .join("\n\n");
    } else if (storageDoc.type === "youtube") {
      const loader = YoutubeLoader.createFromUrl(docUrl, {
        language: "en",
        addVideoInfo: true,
      });
      const docs = await loader.load();
      pageContent = docs.map((doc) => doc.pageContent).join("\n\n");
    } else if (storageDoc.type === "site") {
      const res = await fetch(
        "http://services:5002/crawl/?url=" + docUrl + "&max_depth=2",
      );
      const data = (await res.json()) as { url: string; markdown: string }[];
      pageContent = data
        .map((data) => `# ${data.url}\n\n${data.markdown}`)
        .join("\n\n");
    }

    if (!pageContent) {
      throw new Error("Failed to process document with Docling");
    }

    // Split text into chunks
    const docs = await getTextSplitter().splitDocuments([
      new Document({
        pageContent: pageContent,
        metadata: {
          source: storageDoc._id,
          projectId: args.projectId,
        },
      }),
    ]);

    // Add documents to vector store
    try {
      await getVectorStore().addDocuments(docs);
    } catch (error) {
      throw new Error("Failed to add document to vector store:\n" + error);
    }

    // Create project document in database
    const projectDocument = await ctx.runMutation(
      api.routes.projectDocuments.create,
      {
        projectId: args.projectId,
        documentId: storageDoc._id,
      },
    );

    return projectDocument;
  },
});

export const remove = action({
  args: {
    projectDocumentId: v.id("projectDocuments"),
  },
  handler: async (ctx, args) => {
    // Get project document
    const projectDocument = await ctx.runQuery(
      api.routes.projectDocuments.get,
      {
        projectDocumentId: args.projectDocumentId,
      },
    );

    // Delete from vector store
    await getVectorStore().delete({
      filter: {
        where: {
          operator: "Equal" as const,
          path: ["source"],
          valueText: projectDocument.documentId,
        },
      },
    });

    // Delete from database
    await ctx.runMutation(api.routes.projectDocuments.remove, {
      projectDocumentId: args.projectDocumentId,
    });

    return true;
  },
});
