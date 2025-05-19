"use node";

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";
import weaviate from "weaviate-ts-client";
import { WeaviateStore } from "@langchain/weaviate";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export const embeddings = new OpenAIEmbeddings({
  model: "embedding",
  apiKey: "hello-world",
  configuration: {
    baseURL: "http://localhost:4000",
  },
});

const doc = new Document({
  pageContent: `mantra patel Vancouver, BC | pmantra16@gmail.com | 6723803912 | linkedin.com/in/mantra-patel-722a68266 | github.com/mantrakp04/\n\n## SUMMARY\n\nHighly accomplished and versatile Software Engineer with a strong focus on AI/ML, full-stack development, and building scalable, secure systems. Proven expertise in designing, developing, and deploying AI-driven applications, with hands-on experience in transformers, LangChain/LangGraph, diusers, wav2vec, talking heads, voice suppression, Torch, and ONNX . Experienced in building robust and scalable cloud infrastructure on AWS, utilizing services such as CloudFormation, ECS, EC2, RDS, ElastiCache, and OpenSearch . Adept at full-stack development with technologies including Typescript, React, Next.js, Node.js, FastAPI, and leveraging databases like MySQL, SQL, and MongoDB . Possessing a unique background in implementing advanced security measures, including statistical bot detection with 98% accuracy and custom DDoS mitigation over TCP using HAProxy . Passionate about solving complex technical challenges, building impactful products, and contributing to innovative, fast-paced environments.\n\n## EXPERIENCE\n\nCTO &amp; Co-Founder | Scribsai | May 2023 - September 2024 | Remote, Las Vegas / Vancouver, BC\n\n- ● Led the technical vision and development of the ScribsAI platform, an ambitious project focused on Agentic Artificial Intelligence (AI) and Cloud Computing.\n- ● Engineered and scaled the ScribsAI infrastructure on AWS, leveraging CloudFormation, ECS, EC2, RDS, ElastiCache, and OpenSearch to support platform development and growth.\n- ● Designed, trained, and fine tuned AI models, including Text-to-Speech (TTS) models and integrating technologies like diusers, transformers, wav2vec, talking heads, voice suppression , to enhance platform capabilities.\n- ● Gained valuable experience in rapid prototyping, technical strategy, and navigating the challenges of a startup environment.\n\nSoftware Engineer | RAWKNEE | January 2021 - January 2022 | Remote, India\n\n- ● Led a team in the development and scaling of a Minecraft server from an initial state of 2 i7 servers crashing at ~80 players to supporting 1,000 concurrent players spanning multiple game modes.\n- ● Implemented comprehensive features including global leaderboards, stats, friends, partying, permissions (ranks), and a rank site .\n- ● Achieved a 500% increase in sales after the implementation of new technical strategies and features.\n- ● Managed technical aspects supporting a community with approximately 5 million combined subscribers .\n- ● Developed an advanced AI-based predictive bot system for the Minecraft network, significantly enhancing user engagement and gameplay interactivity.\n- ● Utilized Java for mod and moderation tool development and demonstrated a strong understanding of complex Minecraft network principles .\n- ● Designed and implemented a custom MySQL-based network protocol to distribute players across multiple servers within the same world.\n- ● Implemented sophisticated security measures, including statistical models for bot detection with 98% accuracy and custom DDoS protection over TCP using HAProxy , significantly improving server stability and user experience.\n- ● On the Rex Kraft server, developed a questing system with over 365 unique daily quests , which boosted player count by 100 and increased sales by over $2k monthly .\n\nPROJECTS\n\nManusMCP | Personal Project | github.com/mantrakp04/manusmcp\n\n- ● Developed an implementation of the manus.im agent using Flowise, LangGraph, JavaScript, and Python .\n- ● Created specialized AI agents, including Planner, FileWizard, CommandRunner, and WebNavigator, to automate complex tasks and enable problem-solving workflows.\n- ● Overcame technical challenges related to seamlessly integrating diverse AI models and standardizing API interactions across multiple providers , as well as implementing custom storage logic and optimization.\n- ● Achieved a 60% reduction in token usage compared to other long running workflow agents, resulting in a cost reduction to approximately $0.1 per run (compared to $0.5-$3).\n- ● Integrated Next.js environment support for deploying web applications via the agent.\n\nSheer | Personal Project | github.com/mantrakp04/sheer\n\n- ● Built a fully client-side AI-powered chat application running entirely in the browser with no server dependency , ensuring complete privacy and persistent local storage.\n- ● Developed with a focus on user experience and privacy-preserving AI using\n- ● Stack: React, Shadcn, Langchain, Dexie\n\nObs | Personal Project | github.com/mantrakp04/0bs.git\n\n- ● Ongoing development of a UI/UX-focused platform inspired by Claude and NotebookLM.\n- ● Aims to optimize agentic interactions through advanced user experience design and intuitive interfaces, leveraging Typescript, Nextjs, Tanstack Router, Convex, PostgresSQL, DuckDB, Docker, VLM Pipelines, Transformers, etc.\n\n## EDUCATION\n\nBachelor of Science in Combined Math + Stat | The University of British Columbia | Vancouver, BC | 2026\n\n- ● Artificial Intelligence (AI) / Machine Learning (ML): Transformers, LangChain/LangGraph, Flowise, Diusers, Wav2Vec, Talking Heads, Voice Suppression, Torch, ONNX, AI Model Training (including TTS), Prompt Engineering\n- ● Cloud Computing: AWS (CloudFormation, ECS, EC2, RDS, ElastiCache, OpenSearch), Terraform\n- ● Full-Stack Development: Typescript, Javascript, Next.js, React, Node.js, FastAPI\n- ● Databases: MySQL, SQL, MongoDB, Redis\n- ● Security: Statistical Bot Detection (98% accuracy), Custom DDoS Mitigation (TCP/HAProxy), Network Security, Role Based Access &amp; Permissions\n- ● Development Tools: Posthog, Kong\n- ● Game Development Principles: Complex Network Principles (Minecraft), Game Design, Community Management\n- ● Leadership &amp; Teamwork: Team Management, Technical Leadership`,
  metadata: {
    source: "test",
    projectId: "test",
  },
});

const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
  chunkSize: 1000,
  chunkOverlap: 200,
});

const docs = await splitter.splitDocuments([doc]);

const weaviateClient = weaviate.client({
  scheme: "http",
  host: "localhost:8080",
});

const vectorStore = new WeaviateStore(embeddings, {
  client: weaviateClient,
  indexName: "ProjectDocuments",
  textKey: "text",
  metadataKeys: ["source", "projectId"],
});

const vectorIds = await vectorStore.addDocuments(docs);

console.log(vectorIds);
// works
