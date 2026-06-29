import type { Task, TaskType } from "../planner/types";

export const DAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

export const SHOPPING_LIST = [
  "Haferflocken",
  "Eier",
  "Milch",
  "Reis",
  "Hähnchen",
  "Gemüse",
  "Obst",
  "Joghurt",
];

export function createDefaultWeek(): Task[] {
  const tasks: Task[] = [];

  const add = (
    day: string,
    start: string,
    end: string,
    title: string,
    type: TaskType,
    fixed = false
  ) => {
    tasks.push({
      id: `${day}-${start}-${title}`,
      day,
      start,
      end,
      title,
      type,
      fixed,
    });
  };

  for (const day of DAYS) {
    if (day === "Sonntag") {
      add(day, "00:00", "23:59", "Komplett frei", "free", true);
      continue;
    }

    add(day, "06:00", "06:30", "Aufstehen & Frühstück", "routine", true);

    if (day === "Montag") {
      add(day, "06:30", "06:45", "Zum Gym fahren", "sport");
      add(day, "06:45", "09:00", "Gym – Push inkl. Duschen", "sport");
      add(day, "09:00", "09:15", "Heimweg", "sport");
    }

    if (day === "Dienstag") {
      add(day, "06:30", "07:30", "Laufen", "sport");
      add(day, "07:30", "08:00", "Duschen zuhause", "routine");
      add(day, "08:00", "09:00", "Wäsche", "household");
    }

    if (day === "Mittwoch") {
      add(day, "06:30", "06:45", "Zum Gym fahren", "sport");
      add(day, "06:45", "09:00", "Gym – Pull inkl. Duschen", "sport");
      add(day, "09:00", "09:15", "Heimweg", "sport");
    }

    if (day === "Donnerstag") {
      add(day, "06:30", "07:00", "Zum Schwimmen fahren", "sport");
      add(day, "07:00", "08:30", "Schwimmen", "sport");
      add(day, "08:30", "09:00", "Rückfahrt", "sport");
      add(day, "09:00", "09:30", "Duschen", "routine");
      add(day, "09:30", "10:30", "Wäsche", "household");
    }

    if (day === "Freitag") {
      add(day, "06:30", "06:45", "Zum Gym fahren", "sport");
      add(day, "06:45", "09:00", "Gym – Legs inkl. Duschen", "sport");
      add(day, "09:00", "09:15", "Heimweg", "sport");
    }

    if (day === "Samstag") {
      add(day, "06:30", "08:00", "Cardio: Laufen oder Schwimmen", "sport");
      add(day, "08:00", "08:30", "Duschen", "routine");
    }

    if (day === "Dienstag") {
      add(day, "09:00", "10:30", "Lernen", "study");
    } else if (day === "Donnerstag") {
      add(day, "10:30", "12:00", "Lernen", "study");
    } else {
      add(day, "09:15", "10:45", "Lernen", "study");
    }

    add(day, "10:45", "11:45", "Kochen", "food");
    add(day, "11:45", "12:30", "Warm essen", "food");

    if (["Montag", "Mittwoch", "Freitag"].includes(day)) {
      add(day, "12:30", "13:15", "Einkaufen", "shopping");
    }

    if (day === "Freitag") {
      add(day, "13:15", "14:45", "Wohnung putzen", "household");
    }

    add(day, "14:45", "15:30", "Puffer", "buffer");

    if (day === "Dienstag") {
      add(day, "15:30", "16:00", "Nachhilfe vorbereiten", "tutoring", true);
      add(day, "16:00", "17:00", "Nachhilfe", "tutoring", true);
    }

    if (day === "Mittwoch") {
      add(day, "17:30", "18:00", "Nachhilfe vorbereiten", "tutoring", true);
      add(day, "18:00", "19:00", "Nachhilfe", "tutoring", true);
    }

    if (day === "Donnerstag") {
      add(day, "15:30", "16:00", "Nachhilfe vorbereiten", "tutoring", true);
      add(day, "16:00", "17:00", "Nachhilfe", "tutoring", true);
    }

    add(day, "21:00", "22:00", "Abendroutine", "routine", true);
    add(day, "22:00", "06:00", "Schlafen", "sleep", true);
  }

  return tasks;
}