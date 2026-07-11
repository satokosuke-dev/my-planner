import { useEffect, useState } from "react";
import "./App.css";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";

type Project = {
  id: string;
  name: string;
};

type Theme = "light" | "dark";

const inboxProject: Project = { id: "inbox", name: "Inbox" };

function loadTheme(): Theme {
  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

function createProjectId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function loadProjects(): Project[] {
  const saved = localStorage.getItem("projects");
  if (!saved) return [inboxProject];

  try {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [inboxProject];

    const projects = parsed.filter(
      (project): project is Project =>
        typeof project === "object" &&
        project !== null &&
        "id" in project &&
        typeof project.id === "string" &&
        "name" in project &&
        typeof project.name === "string",
    );

    return projects.some((project) => project.id === inboxProject.id)
      ? projects
      : [inboxProject, ...projects];
  } catch {
    return [inboxProject];
  }
}

function App() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [selectedProjectId, setSelectedProjectId] = useState("inbox");
  const [theme, setTheme] = useState<Theme>(loadTheme);

  useEffect(() => {
    localStorage.setItem("projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function addProject(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const existingProject = projects.find(
      (project) => project.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (existingProject) {
      setSelectedProjectId(existingProject.id);
      return;
    }

    const project = { id: createProjectId(), name: trimmedName };
    setProjects([...projects, project]);
    setSelectedProjectId(project.id);
  }

  return (
    <div className="app" data-theme={theme}>
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onAddProject={addProject}
        theme={theme}
        onToggleTheme={() =>
          setTheme((currentTheme) =>
            currentTheme === "light" ? "dark" : "light",
          )
        }
      />

      <main className="content">
        <Dashboard
          projects={projects}
          selectedProjectId={selectedProjectId}
        />
      </main>
    </div>
  );
}

export default App;
