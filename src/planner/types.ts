export type TaskType =
  | "sleep"
  | "routine"
  | "sport"
  | "study"
  | "food"
  | "shopping"
  | "household"
  | "tutoring"
  | "free"
  | "buffer";

export type Task = {
  id: string;
  day: string;
  start: string;
  end: string;
  title: string;
  type: TaskType;
  fixed?: boolean;
  weekOffset?: number;
  rescheduledFrom?: {
    start: string;
    end: string;
  };
  planningWarning?: string;
};