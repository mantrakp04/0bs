import { z } from "zod";
import type { BaseMessage } from "@langchain/core/messages";
import { Annotation, END } from "@langchain/langgraph";
import { step } from "./types";

export const IndexState = Annotation.Root({
  useManus: Annotation<boolean>({
    reducer: (x, y) => y ?? x ?? false,
    default: () => false,
  }),
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
})

export const PlanState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  plan: Annotation<typeof step[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  pastSteps: Annotation<[string, string][]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  response: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
})

export const SupervisorState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),
  instruction: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
})

export const VectorstoreState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  binary_scores: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  sources: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
})

export const FsState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  supervisor_messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
})

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  supervisor_messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  fs_messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  vectorstore_messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  binary_scores: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  sources: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),

  plan: Annotation<typeof step[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  pastSteps: Annotation<Record<string, any>[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  respond: Annotation<boolean>({
    reducer: (x, y) => y ?? x ?? false,
    default: () => false,
  }),

  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),
  instruction: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),

  useManus: Annotation<boolean>({
    reducer: (x, y) => y ?? x ?? false,
    default: () => false,
  }),
});
