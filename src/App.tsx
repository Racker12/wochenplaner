import { Fragment, useEffect, useMemo, useState } from "react";
import "./App.css";
import type { Task, TaskType } from "./planner/types";
import { DAYS, SHOPPING_LIST, createDefaultWeek } from "./data/defaults";
import { resolveDaySchedule, timeToMinutes } from "./planner/scheduler";

type ShoppingItem = {
  id: string;
  text: string;
  done: boolean;
};

type ShoppingLists = Record<string, ShoppingItem[]>;

type CalendarEventExport = {
  id: string;
  weekOffset: number;
  day: string;
  start: string;
  end: string;
  title: string;
  type: TaskType;
  notes: string;
};

const SHOPPING_DAYS = ["Montag", "Mittwoch", "Freitag"];
const SHOPPING_STORAGE_KEY = "wochenplaner.shoppingLists.v1";
const EXTRA_TASKS_STORAGE_KEY = "wochenplaner.extraTasks.v1";
const CHECKED_TASKS_STORAGE_KEY = "wochenplaner.checkedTasks.v1";

function getCurrentDayName() {
  const dayIndex = new Date().getDay();
  return DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
}

function getTaskEndMinutes(task: Task) {
  const start = timeToMinutes(task.start);
  const end = timeToMinutes(task.end);

  if (end <= start) {
    return 24 * 60;
  }

  return end;
}

function createDefaultShoppingItems(): ShoppingItem[] {
  return SHOPPING_LIST.map((item) => ({
    id: `default-${item}`,
    text: item,
    done: false,
  }));
}

function createInitialShoppingLists(): ShoppingLists {
  const lists: ShoppingLists = {};

  for (const weekOffset of [0, 1]) {
    for (const day of SHOPPING_DAYS) {
      lists[`${weekOffset}-${day}`] = createDefaultShoppingItems();
    }
  }

  return lists;
}

function loadShoppingLists(): ShoppingLists {
  try {
    const saved = localStorage.getItem(SHOPPING_STORAGE_KEY);

    if (!saved) {
      return createInitialShoppingLists();
    }

    return JSON.parse(saved) as ShoppingLists;
  } catch {
    return createInitialShoppingLists();
  }
}

function loadExtraTasks(): Task[] {
  try {
    const saved = localStorage.getItem(EXTRA_TASKS_STORAGE_KEY);

    if (!saved) {
      return [];
    }

    return JSON.parse(saved) as Task[];
  } catch {
    return [];
  }
}

function loadCheckedTasks(): string[] {
  try {
    const saved = localStorage.getItem(CHECKED_TASKS_STORAGE_KEY);

    if (!saved) {
      return [];
    }

    return JSON.parse(saved) as string[];
  } catch {
    return [];
  }
}

function App() {
  const [now, setNow] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(getCurrentDayName());
  const [weekOffset, setWeekOffset] = useState(0);
  const [checked, setChecked] = useState<string[]>(() => loadCheckedTasks());
  const [extraTitle, setExtraTitle] = useState("");
  const [extraStart, setExtraStart] = useState("");
  const [extraEnd, setExtraEnd] = useState("");
  const [extraTasks, setExtraTasks] = useState<Task[]>(() => loadExtraTasks());
  const [shoppingLists, setShoppingLists] = useState<ShoppingLists>(() =>
    loadShoppingLists()
  );
  const [newShoppingItem, setNewShoppingItem] = useState("");

  const baseTasks = useMemo(() => createDefaultWeek(), []);

  const currentWeekExtraTasks = extraTasks.filter(
    (task) => task.weekOffset === weekOffset
  );

  const allTasks = [...baseTasks, ...currentWeekExtraTasks].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  const dayTasks = resolveDaySchedule(allTasks, selectedDay);

  const currentDayName = getCurrentDayName();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const formattedNow = now.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isViewingToday = weekOffset === 0 && selectedDay === currentDayName;

  const shoppingKey = `${weekOffset}-${selectedDay}`;
  const isShoppingDay = SHOPPING_DAYS.includes(selectedDay);
  const currentShoppingList =
    shoppingLists[shoppingKey] ?? createDefaultShoppingItems();

  const getTaskDoneKey = (task: Task) => {
    return `${weekOffset}-${task.id}`;
  };

  const isTaskDone = (task: Task) => {
    return checked.includes(getTaskDoneKey(task));
  };

  const getTaskStatus = (task: Task) => {
    if (!isViewingToday) {
      return "normal";
    }

    const start = timeToMinutes(task.start);
    const end = getTaskEndMinutes(task);

    if (currentMinutes >= end) {
      return "past";
    }

    if (currentMinutes >= start && currentMinutes < end) {
      return "current";
    }

    return "normal";
  };

  const getCurrentLinePosition = (task: Task) => {
    const start = timeToMinutes(task.start);
    const end = getTaskEndMinutes(task);
    const duration = end - start;

    if (duration <= 0) {
      return 0;
    }

    const progress = ((currentMinutes - start) / duration) * 100;

    return Math.min(100, Math.max(0, progress));
  };

  const shouldShowLineBeforeTask = (task: Task, index: number) => {
    if (!isViewingToday) {
      return false;
    }

    const taskStart = timeToMinutes(task.start);

    if (index === 0) {
      return currentMinutes < taskStart;
    }

    const previousTask = dayTasks[index - 1];
    const previousEnd = getTaskEndMinutes(previousTask);

    return currentMinutes >= previousEnd && currentMinutes < taskStart;
  };

  const shouldShowLineAfterLastTask = () => {
    if (!isViewingToday || dayTasks.length === 0) {
      return false;
    }

    const lastTask = dayTasks[dayTasks.length - 1];
    return currentMinutes >= getTaskEndMinutes(lastTask);
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem(SHOPPING_STORAGE_KEY, JSON.stringify(shoppingLists));
  }, [shoppingLists]);

  useEffect(() => {
    localStorage.setItem(EXTRA_TASKS_STORAGE_KEY, JSON.stringify(extraTasks));
  }, [extraTasks]);

  useEffect(() => {
    localStorage.setItem(CHECKED_TASKS_STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  const addExtraTask = () => {
    if (!extraTitle || !extraStart || !extraEnd) return;

    const newTask: Task = {
      id: `${weekOffset}-${selectedDay}-${extraStart}-${extraTitle}-${Date.now()}`,
      day: selectedDay,
      start: extraStart,
      end: extraEnd,
      title: extraTitle,
      type: "free",
      fixed: true,
      weekOffset,
    };

    setExtraTasks([...extraTasks, newTask]);
    setExtraTitle("");
    setExtraStart("");
    setExtraEnd("");
  };

  const deleteExtraTask = (id: string) => {
    setExtraTasks((old) => old.filter((task) => task.id !== id));
  };

  const toggleDone = (task: Task) => {
    const doneKey = getTaskDoneKey(task);

    setChecked((old) =>
      old.includes(doneKey)
        ? old.filter((item) => item !== doneKey)
        : [...old, doneKey]
    );
  };

  const updateCurrentShoppingList = (
    updater: (items: ShoppingItem[]) => ShoppingItem[]
  ) => {
    setShoppingLists((old) => {
      const current = old[shoppingKey] ?? createDefaultShoppingItems();

      return {
        ...old,
        [shoppingKey]: updater(current),
      };
    });
  };

  const toggleShoppingItem = (id: string) => {
    updateCurrentShoppingList((items) =>
      items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  };

  const addShoppingItem = () => {
    const text = newShoppingItem.trim();

    if (!text) return;

    updateCurrentShoppingList((items) => [
      ...items,
      {
        id: `custom-${Date.now()}`,
        text,
        done: false,
      },
    ]);

    setNewShoppingItem("");
  };

  const deleteShoppingItem = (id: string) => {
    updateCurrentShoppingList((items) =>
      items.filter((item) => item.id !== id)
    );
  };

  const resetShoppingList = () => {
    updateCurrentShoppingList(() => createDefaultShoppingItems());
  };

  const resetDayProgress = () => {
    const currentDayKeys = dayTasks.map((task) => getTaskDoneKey(task));

    setChecked((old) =>
      old.filter((checkedKey) => !currentDayKeys.includes(checkedKey))
    );
  };

  const getShoppingNotesForTask = (task: Task, exportWeekOffset: number) => {
    if (task.type !== "shopping") {
      return "";
    }

    const key = `${exportWeekOffset}-${task.day}`;
    const list = shoppingLists[key] ?? createDefaultShoppingItems();

    if (list.length === 0) {
      return "Einkaufsliste:\n- Keine Einträge";
    }

    return (
      "Einkaufsliste:\n" +
      list
        .map((item) => {
          const box = item.done ? "☑" : "☐";
          return `${box} ${item.text}`;
        })
        .join("\n")
    );
  };

  const buildCalendarEvents = (): CalendarEventExport[] => {
    const events: CalendarEventExport[] = [];

    for (const exportWeekOffset of [0, 1]) {
      const weekExtraTasks = extraTasks.filter(
        (task) => task.weekOffset === exportWeekOffset
      );

      const weekTasks = [...baseTasks, ...weekExtraTasks];

      for (const day of DAYS) {
        const resolvedDayTasks = resolveDaySchedule(weekTasks, day);

        for (const task of resolvedDayTasks) {
          const notesParts = [
            `Quelle: ${
              task.weekOffset !== undefined ? "spontaner Termin" : "Standardplan"
            }`,
            `Woche: ${
              exportWeekOffset === 0 ? "diese Woche" : "nächste Woche"
            }`,
            `Tag: ${task.day}`,
            `Zeit: ${task.start}–${task.end}`,
          ];

          if (task.rescheduledFrom) {
            notesParts.push(
              `Verschoben von: ${task.rescheduledFrom.start}–${task.rescheduledFrom.end}`
            );
          }

          if (task.planningWarning) {
            notesParts.push(`Warnung: ${task.planningWarning}`);
          }

          const shoppingNotes = getShoppingNotesForTask(task, exportWeekOffset);

          if (shoppingNotes) {
            notesParts.push("");
            notesParts.push(shoppingNotes);
          }

          events.push({
            id: `${exportWeekOffset}-${task.id}`,
            weekOffset: exportWeekOffset,
            day: task.day,
            start: task.start,
            end: task.end,
            title: task.title,
            type: task.type,
            notes: notesParts.join("\n"),
          });
        }
      }
    }

    return events;
  };

  const exportGithubData = async () => {
    const calendarEvents = buildCalendarEvents();

    const exportData = {
      version: 1,
      updatedAt: new Date().toISOString(),
      extraTasks,
      checkedTasks: checked,
      shoppingLists,
      calendarEvents,
    };

    const json = JSON.stringify(exportData, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      alert(
        `GitHub-Daten wurden in die Zwischenablage kopiert.\n\nKalendertermine: ${calendarEvents.length}`
      );
    } catch {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "wochenplaner-data.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    }
  };

  const nextTask = dayTasks.find((task) => !isTaskDone(task));

  return (
    <main className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Wochenplaner PWA</p>
          <h1>Dein Tagesassistent</h1>
          <p className="subtitle">
            Folge einfach dem nächsten Block. Weniger denken, mehr machen.
          </p>
        </div>

        <div className="week-switch">
          <button
            className={weekOffset === 0 ? "active-switch" : ""}
            onClick={() => setWeekOffset(0)}
          >
            Diese Woche
          </button>

          <button
            className={weekOffset === 1 ? "active-switch" : ""}
            onClick={() => setWeekOffset(1)}
          >
            Nächste Woche
          </button>
        </div>
      </header>

      <section className="now-card">
        <p className="eyebrow">Jetzt als Nächstes</p>
        <h2>{nextTask ? nextTask.title : "Alles erledigt 🎉"}</h2>

        {nextTask && (
          <p>
            {nextTask.start} – {nextTask.end}
          </p>
        )}
      </section>

      <nav className="days">
        {DAYS.map((day) => (
          <button
            key={day}
            className={selectedDay === day ? "active" : ""}
            onClick={() => setSelectedDay(day)}
          >
            {day.slice(0, 2)}
          </button>
        ))}
      </nav>

      <section className="grid">
        <div className="panel">
          <h2>
            {selectedDay}{" "}
            <span>{weekOffset === 0 ? "diese Woche" : "nächste Woche"}</span>
          </h2>

          {isViewingToday && (
            <p className="current-time-hint">Aktuelle Zeit: {formattedNow}</p>
          )}

          <button className="secondary day-reset" onClick={resetDayProgress}>
            Haken für diesen Tag zurücksetzen
          </button>

          <div className="timeline">
            {dayTasks.map((task, index) => {
              const status = getTaskStatus(task);
              const isCurrentTask = status === "current";
              const isPastTask = status === "past";

              return (
                <Fragment key={task.id}>
                  {shouldShowLineBeforeTask(task, index) && (
                    <div className="time-gap-line">
                      <span>{formattedNow}</span>
                    </div>
                  )}

                  <article
                    className={`task ${task.type} ${
                      isPastTask ? "past-task" : ""
                    } ${isCurrentTask ? "current-task" : ""}`}
                  >
                    {isCurrentTask && (
                      <div
                        className="current-time-line"
                        style={{
                          top: `${getCurrentLinePosition(task)}%`,
                        }}
                      >
                        <span>{formattedNow}</span>
                      </div>
                    )}

                    <div className="time">
                      {task.start}
                      <br />
                      {task.end}
                    </div>

                    <div className="task-content">
                      <h3>{task.title}</h3>

                      <p>
                        {task.fixed ? "Fixer Termin" : "Verschiebbar"} ·{" "}
                        {task.weekOffset !== undefined
                          ? "Spontaner Termin"
                          : task.type}
                      </p>

                      {task.rescheduledFrom && (
                        <p className="rescheduled-note">
                          Verschoben von {task.rescheduledFrom.start}–
                          {task.rescheduledFrom.end}
                        </p>
                      )}

                      {task.planningWarning && (
                        <p className="warning-note">{task.planningWarning}</p>
                      )}
                    </div>

                    {task.weekOffset !== undefined ? (
                      <button
                        className="delete-button"
                        onClick={() => deleteExtraTask(task.id)}
                        aria-label={`${task.title} löschen`}
                      >
                        ×
                      </button>
                    ) : (
                      <button
                        className={isTaskDone(task) ? "done" : ""}
                        onClick={() => toggleDone(task)}
                      >
                        {isTaskDone(task) ? "✓" : "○"}
                      </button>
                    )}
                  </article>
                </Fragment>
              );
            })}

            {shouldShowLineAfterLastTask() && (
              <div className="time-gap-line after-last">
                <span>{formattedNow}</span>
              </div>
            )}
          </div>
        </div>

        <aside className="panel side">
          <h2>Spontan einfügen</h2>

          <p className="muted">
            {weekOffset === 0 ? "Diese Woche" : "Nächste Woche"} ·{" "}
            {selectedDay}
          </p>

          <input
            value={extraTitle}
            onChange={(e) => setExtraTitle(e.target.value)}
            placeholder="z. B. Arzttermin"
          />

          <div className="row">
            <input
              type="time"
              value={extraStart}
              onChange={(e) => setExtraStart(e.target.value)}
            />

            <input
              type="time"
              value={extraEnd}
              onChange={(e) => setExtraEnd(e.target.value)}
            />
          </div>

          <button className="primary" onClick={addExtraTask}>
            Termin hinzufügen
          </button>

          <hr />

          <h2>Einkaufsliste</h2>

          <p className="muted">
            {weekOffset === 0 ? "Diese Woche" : "Nächste Woche"} ·{" "}
            {selectedDay}
          </p>

          {isShoppingDay ? (
            <>
              <div className="shopping-add">
                <input
                  value={newShoppingItem}
                  onChange={(e) => setNewShoppingItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addShoppingItem();
                  }}
                  placeholder="Produkt hinzufügen"
                />

                <button className="primary" onClick={addShoppingItem}>
                  +
                </button>
              </div>

              <ul className="shopping-list">
                {currentShoppingList.map((item) => (
                  <li key={item.id} className={item.done ? "checked-item" : ""}>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleShoppingItem(item.id)}
                      />
                      {item.text}
                    </label>

                    <button
                      className="delete-button"
                      onClick={() => deleteShoppingItem(item.id)}
                      aria-label={`${item.text} löschen`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <button className="secondary" onClick={resetShoppingList}>
                Einkaufsliste zurücksetzen
              </button>
            </>
          ) : (
            <p className="muted">Heute ist kein Einkaufstag.</p>
          )}

          <hr />

          <h2>GitHub Sync</h2>

          <p className="muted">
            Kopiere deine aktuellen Termine, Haken, Einkaufslisten und
            Kalenderdaten als JSON-Daten für Scriptable.
          </p>

          <button className="secondary" onClick={exportGithubData}>
            GitHub-Daten kopieren
          </button>

          <hr />

          <h2>Regeln</h2>

          <ul className="rules">
            <li>Schlaf: 22:00–06:00</li>
            <li>Lernen: 1,5 h täglich</li>
            <li>Gym: Mo/Mi/Fr</li>
            <li>Cardio: Di/Do/Sa</li>
            <li>Sonntag frei</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}

export default App;