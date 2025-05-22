"use node";

// export const chat = internalAction({
//   args: {
//     chatId: v.id("chats"),
//   },
//   handler: async function* (
//     ctx,
//     args,
//   ): AsyncGenerator<StreamEvent, void, unknown> {
//     await ctx.runQuery(api.routes.chats.get, {
//       chatId: args.chatId,
//     });
//     const chatInput = await ctx.runQuery(api.routes.chatInput.get, {
//       chatId: args.chatId,
//     });
//     const modelResult = await ctx.runAction(api.actions.models.getModel, {
//       chatId: args.chatId,
//     });
//     const selectedModel = modelResult.config.model_list.find(
//       (model) => model.model_name === modelResult.selectedModel,
//     );


//     if (!selectedModel) {
//       throw new Error("Selected model not found");
//     }

//     const unsupportedDocuments: (Doc<"documents"> & { mimeType: string })[] =
//       [];
//     const documents = await ctx
//       .runQuery(api.routes.documents.getMultiple, {
//         documentIds: chatInput.documents ?? [],
//       })
//       .then((documents) => {
//         return documents
//           .map((document) => {
//             const mimeType =
//               mime.getType(document.name) ?? "application/octet-stream";
//             return {
//               ...document,
//               mimeType,
//             };
//           })
//           .filter((document) => {
//             if (
//               isMimeTypeSupported(document.mimeType, selectedModel?.tags ?? [])
//             ) {
//               return true;
//             }
//             unsupportedDocuments.push(document);
//             return false;
//           });
//       });

//     let additionalDocuments: Document[] = [];
//     if (unsupportedDocuments.length > 0) {
//       for (const document of unsupportedDocuments) {
//         try {
//           const docUrl = new URL(
//             (await ctx.storage.getUrl(document.key as Id<"_storage">)) ?? "",
//           );
//           docUrl.host = "backend:3210";
//           const pageContent = await fetch(
//             "http://services:5001/convert/?source=" + new URL(docUrl),
//             {
//               headers: {
//                 Authorization: `Bearer ${process.env.SERVICE_PASS}`,
//               },
//             },
//           ).then(async (res) => await res.text());
//           additionalDocuments.push(
//             new Document({
//               pageContent: pageContent,
//               metadata: {
//                 source: document.name,
//                 url:
//                   (await ctx.storage.getUrl(document.key as Id<"_storage">)) ??
//                   "",
//               },
//             }),
//           );
//         } catch (error) {
//           // remove document from chat input
//           await ctx.runMutation(api.routes.chatInput.update, {
//             chatId: args.chatId,
//             updates: {
//               documents:
//                 chatInput.documents?.filter((id) => id !== document._id) ?? [],
//             },
//           });
//           continue;
//         }
//       }
//     }

//     const humanMessage = new HumanMessage({
//       content: [
//         {
//           type: "text",
//           text: chatInput.text ?? "",
//         },
//         ...documents.map(async (document) => {
//           const blob = (await ctx.storage.get(document.key)) as Blob;
//           const arrayBuffer = await blob.arrayBuffer();
//           const base64String = Buffer.from(arrayBuffer).toString("base64");
//           return {
//             type: "image_url",
//             image_url: {
//               url: `data:${document.mimeType};base64,${base64String}`,
//             },
//           };
//         }),
//         ...additionalDocuments.map(async (document) => {
//           return {
//             type: "text",
//             text: `# [${document.metadata.source}](${document.metadata.url})\n\n${document.pageContent}`,
//           };
//         }),
//       ],
//     });
//     const response = await agentGraph.streamEvents(
//       {
//         messages: [humanMessage],
//       },
//       {
//         version: "v2",
//         configurable: {
//           ctx,
//           model: selectedModel?.litellm_params.model ?? "",
//           agentMode: chatInput.agentMode ?? false,
//           smortMode: chatInput.smortMode ?? false,
//           webSearch: chatInput.webSearch ?? true,
//           projectId: chatInput.projectId,
//           excludeDocumentIds: chatInput.documents ?? [],
//           threadId: args.chatId,
//         },
//       },
//     );

//     for await (const event of response) {
//       yield event;
//     }
//   },
// });

// export const messages = action({
//   args: {
//     chatId: v.id("chats"),
//     replay: v.optional(v.boolean()),
//   },
//   handler: async (ctx, args) => {
//     await requireAuth(ctx);

//     const chat = await ctx.runQuery(api.routes.chats.get, {
//       chatId: args.chatId,
//     });
//     if (!chat) {
//       throw new Error("Chat not found");
//     }

//     if (args.replay) {
//       const state = await agentGraph.getStateHistory({
//         configurable: {
//           threadId: args.chatId,
//         },
//       });
//       return state;
//     }

//     const state = await agentGraph.getState({
//       configurable: {
//         threadId: args.chatId,
//       },
//     });
//     return state;
//   },
// });
