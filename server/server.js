
import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ROOTS = [
  "C:\\Sites",
  "D:\\Dropbox\\Remotion Projects",
];

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function isAllowedFolder(folderPath) {
  const normalized = path.win32.normalize(String(folderPath || ""));
  return ALLOWED_ROOTS.some((root) => {
    const normalizedRoot = path.win32.normalize(root);
    return normalized.toLowerCase() === normalizedRoot.toLowerCase() || normalized.toLowerCase().startsWith((normalizedRoot + "\\").toLowerCase());
  });
}

function safeFileName(name) {
  return String(name || "project")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "project";
}

function psLiteral(value) {
  return String(value).replaceAll("'", "''");
}

function buildPowerShell(folderPath, projectName) {
  const outputPath = path.win32.join(os.homedir(), "Downloads", `${safeFileName(projectName)}-code-review.txt`);
  const command = [
    `$projectRoot = '${psLiteral(folderPath)}'`,
    `$output = '${psLiteral(outputPath)}'`,
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
    "Write-Output $output",
  ].join("\n");
  return { command, outputPath };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/export-text", (req, res) => {
  const { projectName, folderPath } = req.body || {};

  if (!folderPath || !projectName) {
    return res.status(400).json({ error: "Missing projectName or folderPath." });
  }

  if (!isAllowedFolder(folderPath)) {
    return res.status(400).json({ error: "Folder is outside the allowed project roots." });
  }

  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ error: `Folder does not exist: ${folderPath}` });
  }

  const { command, outputPath } = buildPowerShell(folderPath, projectName);
  const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (data) => { stdout += data.toString(); });
  child.stderr.on("data", (data) => { stderr += data.toString(); });

  child.on("error", (error) => {
    res.status(500).json({ error: error.message });
  });

  child.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: stderr || `PowerShell exited with code ${code}.`, stdout });
    }

    res.json({ ok: true, outputPath, stdout: stdout.trim() });
  });
});

app.listen(PORT, () => {
  console.log(`Project tracker helper running at http://localhost:${PORT}`);
});
