"use node";

import weaviate from "weaviate-ts-client";
import { WeaviateStore } from "@langchain/weaviate";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getEmbeddings } from "./models";

// Initialize text splitter for markdown
export const getTextSplitter = () =>
  RecursiveCharacterTextSplitter.fromLanguage("markdown", {
    chunkSize: 1000,
    chunkOverlap: 200,
  });

// Initialize Weaviate store
export const getVectorStore = () =>
  new WeaviateStore(getEmbeddings(), {
    client: weaviate.client({
      scheme: "http",
      host: "weaviate:8080",
    }),
    indexName: "ProjectDocuments",
    textKey: "text",
    metadataKeys: ["projectId", "source"],
  });
