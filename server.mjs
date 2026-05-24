import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { createServer } from "node:http";

const root = resolve(".");
const port = Number(process.env.PORT || 4174);
const dataDir = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : root;
const submissionsPath = join(dataDir, "submissions.json");
const maxBodyBytes = 8 * 1024 * 1024;

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const hasSupabase = Boolean(supabaseUrl && supabaseServiceKey);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function readFileSubmissions() {
  try {
    const raw = await readFile(submissionsPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFileSubmissions(entries) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(submissionsPath, JSON.stringify(entries.slice(0, 100), null, 2), "utf8");
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Supabase error ${response.status}`);
  }
  return data;
}

async function readSubmissions() {
  if (!hasSupabase) return readFileSubmissions();

  return supabaseRequest("cramer_submissions?select=*&order=aestheticScore.desc,createdAt.desc");
}

async function appendSubmission(submission) {
  if (hasSupabase) {
    await supabaseRequest("cramer_submissions", {
      method: "POST",
      prefer: "return=minimal",
      body: submission,
    });
    return readSubmissions();
  }

  const entries = [submission, ...(await readFileSubmissions())].slice(0, 100);
  await writeFileSubmissions(entries);
  return entries;
}

function readJsonBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxBodyBytes) {
        rejectBody(new Error("request too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolveBody(JSON.parse(raw || "{}"));
      } catch {
        rejectBody(new Error("invalid json"));
      }
    });
    request.on("error", rejectBody);
  });
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeId(value) {
  return cleanText(value, 80).replace(/\s+/g, "").toLowerCase();
}

function cleanSubmission(body) {
  const image = cleanText(body.image, maxBodyBytes);
  if (!image.startsWith("data:image/")) {
    throw new Error("invalid image");
  }

  const studentId = cleanText(body.studentId || body.googleId, 20);
  const scoreBreakdown = body.scoreBreakdown && typeof body.scoreBreakdown === "object" ? body.scoreBreakdown : {};
  const cleanScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  return {
    id: cleanText(body.id, 80) || `${Date.now()}`,
    displayName: cleanText(body.displayName, 24),
    studentId,
    title: cleanText(body.title, 40) || "제목 없는 입체",
    description: cleanText(body.description, 160),
    source: cleanText(body.source, 20),
    sourceLabel: cleanText(body.sourceLabel, 30),
    model: cleanText(body.model, 40),
    image,
    createdAt: cleanText(body.createdAt, 40) || new Date().toISOString(),
    aestheticScore: cleanScore(body.aestheticScore),
    scoreBreakdown: {
      balance: cleanScore(scoreBreakdown.balance),
      structure: cleanScore(scoreBreakdown.structure),
      originality: cleanScore(scoreBreakdown.originality),
      presentation: cleanScore(scoreBreakdown.presentation),
    },
    vertexCount: Number.isFinite(Number(body.vertexCount)) ? Number(body.vertexCount) : 0,
    planeSummary: cleanText(body.planeSummary, 180),
  };
}

function hasDuplicateStudentId(entries, studentId) {
  const target = normalizeId(studentId);
  if (!target) return false;
  return entries.some((entry) => normalizeId(entry.studentId || entry.googleId) === target);
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/storage-status") {
    sendJson(response, 200, {
      mode: hasSupabase ? "supabase" : "file",
      persistent: hasSupabase,
    });
    return;
  }

  if (url.pathname === "/api/submissions") {
    try {
      if (request.method === "GET") {
        const entries = await readSubmissions();
        sendJson(response, 200, { entries, mode: hasSupabase ? "supabase" : "file" });
        return;
      }

      if (request.method === "POST") {
        const body = await readJsonBody(request);
        const submission = cleanSubmission(body);
        if (!submission.studentId) {
          sendJson(response, 400, { error: "studentId required" });
          return;
        }
        if (!submission.displayName) {
          sendJson(response, 400, { error: "displayName required" });
          return;
        }

        const existingEntries = await readSubmissions();
        if (hasDuplicateStudentId(existingEntries, submission.studentId)) {
          sendJson(response, 409, { error: "이미 이 학번으로 제출된 작품이 있습니다." });
          return;
        }

        const entries = await appendSubmission(submission);
        sendJson(response, 201, { entries, mode: hasSupabase ? "supabase" : "file" });
        return;
      }

      sendJson(response, 405, { error: "method not allowed" });
      return;
    } catch (error) {
      sendJson(response, 400, { error: error.message });
      return;
    }
  }

  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = resolve(join(root, requestedPath));

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`Cramer 3D app: http://localhost:${port}`);
  console.log(hasSupabase ? "Storage mode: Supabase" : "Storage mode: local submissions.json");
});
