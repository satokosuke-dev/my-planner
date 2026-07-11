import { useEffect, useState } from "react";

type Task = {
  text: string;
  completed: boolean;
  dueDate?: string;
};

function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("tasks");

    if (saved) {
      return JSON.parse(saved);
    }

    return [
      { text: "英検1級", completed: false },
      { text: "数学", completed: false },
      { text: "ジム", completed: false },
    ];
  });

  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  function addTask() {
    if (input.trim() === "") return;

    setTasks([
      ...tasks,
      {
        text: input,
        completed: false,
        dueDate: dueDate || undefined,
      },
    ]);

    setInput("");
    setDueDate("");
  }

  function deleteTask(index: number) {
    setTasks(tasks.filter((_, i) => i !== index));
    setEditingIndex(null);
  }

  function toggleTask(index: number) {
    setTasks(
      tasks.map((task, i) =>
        i === index ? { ...task, completed: !task.completed } : task,
      ),
    );
  }

  function startEditing(index: number) {
    setEditingIndex(index);
    setEditingText(tasks[index].text);
  }

  function saveTask(index: number) {
    const text = editingText.trim();
    if (text === "") return;

    setTasks(
      tasks.map((task, i) => (i === index ? { ...task, text } : task)),
    );
    setEditingIndex(null);
  }

  return (
    <>
      <h1>Dashboard</h1>

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

          <button onClick={addTask}>追加</button>
        </div>

        <ul>
          {tasks.map((task, index) => (
            <li
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <div>
                {editingIndex === index ? (
                  <input
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTask(index);
                    }}
                    autoFocus
                    aria-label="タスクを編集"
                  />
                ) : (
                  <span
                    onClick={() => toggleTask(index)}
                    style={{ cursor: "pointer" }}
                  >
                    {task.completed ? "✅" : "⬜"} {task.text}
                  </span>
                )}

                <div style={{ fontSize: "14px", marginTop: "4px" }}>
                  {task.dueDate ? task.dueDate : "No due date"}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                {editingIndex === index ? (
                  <button onClick={() => saveTask(index)}>保存</button>
                ) : (
                  <button onClick={() => startEditing(index)} aria-label="編集">
                    ✏️
                  </button>
                )}

                <button onClick={() => deleteTask(index)} aria-label="削除">
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
