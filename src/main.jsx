
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Clipboard, FolderOpen, GitBranch, FileText, Search, CheckCircle2, AlertTriangle } from "lucide-react";
import "./styles.css";
import { PROJECTS } from "./projects.js";

const STORAGE_KEY = "jacob-coding-project-tracker-simple-v3";
const STATUSES = ["Still Working", "Haven’t Started", "Testing", "Launched", "Needs Marketing", "Needs Fixing", "Paused", "Archived"];
const API_URL = "http://localhost:3001";

function normalizeStatus(status) {
  const map = {
    "Working": "Still Working",
    "Haven’t Started": "Haven’t Started",
    "Testing": "Testing",
    "Launched": "Launched",
    "Needs Marketing": "Needs Marketing",
    "Needs Fixing": "Needs Fixing",
    "Paused": "Paused",
    "Archived": "Archived",
  };
  return map[status] || "Still Working";
}

function loadProjects() {
  const seeded = PROJECTS.map((project) => ({
    ...project,
    status: normalizeStatus(project.status),
    notes: project.notes || "",
  }));

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seeded;
    const savedProjects = JSON.parse(saved);
    if (!Array.isArray(savedProjects)) return seeded;

    const savedById = new Map(savedProjects.map((project) => [project.id, project]));
    return seeded.map((project) => ({ ...project, ...(savedById.get(project.id) || {}) }));
  } catch {
    return seeded;
  }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function toFileHref(path) {
  return "file:///" + path.replaceAll("\\", "/").replaceAll(" ", "%20");
}

function powershellLiteral(value) {
  return String(value).replaceAll("'", "''");
}

function safeFileName(name) {
  return String(name).replace(/[<>:"/\\|?*]+/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "project";
}

function makePowerShell(project) {
  const outputName = `${safeFileName(project.name)}-code-review.txt`;
  return [
    `$projectRoot = '${powershellLiteral(project.folderPath)}'`,
    `$output = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads\\${powershellLiteral(outputName)}'`,
    "$include = @('*.ts','*.tsx','*.js','*.jsx','*.mjs','*.cjs','*.json','*.css','*.md','*.yml','*.yaml','*.html','*.py','*.ps1','*.bat')",
    "$excludeDirs = @('node_modules','.next','dist','build','out','.git','.turbo','.vercel','.cache','coverage')",
    "Remove-Item -LiteralPath $output -ErrorAction SilentlyContinue",
    "$projectRoot = (Get-Item -LiteralPath $projectRoot).FullName",
    "$files = Get-ChildItem -LiteralPath $projectRoot -Recurse -File -ErrorAction SilentlyContinue | Where-Object {",
    "  $file = $_",
    "  (($include | Where-Object { $file.Name -like $_ }).Count -gt 0) -and -not (($excludeDirs | Where-Object { $file.FullName -like \"*\\$_\\*\" }).Count -gt 0)",
    "} | Sort-Object FullName",
    "foreach ($file in $files) {",
    "  $relative = $file.FullName.Substring($projectRoot.Length).TrimStart('\\')",
    "  Add-Content -LiteralPath $output -Value \"`n`n===== FILE: $relative =====`n\" -Encoding UTF8",
    "  Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue | Add-Content -LiteralPath $output -Encoding UTF8",
    "}",
    "Write-Host \"Saved code review file to: $output\"",
  ].join("\n");
}

function App() {
  const [projects, setProjects] = useState(loadProjects);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("All locations");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [showHasRepo, setShowHasRepo] = useState(false);
  const [showNoRepo, setShowNoRepo] = useState(false);
  const [sortBy, setSortBy] = useState("modified-desc");
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");

  function updateProject(id, patch) {
    setProjects((current) => {
      const next = current.map((project) => project.id === id ? { ...project, ...patch } : project);
      saveProjects(next);
      return next;
    });
  }

  const locations = useMemo(() => ["All locations", ...Array.from(new Set(projects.map((p) => p.location))).sort()], [projects]);
  const types = useMemo(() => ["All types", ...Array.from(new Set(projects.map((p) => p.projectType))).sort()], [projects]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = projects.filter((project) => {
      const hasRepo = Boolean(project.githubUrl);
      const repoMatches = (!showHasRepo && !showNoRepo) || (showHasRepo && hasRepo) || (showNoRepo && !hasRepo);
      const textMatches = !q || [project.name, project.folderPath, project.projectType, project.status, project.githubUrl, project.notes]
        .join(" ")
        .toLowerCase()
        .includes(q);

      return textMatches
        && (locationFilter === "All locations" || project.location === locationFilter)
        && (typeFilter === "All types" || project.projectType === typeFilter)
        && (statusFilter === "All statuses" || project.status === statusFilter)
        && repoMatches;
    });

    rows = [...rows].sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "added-desc") return new Date(b.dateAdded) - new Date(a.dateAdded);
      if (sortBy === "added-asc") return new Date(a.dateAdded) - new Date(b.dateAdded);
      if (sortBy === "modified-asc") return new Date(a.dateModified) - new Date(b.dateModified);
      return new Date(b.dateModified) - new Date(a.dateModified);
    });

    return rows;
  }, [projects, query, locationFilter, typeFilter, statusFilter, showHasRepo, showNoRepo, sortBy]);

  const stats = useMemo(() => ({
    total: projects.length,
    visible: filteredProjects.length,
    withRepo: projects.filter((p) => p.githubUrl).length,
    launched: projects.filter((p) => p.status === "Launched").length,
  }), [projects, filteredProjects]);

  async function copyPowerShell(project) {
    await navigator.clipboard.writeText(makePowerShell(project));
    setMessage(`Copied PowerShell command for ${project.name}.`);
  }

  async function copyPath(project) {
    await navigator.clipboard.writeText(project.folderPath);
    setMessage(`Copied folder path for ${project.name}.`);
  }

  async function makeTxt(project) {
    setBusyId(project.id);
    setMessage(`Making TXT file for ${project.name}...`);
    try {
      const response = await fetch(`${API_URL}/api/export-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name,
          folderPath: project.folderPath,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "PowerShell export failed.");
      setMessage(`Saved TXT file: ${data.outputPath}`);
    } catch (error) {
      setMessage(`Could not make TXT automatically. Make sure npm run dev is running. Error: ${error.message}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Local coding project tracker</p>
          <h1>One small list for all your projects.</h1>
          <p className="subtext">Filter by folder, type, repo status, and build status. Use the buttons to copy the PowerShell export or make the TXT file automatically.</p>
        </div>
        <div className="stats">
          <Stat label="Projects" value={stats.total} />
          <Stat label="Visible" value={stats.visible} />
          <Stat label="With repos" value={stats.withRepo} />
          <Stat label="Launched" value={stats.launched} />
        </div>
      </header>

      <section className="toolbar">
        <label className="searchBox">
          <Search size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects, paths, notes..." />
        </label>

        <Select label="Located in" value={locationFilter} onChange={setLocationFilter} options={locations} />
        <Select label="Project type" value={typeFilter} onChange={setTypeFilter} options={types} />
        <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={["All statuses", ...STATUSES]} />
        <Select label="Sort" value={sortBy} onChange={setSortBy} options={[
          ["modified-desc", "Modified: newest"],
          ["modified-asc", "Modified: oldest"],
          ["added-desc", "Added: newest"],
          ["added-asc", "Added: oldest"],
          ["name-asc", "Name: A to Z"],
          ["name-desc", "Name: Z to A"],
        ]} />

        <div className="checkboxes">
          <label><input type="checkbox" checked={showHasRepo} onChange={(e) => setShowHasRepo(e.target.checked)} /> Has repo link</label>
          <label><input type="checkbox" checked={showNoRepo} onChange={(e) => setShowNoRepo(e.target.checked)} /> Missing repo link</label>
        </div>
      </section>

      {message && (
        <div className={message.startsWith("Could not") ? "message error" : "message"}>
          {message.startsWith("Could not") ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{message}</span>
        </div>
      )}

      <main className="list">
        {filteredProjects.map((project) => (
          <article key={project.id} className="rowCard">
            <div className="topLine">
              <div className="projectMain">
                <h2>{project.name}</h2>
                <div className="metaLine">
                  <span>{project.projectType}</span>
                  <span>Modified {project.dateModified}</span>
                  <span>Added {project.dateAdded}</span>
                </div>
              </div>
              <select className="statusSelect" value={project.status} onChange={(e) => updateProject(project.id, { status: e.target.value })}>
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>

            <div className="pathLine">
              <FolderOpen size={16} />
              <a href={toFileHref(project.folderPath)} title="Browser may block local folder links. Use Copy path if it does." target="_blank" rel="noreferrer">{project.folderPath}</a>
              <button className="tinyButton" onClick={() => copyPath(project)}>Copy path</button>
            </div>

            <div className="actions">
              {project.githubUrl ? (
                <a className="actionLink" href={project.githubUrl} target="_blank" rel="noreferrer"><GitBranch size={16} /> GitHub repo</a>
              ) : (
                <span className="missingRepo"><GitBranch size={16} /> No repo link</span>
              )}
              <button className="button" onClick={() => copyPowerShell(project)}><Clipboard size={16} /> Copy PowerShell</button>
              <button className="button primary" onClick={() => makeTxt(project)} disabled={busyId === project.id}>
                <FileText size={16} /> {busyId === project.id ? "Making TXT..." : "Make TXT"}
              </button>
            </div>

            <label className="notesLabel">
              Notes / chatbot links / useful websites
              <textarea
                value={project.notes || ""}
                onChange={(e) => updateProject(project.id, { notes: e.target.value })}
                placeholder="Paste Claude chats, ChatGPT links, Vercel links, docs, marketing notes, bugs, next steps..."
              />
            </label>
          </article>
        ))}
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="selectWrap">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => {
          const value = Array.isArray(option) ? option[0] : option;
          const label = Array.isArray(option) ? option[1] : option;
          return <option key={value} value={value}>{label}</option>;
        })}
      </select>
    </label>
  );
}

createRoot(document.getElementById("root")).render(<App />);
