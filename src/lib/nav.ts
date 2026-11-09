export type CategoryId = "luft" | "fin-grov" | "mil" | "felt" | "ipsc";

export type View =
  | { name: "home" }
  | { name: "category"; category: CategoryId }
  | { name: "setup"; programId: string }
  | { name: "series"; sessionId: string }
  | { name: "session"; sessionId: string }
  | { name: "log" }
  | { name: "form"; drillId?: string }
  | { name: "shoot"; drillId: string; runId?: string }
  | { name: "run"; runId: string };
