import { useEffect, useState } from "react";

type Task = {
  text: string;
  completed: boolean;
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
      },
    ]);

    setInput("");
  }

  function deleteTask(index: number) {
    setTasks(tasks.filter((_, i) => i !== index));
  }
  function toggleTask(index: number) {
  setTasks(
    tasks.map((task, i) =>
      i === index
        ? { ...task, completed: !task.completed }
        : task
    )
  );
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
              <span
  onClick={() => toggleTask(index)}
  style={{
    cursor: "pointer",
  }}
>
  {task.completed ? "✅" : "⬜"} {task.text}
</span>

              <button onClick={() => deleteTask(index)}>
                🗑️
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export default Dashboard;