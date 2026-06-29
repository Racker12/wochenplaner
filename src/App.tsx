import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { Task } from "./planner/types";
import { DAYS, SHOPPING_LIST, createDefaultWeek } from "./data/defaults";
import { resolveDaySchedule, timeToMinutes } from "./planner/scheduler";

type ShoppingItem = {
  id: string;
  text: string;
  done: boolean;
};

type ShoppingLists = Record<string, ShoppingItem[]>;

const SHOPPING_DAYS = ["Montag", "Mittwoch", "Freitag"];
const SHOPPING_STORAGE_KEY = "wochenplaner.shoppingLists.v1";
const EXTRA_TASKS_STORAGE_KEY = "wochenplaner.extraTasks.v1";
const CHECKED_TASKS_STORAGE_KEY = "wochenplaner.checkedTasks.v1";

function getCurrentDayName() {
  const dayIndex = new Date().getDay();
  return DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
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

          <button className="secondary day-reset" onClick={resetDayProgress}>
            Haken für diesen Tag zurücksetzen
          </button>

          <div className="timeline">
            {dayTasks.map((task) => (
              <article key={task.id} className={`task ${task.type}`}>
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
            ))}
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