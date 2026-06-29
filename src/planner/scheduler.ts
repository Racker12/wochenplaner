import type { Task, TaskType } from "./types";

const DAY_END = 22 * 60;

const HARD_TYPES: TaskType[] = ["sleep", "routine", "sport", "tutoring"];
const MOVABLE_TYPES: TaskType[] = [
  "study",
  "food",
  "shopping",
  "household",
  "buffer",
  "free",
];

export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getEndMinutes(task: Task) {
  const start = timeToMinutes(task.start);
  const end = timeToMinutes(task.end);

  if (end <= start) {
    return 24 * 60;
  }

  return end;
}

function getDuration(task: Task) {
  return getEndMinutes(task) - timeToMinutes(task.start);
}

function overlaps(
  a: { start: number; end: number },
  b: { start: number; end: number }
) {
  return a.start < b.end && a.end > b.start;
}

function isHardTask(task: Task) {
  return (
    task.fixed === true ||
    task.weekOffset !== undefined ||
    HARD_TYPES.includes(task.type)
  );
}

function isMovableTask(task: Task) {
  return !isHardTask(task) && MOVABLE_TYPES.includes(task.type);
}

export function resolveDaySchedule(tasks: Task[], day: string): Task[] {
  const dayTasks = tasks.filter((task) => task.day === day);

  const hardTasks = dayTasks.filter(isHardTask);
  const movableTasks = dayTasks.filter(isMovableTask);

  const resolved: Task[] = [...hardTasks];

  const sortedMovableTasks = [...movableTasks].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  for (const task of sortedMovableTasks) {
    const originalStart = task.start;
    const originalEnd = task.end;
    const duration = getDuration(task);

    let nextStart = timeToMinutes(task.start);
    let nextEnd = nextStart + duration;
    let attempts = 0;

    while (attempts < 50) {
      const conflict = resolved.find((blockedTask) =>
        overlaps(
          { start: nextStart, end: nextEnd },
          {
            start: timeToMinutes(blockedTask.start),
            end: getEndMinutes(blockedTask),
          }
        )
      );

      if (!conflict) {
        break;
      }

      nextStart = getEndMinutes(conflict);
      nextEnd = nextStart + duration;
      attempts++;
    }

    if (nextEnd > DAY_END) {
      resolved.push({
        ...task,
        planningWarning:
          "Diese Aufgabe passt heute nicht mehr sauber in den Plan.",
      });

      continue;
    }

    const wasMoved =
      minutesToTime(nextStart) !== originalStart ||
      minutesToTime(nextEnd) !== originalEnd;

    resolved.push({
      ...task,
      start: minutesToTime(nextStart),
      end: minutesToTime(nextEnd),
      rescheduledFrom: wasMoved
        ? {
            start: originalStart,
            end: originalEnd,
          }
        : undefined,
    });
  }

  return resolved.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}