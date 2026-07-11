import { useEffect, useState } from "react";

type Priority = "High" | "Medium" | "Low";

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

function createTaskId() {
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

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [projectId, setProjectId] = useState("inbox");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

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

  return (
    <>
      <h1>Dashboard</h1>

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

        <ul>
          {filteredTasks.map((task) => (
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
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
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
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default Dashboard;
