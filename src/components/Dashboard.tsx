import { useEffect, useState } from "react";

type Priority = "High" | "Medium" | "Low";
type SortOption = "dueDate" | "priority" | "createdAt" | "alphabetical";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
};

type StudySession = {
  id: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
};

type Project = {
  id: string;
  name: string;
};

type DashboardProps = {
  projects: Project[];
  selectedProjectId: string;
};

const priorityIndicators: Record<Priority, string> = {
  High: "🔴",
  Medium: "🟡",
  Low: "🟢",
};

const priorityOrder: Record<Priority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

function createTaskId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function createStudySessionId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function isPriority(value: unknown): value is Priority {
  return value === "High" || value === "Medium" || value === "Low";
}

function createTask({
  title,
  dueDate,
  priority = "Medium",
  projectId = "inbox",
}: {
  title: string;
  dueDate?: string;
  priority?: Priority;
  projectId?: string;
}): Task {
  const now = new Date().toISOString();

  return {
    id: createTaskId(),
    title,
    completed: false,
    priority,
    dueDate,
    projectId,
    createdAt: now,
    updatedAt: now,
  };
}

function getDefaultTasks() {
  return [
    createTask({ title: "英検1級" }),
    createTask({ title: "数学" }),
    createTask({ title: "ジム" }),
  ];
}

function migrateTasks(saved: string | null, projects: Project[]): Task[] {
  if (!saved) return getDefaultTasks();

  try {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return getDefaultTasks();

    return parsed
      .filter(
        (task): task is Record<string, unknown> =>
          typeof task === "object" && task !== null && !Array.isArray(task),
      )
      .map((task) => {
        const now = new Date().toISOString();
        const title =
          typeof task.title === "string"
            ? task.title
            : typeof task.text === "string"
              ? task.text
              : "Untitled task";

        return {
          id: typeof task.id === "string" && task.id ? task.id : createTaskId(),
          title,
          completed: task.completed === true,
          priority: isPriority(task.priority) ? task.priority : "Medium",
          dueDate:
            typeof task.dueDate === "string" && task.dueDate
              ? task.dueDate
              : undefined,
          projectId:
            typeof task.projectId === "string" &&
            projects.some((project) => project.id === task.projectId)
              ? task.projectId
              : "inbox",
          createdAt:
            typeof task.createdAt === "string" && task.createdAt
              ? task.createdAt
              : now,
          updatedAt:
            typeof task.updatedAt === "string" && task.updatedAt
              ? task.updatedAt
              : now,
        };
      });
  } catch {
    return getDefaultTasks();
  }
}

function loadStudySessions(saved: string | null): StudySession[] {
  if (!saved) return [];

  try {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (session): session is Record<string, unknown> =>
          typeof session === "object" && session !== null && !Array.isArray(session),
      )
      .filter(
        (session) =>
          typeof session.taskId === "string" &&
          typeof session.startTime === "string" &&
          !Number.isNaN(Date.parse(session.startTime)),
      )
      .map((session) => {
        const endTime =
          typeof session.endTime === "string" &&
          !Number.isNaN(Date.parse(session.endTime))
            ? session.endTime
            : undefined;
        const calculatedDuration = endTime
          ? Math.max(0, Date.parse(endTime) - Date.parse(session.startTime as string))
          : undefined;

        return {
          id:
            typeof session.id === "string" && session.id
              ? session.id
              : createStudySessionId(),
          taskId: session.taskId as string,
          startTime: session.startTime as string,
          endTime,
          duration:
            typeof session.duration === "number" && session.duration >= 0
              ? session.duration
              : calculatedDuration,
        };
      });
  } catch {
    return [];
  }
}

function getSessionDuration(session: StudySession) {
  if (typeof session.duration === "number") return session.duration;
  if (!session.endTime) return 0;

  return Math.max(0, Date.parse(session.endTime) - Date.parse(session.startTime));
}

function formatDuration(duration: number) {
  const totalMinutes = Math.floor(duration / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function getTotalStudyDuration(taskId: string, sessions: StudySession[]) {
  return sessions.reduce(
    (total, session) =>
      session.taskId === taskId ? total + getSessionDuration(session) : total,
    0,
  );
}

function getTodayStudyDuration(taskId: string, sessions: StudySession[]) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  return sessions.reduce((total, session) => {
    if (session.taskId !== taskId || !session.endTime) return total;

    const sessionStart = new Date(session.startTime).getTime();
    const sessionEnd = new Date(session.endTime).getTime();
    const overlapStart = Math.max(sessionStart, todayStart.getTime());
    const overlapEnd = Math.min(sessionEnd, tomorrowStart.getTime());

    return total + Math.max(0, overlapEnd - overlapStart);
  }, 0);
}

function getStudyDurationInRange(
  sessions: StudySession[],
  rangeStart: Date,
  rangeEnd: Date,
) {
  return sessions.reduce((total, session) => {
    if (!session.endTime) return total;

    const sessionStart = new Date(session.startTime).getTime();
    const sessionEnd = new Date(session.endTime).getTime();
    const overlapStart = Math.max(sessionStart, rangeStart.getTime());
    const overlapEnd = Math.min(sessionEnd, rangeEnd.getTime());

    return total + Math.max(0, overlapEnd - overlapStart);
  }, 0);
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRecommendationRank(task: Task, today: string) {
  if (task.dueDate && task.dueDate < today) return 0;
  if (task.dueDate === today) return 1;
  if (task.priority === "High") return 2;
  return 3;
}

function getRecommendationReason(
  task: Task,
  today: string,
  todayStudyTime: number,
) {
  if (task.dueDate && task.dueDate < today) return "Overdue";
  if (task.dueDate === today) return "Due today";
  if (task.priority === "High") return "High priority";
  if (todayStudyTime === 0) return "No study recorded today";
  return "Least studied today";
}

function TodayTaskSection({
  title,
  tasks,
}: {
  title: string;
  tasks: Task[];
}) {
  return (
    <div className="card" style={{ marginTop: 0, padding: "20px" }}>
      <h2>{title}</h2>
      {tasks.length === 0 ? (
        <p>No tasks</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id} style={{ listStyle: "none", marginTop: "8px" }}>
              {priorityIndicators[task.priority]} {task.completed ? "✅" : "⬜"}{" "}
              {task.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Dashboard({ projects, selectedProjectId }: DashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(() =>
    migrateTasks(localStorage.getItem("tasks"), projects),
  );
  const [studySessions, setStudySessions] = useState<StudySession[]>(() =>
    loadStudySessions(localStorage.getItem("studySessions")),
  );

  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [projectId, setProjectId] = useState("inbox");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("createdAt");

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("studySessions", JSON.stringify(studySessions));
  }, [studySessions]);

  function addTask() {
    if (input.trim() === "") return;

    setTasks([
      ...tasks,
      createTask({
        title: input,
        dueDate: dueDate || undefined,
        priority,
        projectId,
      }),
    ]);

    setInput("");
    setDueDate("");
    setPriority("Medium");
    setProjectId("inbox");
  }

  function deleteTask(id: string) {
    setTasks(tasks.filter((task) => task.id !== id));
    setEditingId(null);
  }

  function toggleTask(id: string) {
    const updatedAt = new Date().toISOString();
    setTasks(
      tasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed, updatedAt }
          : task,
      ),
    );
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setEditingText(task.title);
  }

  function saveTask(id: string) {
    const title = editingText.trim();
    if (title === "") return;

    setTasks(
      tasks.map((task) =>
        task.id === id
          ? { ...task, title, updatedAt: new Date().toISOString() }
          : task,
      ),
    );
    setEditingId(null);
  }

  function startStudy(taskId: string) {
    if (studySessions.some((session) => session.taskId === taskId && !session.endTime)) {
      return;
    }

    setStudySessions([
      ...studySessions,
      {
        id: createStudySessionId(),
        taskId,
        startTime: new Date().toISOString(),
      },
    ]);
  }

  function stopStudy(taskId: string) {
    const endTime = new Date().toISOString();

    setStudySessions(
      studySessions.map((session) =>
        session.taskId === taskId && !session.endTime
          ? {
              ...session,
              endTime,
              duration: Math.max(
                0,
                Date.parse(endTime) - Date.parse(session.startTime),
              ),
            }
          : session,
      ),
    );
  }

  const completedTasks = tasks.filter((task) => task.completed).length;
  const remainingTasks = tasks.length - completedTasks;
  const highPriorityTasks = tasks.filter(
    (task) => task.priority === "High",
  ).length;
  const mediumPriorityTasks = tasks.filter(
    (task) => task.priority === "Medium",
  ).length;
  const lowPriorityTasks = tasks.filter(
    (task) => task.priority === "Low",
  ).length;
  const filteredTasks = tasks.filter(
    (task) => task.projectId === selectedProjectId,
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchedTasks = filteredTasks.filter((task) => {
    const projectName =
      projects.find((project) => project.id === task.projectId)?.name ?? "Inbox";

    return (
      task.title.toLowerCase().includes(normalizedSearchQuery) ||
      projectName.toLowerCase().includes(normalizedSearchQuery)
    );
  });
  const sortedTasks = [...searchedTasks].sort((firstTask, secondTask) => {
    if (sortBy === "dueDate") {
      if (!firstTask.dueDate && !secondTask.dueDate) return 0;
      if (!firstTask.dueDate) return 1;
      if (!secondTask.dueDate) return -1;
      return firstTask.dueDate.localeCompare(secondTask.dueDate);
    }

    if (sortBy === "priority") {
      return priorityOrder[firstTask.priority] - priorityOrder[secondTask.priority];
    }

    if (sortBy === "alphabetical") {
      return firstTask.title.localeCompare(secondTask.title);
    }

    return secondTask.createdAt.localeCompare(firstTask.createdAt);
  });
  const today = getLocalDateString(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = getLocalDateString(tomorrow);
  const overdueTasks = filteredTasks.filter(
    (task) => task.dueDate && task.dueDate < today,
  );
  const dueTodayTasks = filteredTasks.filter(
    (task) => task.dueDate === today,
  );
  const dueTomorrowTasks = filteredTasks.filter(
    (task) => task.dueDate === tomorrowDate,
  );
  const todayStudyTimesByTask = new Map(
    tasks.map((task) => [
      task.id,
      getTodayStudyDuration(task.id, studySessions),
    ]),
  );
  const recommendedTasks = tasks
    .filter((task) => !task.completed)
    .sort((firstTask, secondTask) => {
      const rankDifference =
        getRecommendationRank(firstTask, today) -
        getRecommendationRank(secondTask, today);
      if (rankDifference !== 0) return rankDifference;

      const studyDifference =
        (todayStudyTimesByTask.get(firstTask.id) ?? 0) -
        (todayStudyTimesByTask.get(secondTask.id) ?? 0);
      if (studyDifference !== 0) return studyDifference;

      return (firstTask.dueDate ?? "9999-12-31").localeCompare(
        secondTask.dueDate ?? "9999-12-31",
      );
    })
    .slice(0, 3);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStudyTime = getStudyDurationInRange(
    studySessions,
    startOfToday,
    now,
  );
  const weekStudyTime = getStudyDurationInRange(
    studySessions,
    startOfWeek,
    now,
  );
  const monthStudyTime = getStudyDurationInRange(
    studySessions,
    startOfMonth,
    now,
  );
  const averageDailyStudyTime = monthStudyTime / now.getDate();
  const projectStudyTimes = projects.map((project) => {
    const projectTaskIds = new Set(
      tasks
        .filter((task) => task.projectId === project.id)
        .map((task) => task.id),
    );

    return {
      project,
      duration: studySessions.reduce(
        (total, session) =>
          projectTaskIds.has(session.taskId)
            ? total + getSessionDuration(session)
            : total,
        0,
      ),
    };
  });

  return (
    <>
      <h1>Dashboard</h1>

      <section className="card" aria-label="学習のおすすめ" style={{ marginTop: 0, marginBottom: "20px" }}>
        <h2>Study Recommendation</h2>
        {recommendedTasks.length === 0 ? (
          <p style={{ marginTop: "10px" }}>No tasks to recommend.</p>
        ) : (
          <ul style={{ marginTop: "12px" }}>
            {recommendedTasks.map((task) => {
              const projectName =
                projects.find((project) => project.id === task.projectId)?.name ??
                "Inbox";
              const todayStudyTime = todayStudyTimesByTask.get(task.id) ?? 0;

              return (
                <li key={task.id} style={{ marginTop: "10px" }}>
                  <strong>{task.title}</strong>
                  <p style={{ marginTop: "3px" }}>
                    📁 {projectName} · {priorityIndicators[task.priority]} {task.priority}
                  </p>
                  <p style={{ marginTop: "3px" }}>
                    {getRecommendationReason(task, today, todayStudyTime)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        aria-label="今日の予定"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <TodayTaskSection title="Overdue" tasks={overdueTasks} />
        <TodayTaskSection title="Due Today" tasks={dueTodayTasks} />
        <TodayTaskSection title="Due Tomorrow" tasks={dueTomorrowTasks} />
      </section>

      <section
        aria-label="タスク概要"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "15px",
        }}
      >
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <p>Total tasks</p>
          <h2>{tasks.length}</h2>
        </div>
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <p>Completed tasks</p>
          <h2>{completedTasks}</h2>
        </div>
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <p>Remaining tasks</p>
          <h2>{remainingTasks}</h2>
        </div>
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <p>🔴 High</p>
          <h2>{highPriorityTasks}</h2>
        </div>
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <p>🟡 Medium</p>
          <h2>{mediumPriorityTasks}</h2>
        </div>
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <p>🟢 Low</p>
          <h2>{lowPriorityTasks}</h2>
        </div>
      </section>

      <h2 style={{ margin: "28px 0 12px" }}>Study Analytics</h2>
      <section
        aria-label="学習分析"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
        }}
      >
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <p>Today's study time</p>
          <h2>{formatDuration(todayStudyTime)}</h2>
        </div>
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <p>This week's study time</p>
          <h2>{formatDuration(weekStudyTime)}</h2>
        </div>
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <p>This month's study time</p>
          <h2>{formatDuration(monthStudyTime)}</h2>
        </div>
        <div className="card" style={{ marginTop: 0, padding: "20px" }}>
          <p>Average daily study time</p>
          <h2>{formatDuration(averageDailyStudyTime)}</h2>
        </div>
      </section>

      <h2 style={{ margin: "28px 0 12px" }}>Study Time by Project</h2>
      <section
        aria-label="プロジェクト別学習時間"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
        }}
      >
        {projectStudyTimes.map(({ project, duration }) => (
          <div key={project.id} className="card" style={{ marginTop: 0, padding: "20px" }}>
            <p>📁 {project.name}</p>
            <h2>{formatDuration(duration)}</h2>
          </div>
        ))}
      </section>

      <div className="card">
        <h2>今日のタスク</h2>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="タスクを入力"
          />

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="期限日"
          />

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            aria-label="優先度"
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="プロジェクト"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <button onClick={addTask}>追加</button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "15px",
          }}
        >
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks or projects"
            aria-label="タスクを検索"
          />

          <label>
            Sort by {" "}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="dueDate">Due date</option>
              <option value="priority">Priority</option>
              <option value="createdAt">Created date</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </label>
        </div>

        {sortedTasks.length === 0 ? (
          <p>No matching tasks.</p>
        ) : (
          <ul>
            {sortedTasks.map((task) => (
            <li
              key={task.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <div>
                {editingId === task.id ? (
                  <>
                    {priorityIndicators[task.priority]} {" "}
                    <input
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTask(task.id);
                      }}
                      autoFocus
                      aria-label="タスクを編集"
                    />
                  </>
                ) : (
                  <span
                    onClick={() => toggleTask(task.id)}
                    style={{ cursor: "pointer" }}
                  >
                    {priorityIndicators[task.priority]} {task.completed ? "✅" : "⬜"}{" "}
                    {task.title}
                  </span>
                )}

                <div style={{ fontSize: "14px", marginTop: "4px" }}>
                  {task.dueDate ? task.dueDate : "No due date"}
                </div>
                <div style={{ fontSize: "14px", marginTop: "4px" }}>
                  {projects.find((project) => project.id === task.projectId)
                    ?.name ?? "Inbox"}
                </div>
                <div style={{ fontSize: "14px", marginTop: "4px" }}>
                  Today's study time: {formatDuration(getTodayStudyDuration(task.id, studySessions))}
                </div>
                <div style={{ fontSize: "14px", marginTop: "4px" }}>
                  Total study time: {formatDuration(getTotalStudyDuration(task.id, studySessions))}
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "flex-end" }}>
                {editingId === task.id ? (
                  <button onClick={() => saveTask(task.id)}>保存</button>
                ) : (
                  <button onClick={() => startEditing(task)} aria-label="編集">
                    ✏️
                  </button>
                )}

                <button onClick={() => deleteTask(task.id)} aria-label="削除">
                  🗑️
                </button>
                <button
                  onClick={() => startStudy(task.id)}
                  disabled={studySessions.some(
                    (session) => session.taskId === task.id && !session.endTime,
                  )}
                >
                  Start Study
                </button>
                <button
                  onClick={() => stopStudy(task.id)}
                  disabled={!studySessions.some(
                    (session) => session.taskId === task.id && !session.endTime,
                  )}
                >
                  Stop Study
                </button>
              </div>
            </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default Dashboard;
