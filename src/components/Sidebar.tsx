import { useState } from "react";

type Project = {
  id: string;
  name: string;
};

type SidebarProps = {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string) => void;
};

function Sidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onAddProject,
}: SidebarProps) {
  const [newProjectName, setNewProjectName] = useState("");

  function addProject() {
    if (!newProjectName.trim()) return;

    onAddProject(newProjectName);
    setNewProjectName("");
  }

  return (
    <aside className="sidebar">
      <h2>📚 My Planner</h2>

      <nav>
        <p>🏠 Dashboard</p>
        <p>✅ Tasks</p>
        <p>📝 Notes</p>
        <p>📅 Calendar</p>
        <p>📊 Statistics</p>
        <p>⚙️ Settings</p>
      </nav>

      <h2 style={{ marginTop: "30px", marginBottom: "10px" }}>Projects</h2>
      <div>
        {projects.map((project) => (
          <p
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            style={{
              fontWeight: project.id === selectedProjectId ? "bold" : "normal",
            }}
          >
            📁 {project.name}
          </p>
        ))}
      </div>

      <div style={{ display: "flex", gap: "5px", marginTop: "15px" }}>
        <input
          value={newProjectName}
          onChange={(event) => setNewProjectName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addProject();
          }}
          placeholder="New project"
          aria-label="新しいプロジェクト"
          style={{ minWidth: 0, width: "100%" }}
        />
        <button onClick={addProject} aria-label="プロジェクトを追加">
          +
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
