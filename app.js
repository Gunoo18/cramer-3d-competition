"use strict";

const EPS = 1e-7;
const canvas = document.querySelector("#sceneCanvas");
const ctx = canvas.getContext("2d");
const experimentCanvas = document.querySelector("#experimentCanvas");
const experimentCtx = experimentCanvas.getContext("2d");

const modelSelect = document.querySelector("#modelSelect");
const parameterGrid = document.querySelector("#parameterGrid");
const planesInput = document.querySelector("#planesInput");
const generateButton = document.querySelector("#generateButton");
const syncButton = document.querySelector("#syncButton");
const resetViewButton = document.querySelector("#resetViewButton");
const planeEditSelect = document.querySelector("#planeEditSelect");
const planeCoeffA = document.querySelector("#planeCoeffA");
const planeCoeffB = document.querySelector("#planeCoeffB");
const planeCoeffC = document.querySelector("#planeCoeffC");
const planeCoeffD = document.querySelector("#planeCoeffD");
const planeEdit2Enabled = document.querySelector("#planeEdit2Enabled");
const planeEdit2Select = document.querySelector("#planeEdit2Select");
const planeCoeff2A = document.querySelector("#planeCoeff2A");
const planeCoeff2B = document.querySelector("#planeCoeff2B");
const planeCoeff2C = document.querySelector("#planeCoeff2C");
const planeCoeff2D = document.querySelector("#planeCoeff2D");
const planePreview = document.querySelector("#planePreview");
const applyPlaneButton = document.querySelector("#applyPlaneButton");
const resetExperimentButton = document.querySelector("#resetExperimentButton");
const statsGrid = document.querySelector("#statsGrid");
const cramerPanel = document.querySelector("#cramerPanel");
const explanationPanel = document.querySelector("#explanationPanel");
const vertexList = document.querySelector("#vertexList");
const modelBadge = document.querySelector("#modelBadge");
const experimentBadge = document.querySelector("#experimentBadge");
const toggleFacesButton = document.querySelector("#toggleFacesButton");
const toggleEdgesButton = document.querySelector("#toggleEdgesButton");
const toggleAxesButton = document.querySelector("#toggleAxesButton");
const pageScrollControl = document.querySelector("#pageScrollControl");
const pageScrollThumb = document.querySelector("#pageScrollThumb");
const competitionName = document.querySelector("#competitionName");
const competitionStudentId = document.querySelector("#competitionStudentId") || document.querySelector("#competitionGoogleId");
const competitionTitle = document.querySelector("#competitionTitle");
const competitionDescription = document.querySelector("#competitionDescription");
const competitionScene = document.querySelector("#competitionScene");
const saveCompetitionButton = document.querySelector("#saveCompetitionButton");
const refreshCompetitionButton = document.querySelector("#refreshCompetitionButton");
const competitionStatus = document.querySelector("#competitionStatus");
const competitionMode = document.querySelector("#competitionMode");
const competitionGallery = document.querySelector("#competitionGallery");

const COMPETITION_STORAGE_KEY = "cramerCompetitionEntries";

const state = {
  solids: [],
  builtSolids: [],
  globalVertices: [],
  experimentSolids: [],
  experimentBuiltSolids: [],
  experimentVertices: [],
  experimentBounds: null,
  experimentApplied: [],
  experimentEdits: [
    { enabled: true, target: "0:0", values: null },
    { enabled: false, target: "0:1", values: null },
  ],
  selectedVertexKey: null,
  error: null,
  camera: {
    yaw: -0.72,
    pitch: 0.58,
    zoom: 1,
  },
  dragging: false,
  dragStart: null,
  dragTarget: null,
  pageScrollDrag: null,
  vertexPanelDragging: false,
  vertexPanelDragStart: null,
  vertexPanelPosition: null,
  bounds: null,
  showFaces: true,
  showEdges: true,
  showAxes: true,
  planeEditorValue: null,
  competitionEntries: [],
  competitionMode: "local",
};

const colors = {
  teal: "#6a5dc7",
  blue: "#626c86",
  amber: "#b98a51",
  rose: "#a45e72",
  violet: "#7667cf",
  slate: "#535765",
  green: "#63775f",
};

function plane(a, b, c, d, label = "") {
  return { a, b, c, d, label };
}

function boxSolid(name, color, xmin, xmax, ymin, ymax, zmin, zmax) {
  return {
    name,
    color,
    planes: [
      plane(1, 0, 0, xmax, "x 최대"),
      plane(-1, 0, 0, -xmin, "x 최소"),
      plane(0, 1, 0, ymax, "y 최대"),
      plane(0, -1, 0, -ymin, "y 최소"),
      plane(0, 0, 1, zmax, "z 최대"),
      plane(0, 0, -1, -zmin, "z 최소"),
    ],
  };
}

const models = {
  cube: {
    label: "Cube",
    params: [{ id: "size", label: "한 변", value: 4, min: 0.5, step: 0.5 }],
    build(p) {
      const s = p.size / 2;
      return [boxSolid("Cube", colors.teal, -s, s, -s, s, -s, s)];
    },
  },
  prism: {
    label: "Rectangular Prism",
    params: [
      { id: "width", label: "가로 x", value: 5, min: 0.5, step: 0.5 },
      { id: "depth", label: "깊이 y", value: 3, min: 0.5, step: 0.5 },
      { id: "height", label: "높이 z", value: 4, min: 0.5, step: 0.5 },
    ],
    build(p) {
      return [
        boxSolid(
          "Rectangular Prism",
          colors.blue,
          -p.width / 2,
          p.width / 2,
          -p.depth / 2,
          p.depth / 2,
          -p.height / 2,
          p.height / 2,
        ),
      ];
    },
  },
  pyramid: {
    label: "Pyramid",
    params: [
      { id: "base", label: "밑면 한 변", value: 4, min: 0.5, step: 0.5 },
      { id: "height", label: "높이", value: 4, min: 0.5, step: 0.5 },
    ],
    build(p) {
      const s = p.base;
      const h = p.height;
      const k = s / (2 * h);
      return [
        {
          name: "Pyramid",
          color: colors.amber,
          planes: [
            plane(0, 0, -1, 0, "밑면 z >= 0"),
            plane(1, 0, k, s / 2, "오른쪽 사면"),
            plane(-1, 0, k, s / 2, "왼쪽 사면"),
            plane(0, 1, k, s / 2, "뒤쪽 사면"),
            plane(0, -1, k, s / 2, "앞쪽 사면"),
          ],
        },
      ];
    },
  },
  tetrahedron: {
    label: "Tetrahedron",
    params: [{ id: "size", label: "크기", value: 4, min: 0.5, step: 0.5 }],
    build(p) {
      return [
        {
          name: "Tetrahedron",
          color: colors.rose,
          planes: [
            plane(-1, 0, 0, 0, "x >= 0"),
            plane(0, -1, 0, 0, "y >= 0"),
            plane(0, 0, -1, 0, "z >= 0"),
            plane(1, 1, 1, p.size, "x + y + z <= 크기"),
          ],
        },
      ];
    },
  },
  octahedron: {
    label: "Octahedron",
    params: [{ id: "radius", label: "반지름", value: 3, min: 0.5, step: 0.5 }],
    build(p) {
      const signs = [-1, 1];
      const planes = [];
      for (const sx of signs) {
        for (const sy of signs) {
          for (const sz of signs) {
            planes.push(plane(sx, sy, sz, p.radius, `${sx}x ${sy}y ${sz}z`));
          }
        }
      }
      return [{ name: "Octahedron", color: colors.violet, planes }];
    },
  },
  house: {
    label: "House",
    params: [
      { id: "width", label: "집 가로", value: 5, min: 1, step: 0.5 },
      { id: "depth", label: "집 깊이", value: 4, min: 1, step: 0.5 },
      { id: "bodyHeight", label: "벽 높이", value: 3, min: 0.5, step: 0.5 },
      { id: "roofHeight", label: "지붕 높이", value: 1.8, min: 0.5, step: 0.1 },
    ],
    build(p) {
      const w = p.width;
      const d = p.depth;
      const body = boxSolid("House Body", colors.teal, -w / 2, w / 2, -d / 2, d / 2, 0, p.bodyHeight);
      const k = w / (2 * p.roofHeight);
      const roofLimit = w / 2 + k * p.bodyHeight;
      const roof = {
        name: "House Roof",
        color: colors.rose,
        planes: [
          plane(0, 1, 0, d / 2, "지붕 y 최대"),
          plane(0, -1, 0, d / 2, "지붕 y 최소"),
          plane(0, 0, -1, -p.bodyHeight, "지붕 밑면"),
          plane(1, 0, k, roofLimit, "오른쪽 지붕면"),
          plane(-1, 0, k, roofLimit, "왼쪽 지붕면"),
        ],
      };
      return [body, roof];
    },
  },
  stairs: {
    label: "Stairs",
    params: [
      { id: "width", label: "계단 폭", value: 4, min: 1, step: 0.5 },
      { id: "stepDepth", label: "단 깊이", value: 1.2, min: 0.4, step: 0.1 },
      { id: "stepHeight", label: "단 높이", value: 0.7, min: 0.2, step: 0.1 },
      { id: "count", label: "단 수", value: 5, min: 1, step: 1 },
    ],
    build(p) {
      const count = Math.max(1, Math.round(p.count));
      const totalDepth = count * p.stepDepth;
      const solids = [];
      for (let i = 0; i < count; i += 1) {
        const ymin = -totalDepth / 2 + i * p.stepDepth;
        const ymax = ymin + p.stepDepth;
        solids.push(
          boxSolid(
            `Stair ${i + 1}`,
            i % 2 === 0 ? colors.blue : colors.teal,
            -p.width / 2,
            p.width / 2,
            ymin,
            ymax,
            0,
            (i + 1) * p.stepHeight,
          ),
        );
      }
      return solids;
    },
  },
  crystal: {
    label: "Crystal / Gem",
    params: [
      { id: "radius", label: "폭", value: 3, min: 0.5, step: 0.5 },
      { id: "height", label: "높이", value: 4, min: 0.5, step: 0.5 },
    ],
    build(p) {
      const r = p.radius;
      const h = p.height;
      const k = r / (h / 2);
      return [
        {
          name: "Crystal / Gem",
          color: colors.green,
          planes: [
            plane(1, 1, k, r, "상부 사면 1"),
            plane(1, -1, k, r, "상부 사면 2"),
            plane(-1, 1, k, r, "상부 사면 3"),
            plane(-1, -1, k, r, "상부 사면 4"),
            plane(1, 1, -k, r, "하부 사면 1"),
            plane(1, -1, -k, r, "하부 사면 2"),
            plane(-1, 1, -k, r, "하부 사면 3"),
            plane(-1, -1, -k, r, "하부 사면 4"),
          ],
        },
      ];
    },
  },
  custom: {
    label: "Custom Planes",
    params: [],
    build() {
      return [
        {
          name: "Custom",
          color: colors.slate,
          planes: [
            plane(1, 0, 0, 2, "x 최대"),
            plane(-1, 0, 0, 2, "x 최소"),
            plane(0, 1, 0, 2, "y 최대"),
            plane(0, -1, 0, 2, "y 최소"),
            plane(0, 0, 1, 2, "z 최대"),
            plane(0, 0, -1, 2, "z 최소"),
          ],
        },
      ];
    },
  },
};

function det3(m) {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function solveByCramer(p1, p2, p3) {
  const a = [
    [p1.a, p1.b, p1.c],
    [p2.a, p2.b, p2.c],
    [p3.a, p3.b, p3.c],
  ];
  const b = [p1.d, p2.d, p3.d];
  const d = det3(a);
  const dx = det3([
    [b[0], p1.b, p1.c],
    [b[1], p2.b, p2.c],
    [b[2], p3.b, p3.c],
  ]);
  const dy = det3([
    [p1.a, b[0], p1.c],
    [p2.a, b[1], p2.c],
    [p3.a, b[2], p3.c],
  ]);
  const dz = det3([
    [p1.a, p1.b, b[0]],
    [p2.a, p2.b, b[1]],
    [p3.a, p3.b, b[2]],
  ]);

  if (Math.abs(d) < EPS) {
    return { determinant: d, dx, dy, dz, point: null };
  }

  return {
    determinant: d,
    dx,
    dy,
    dz,
    point: { x: dx / d, y: dy / d, z: dz / d },
  };
}

function buildConvexSolid(solid, solidIndex) {
  const vertices = [];
  const vertexMap = new Map();
  const stats = {
    combinations: 0,
    zeroDeterminants: 0,
    outside: 0,
    duplicates: 0,
  };

  for (let i = 0; i < solid.planes.length - 2; i += 1) {
    for (let j = i + 1; j < solid.planes.length - 1; j += 1) {
      for (let k = j + 1; k < solid.planes.length; k += 1) {
        stats.combinations += 1;
        const cramer = solveByCramer(solid.planes[i], solid.planes[j], solid.planes[k]);
        if (!cramer.point) {
          stats.zeroDeterminants += 1;
          continue;
        }

        if (!satisfiesAll(cramer.point, solid.planes)) {
          stats.outside += 1;
          continue;
        }

        const key = pointKey(cramer.point);
        if (vertexMap.has(key)) {
          stats.duplicates += 1;
          const existing = vertices[vertexMap.get(key)];
          existing.sources.push({ planes: [i, j, k], cramer });
          continue;
        }

        vertexMap.set(key, vertices.length);
        vertices.push({
          ...cramer.point,
          localIndex: vertices.length,
          key: `${solidIndex}:${key}`,
          sources: [{ planes: [i, j, k], cramer }],
        });
      }
    }
  }

  const faces = [];
  for (let i = 0; i < solid.planes.length; i += 1) {
    const p = solid.planes[i];
    const indices = vertices
      .map((v, index) => ({ v, index }))
      .filter(({ v }) => Math.abs(evaluatePlane(p, v) - p.d) < 1e-5)
      .map(({ index }) => index);

    if (indices.length >= 3) {
      const ordered = sortFaceVertices(indices, vertices, p);
      faces.push({
        indices: ordered,
        planeIndex: i,
        label: p.label || `P${i + 1}`,
        normal: normalize([p.a, p.b, p.c]),
        color: solid.color,
        solidName: solid.name,
      });
    }
  }

  const edges = uniqueEdges(faces);
  return { ...solid, vertices, faces, edges, stats };
}

function satisfiesAll(point, planes) {
  return planes.every((p) => evaluatePlane(p, point) <= p.d + 1e-6);
}

function evaluatePlane(p, point) {
  return p.a * point.x + p.b * point.y + p.c * point.z;
}

function pointKey(point) {
  return [point.x, point.y, point.z].map((n) => String(Math.round(n * 100000) / 100000)).join("|");
}

function sortFaceVertices(indices, vertices, p) {
  const center = averagePoint(indices.map((index) => vertices[index]));
  const normal = normalize([p.a, p.b, p.c]);
  const reference = Math.abs(normal[2]) < 0.88 ? [0, 0, 1] : [0, 1, 0];
  const u = normalize(cross(reference, normal));
  const v = normalize(cross(normal, u));

  return [...indices].sort((ia, ib) => {
    const a = subtractPoint(vertices[ia], center);
    const b = subtractPoint(vertices[ib], center);
    const aa = Math.atan2(dot(a, v), dot(a, u));
    const ab = Math.atan2(dot(b, v), dot(b, u));
    return aa - ab;
  });
}

function uniqueEdges(faces) {
  const seen = new Set();
  const edges = [];
  for (const face of faces) {
    for (let i = 0; i < face.indices.length; i += 1) {
      const a = face.indices[i];
      const b = face.indices[(i + 1) % face.indices.length];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([a, b]);
      }
    }
  }
  return edges;
}

function averagePoint(points) {
  const total = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }),
    { x: 0, y: 0, z: 0 },
  );
  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length,
  };
}

function subtractPoint(a, b) {
  return [a.x - b.x, a.y - b.y, a.z - b.z];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function readParams() {
  const selected = models[modelSelect.value];
  const values = {};
  for (const param of selected.params) {
    const input = document.querySelector(`[data-param-id="${param.id}"]`);
    const parsed = Number(input?.value ?? param.value);
    values[param.id] = Number.isFinite(parsed) ? Math.max(param.min ?? 0, parsed) : param.value;
  }
  return values;
}

function renderModelOptions() {
  modelSelect.innerHTML = Object.entries(models)
    .map(([key, model]) => `<option value="${key}">${model.label}</option>`)
    .join("");
  modelSelect.value = "cube";
}

function renderParameters() {
  const selected = models[modelSelect.value];
  parameterGrid.innerHTML = selected.params
    .map(
      (param) => `
        <label class="field">
          <span>${param.label}</span>
          <input
            type="number"
            data-param-id="${param.id}"
            min="${param.min ?? 0}"
            step="${param.step ?? 0.1}"
            value="${param.value}"
          />
        </label>
      `,
    )
    .join("");

  parameterGrid.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      resetExperimentEdits();
      refreshPlanesFromModel();
      computeScene();
    });
  });
}

function getGeneratedSolids() {
  const selected = models[modelSelect.value];
  return selected.build(readParams());
}

function refreshPlanesFromModel() {
  const solids = getGeneratedSolids();
  planesInput.value = serializeSolids(solids);
}

function serializeSolids(solids) {
  return solids
    .map((solid) => [`[${solid.name}]`, ...solid.planes.map((p) => `${formatPlane(p)}  # ${p.label || "plane"}`)].join("\n"))
    .join("\n\n");
}

function formatPlane(p) {
  return `${formatExpression(p)} <= ${formatNumber(p.d)}`;
}

function formatEquation(p) {
  return `${formatExpression(p)} = ${formatNumber(p.d)}`;
}

function formatExpression(p) {
  const terms = [
    [p.a, "x"],
    [p.b, "y"],
    [p.c, "z"],
  ].filter(([value]) => Math.abs(value) > EPS);

  if (!terms.length) return "0";

  return terms
    .map(([value, variable], index) => {
      const sign = value < 0 ? "-" : "+";
      const amount = Math.abs(value);
      const coefficient = Math.abs(amount - 1) < EPS ? "" : formatNumber(amount);
      const body = `${coefficient}${variable}`;
      if (index === 0) return value < 0 ? `-${body}` : body;
      return `${sign} ${body}`;
    })
    .join(" ");
}

function parsePlaneInput(text) {
  const solids = [];
  let current = { name: "Custom", color: colors.slate, planes: [] };

  const pushCurrent = () => {
    if (current.planes.length > 0) {
      solids.push(current);
    }
  };

  text.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    const [planePart, ...commentParts] = rawLine.split("#");
    const lineWithoutComment = planePart.trim();
    const comment = commentParts.join("#").trim();
    if (!lineWithoutComment) return;

    const groupMatch = lineWithoutComment.match(/^\[(.+)]$/);
    if (groupMatch) {
      pushCurrent();
      current = {
        name: groupMatch[1].trim() || `Solid ${solids.length + 1}`,
        color: paletteColor(solids.length),
        planes: [],
      };
      return;
    }

    try {
      const parsedPlane = parsePlane(lineWithoutComment);
      parsedPlane.label = comment || parsedPlane.label;
      current.planes.push(parsedPlane);
    } catch (error) {
      throw new Error(`${lineIndex + 1}행: ${error.message}`);
    }
  });

  pushCurrent();

  if (!solids.length) {
    throw new Error("평면 부등식을 하나 이상 입력해야 합니다.");
  }

  return solids.map((solid, index) => ({
    ...solid,
    color: solid.color || paletteColor(index),
  }));
}

function parsePlane(line) {
  const compactTuple = line.match(/^\s*([-+0-9.eE]+)\s*,\s*([-+0-9.eE]+)\s*,\s*([-+0-9.eE]+)\s*,\s*([-+0-9.eE]+)\s*$/);
  if (compactTuple) {
    const [, a, b, c, d] = compactTuple.map(Number);
    if ([a, b, c, d].every(Number.isFinite)) return plane(a, b, c, d);
  }

  const operator = line.includes("<=") || line.includes("≤") ? "<=" : line.includes(">=") || line.includes("≥") ? ">=" : null;
  if (!operator) {
    throw new Error("'<=' 또는 '>='가 필요합니다.");
  }

  const parts = line.split(operator === "<=" ? /<=|≤/ : />=|≥/);
  if (parts.length !== 2) {
    throw new Error("부등식 형식이 올바르지 않습니다.");
  }

  const left = parseLinearExpression(parts[0]);
  const right = Number(parts[1].trim());
  if (!Number.isFinite(right)) {
    throw new Error("오른쪽 상수항은 숫자여야 합니다.");
  }

  let result = plane(left.a, left.b, left.c, right - left.constant);
  if (operator === ">=") {
    result = plane(-result.a, -result.b, -result.c, -result.d);
  }
  return result;
}

function parseLinearExpression(expression) {
  const cleaned = expression.replace(/\s+/g, "").replace(/\*/g, "");
  const source = /^[+-]/.test(cleaned) ? cleaned : `+${cleaned}`;
  const terms = source.match(/[+-][^+-]+/g);
  if (!terms) {
    throw new Error("왼쪽 식을 읽을 수 없습니다.");
  }

  const result = { a: 0, b: 0, c: 0, constant: 0 };
  for (const term of terms) {
    const variableMatch = term.match(/[xyz]$/i);
    if (variableMatch) {
      const variable = variableMatch[0].toLowerCase();
      const coefficientText = term.slice(0, -1);
      const coefficient = parseCoefficient(coefficientText);
      if (variable === "x") result.a += coefficient;
      if (variable === "y") result.b += coefficient;
      if (variable === "z") result.c += coefficient;
    } else {
      const constant = Number(term);
      if (!Number.isFinite(constant)) throw new Error(`'${term}' 항을 읽을 수 없습니다.`);
      result.constant += constant;
    }
  }

  if (Math.abs(result.a) < EPS && Math.abs(result.b) < EPS && Math.abs(result.c) < EPS) {
    throw new Error("x, y, z 중 하나 이상의 항이 필요합니다.");
  }

  return result;
}

function parseCoefficient(text) {
  if (text === "+" || text === "") return 1;
  if (text === "-") return -1;
  const value = Number(text);
  if (!Number.isFinite(value)) {
    throw new Error(`'${text}' 계수를 읽을 수 없습니다.`);
  }
  return value;
}

function computeScene() {
  try {
    const parsed = parsePlaneInput(planesInput.value);
    const built = parsed.map((solid, index) => buildConvexSolid(solid, index));
    state.solids = parsed;
    state.builtSolids = built;
    state.globalVertices = flattenVertices(built);
    state.bounds = computeBounds(state.globalVertices);
    state.error = null;
    computeExperimentScene();

    if (!state.selectedVertexKey || !state.globalVertices.some((v) => v.key === state.selectedVertexKey)) {
      state.selectedVertexKey = state.globalVertices[0]?.key ?? null;
    }
  } catch (error) {
    state.error = error.message;
    state.builtSolids = [];
    state.globalVertices = [];
    state.experimentSolids = [];
    state.experimentBuiltSolids = [];
    state.experimentVertices = [];
    state.experimentBounds = null;
    state.bounds = null;
    state.selectedVertexKey = null;
  }

  updateStats();
  updatePlaneEditor();
  updateVertexList();
  updateCramerPanel();
  updateExplanationPanel();
  updateModelBadge();
  updateExperimentBadge();
}

function computeExperimentScene() {
  const solids = cloneSolids(state.solids);
  const applied = [];

  state.experimentEdits.forEach((edit, slotIndex) => {
    if (!edit.enabled || !edit.target || !edit.values) return;
    const [solidIndex, planeIndex] = edit.target.split(":").map(Number);
    const solid = solids[solidIndex];
    const targetPlane = solid?.planes[planeIndex];
    if (!solid || !targetPlane) return;
    solid.planes[planeIndex] = {
      ...targetPlane,
      ...edit.values,
      label: targetPlane.label || `P${planeIndex + 1}`,
    };
    applied.push({ slotIndex, solidIndex, planeIndex, plane: solid.planes[planeIndex] });
  });

  state.experimentSolids = solids;
  state.experimentBuiltSolids = solids.map((solid, index) => buildConvexSolid(solid, index));
  state.experimentVertices = flattenVertices(state.experimentBuiltSolids);
  state.experimentBounds = computeBounds(state.experimentVertices);
  state.experimentApplied = applied;
}

function cloneSolids(solids) {
  return solids.map((solid) => ({
    ...solid,
    planes: solid.planes.map((p) => ({ ...p })),
  }));
}

function flattenVertices(builtSolids) {
  const vertices = [];
  builtSolids.forEach((solid, solidIndex) => {
    solid.vertices.forEach((vertex, vertexIndex) => {
      vertices.push({
        ...vertex,
        displayIndex: vertices.length + 1,
        solidIndex,
        vertexIndex,
        solidName: solid.name,
      });
    });
  });
  return vertices;
}

function computeBounds(vertices) {
  if (!vertices.length) return null;
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  };

  vertices.forEach((v) => {
    bounds.minX = Math.min(bounds.minX, v.x);
    bounds.maxX = Math.max(bounds.maxX, v.x);
    bounds.minY = Math.min(bounds.minY, v.y);
    bounds.maxY = Math.max(bounds.maxY, v.y);
    bounds.minZ = Math.min(bounds.minZ, v.z);
    bounds.maxZ = Math.max(bounds.maxZ, v.z);
  });

  bounds.center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  };
  bounds.radius =
    Math.max(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
      bounds.maxZ - bounds.minZ,
      1,
    ) / 2;
  return bounds;
}

function updateStats() {
  if (state.error) {
    statsGrid.innerHTML = `<div class="error-box">${escapeHtml(state.error)}</div>`;
    return;
  }

  const totals = state.builtSolids.reduce(
    (acc, solid) => {
      acc.solids += 1;
      acc.planes += solid.planes.length;
      acc.vertices += solid.vertices.length;
      acc.faces += solid.faces.length;
      acc.combinations += solid.stats.combinations;
      acc.zeroDeterminants += solid.stats.zeroDeterminants;
      acc.outside += solid.stats.outside;
      return acc;
    },
    { solids: 0, planes: 0, vertices: 0, faces: 0, combinations: 0, zeroDeterminants: 0, outside: 0 },
  );

  const statItems = [
    ["다면체", totals.solids],
    ["평면", totals.planes],
    ["꼭짓점", totals.vertices],
    ["면", totals.faces],
    ["세 평면 조합", totals.combinations],
    ["D = 0 제외", totals.zeroDeterminants],
  ];

  statsGrid.innerHTML = statItems
    .map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");
}

function updatePlaneEditor() {
  if (!planeEditSelect) return;

  if (state.error || !state.solids.length) {
    setPlaneEditorDisabled(true);
    planeEditSelect.innerHTML = "";
    if (planeEdit2Select) planeEdit2Select.innerHTML = "";
    planePreview.innerHTML = state.error ? `<span class="preview-error">${escapeHtml(state.error)}</span>` : "";
    return;
  }

  const options = [];
  state.solids.forEach((solid, solidIndex) => {
    solid.planes.forEach((p, planeIndex) => {
      options.push({
        value: `${solidIndex}:${planeIndex}`,
        text: `${solid.name} P${planeIndex + 1} | ${formatPlane(p)}`,
      });
    });
  });

  [planeEditSelect, planeEdit2Select].forEach((select) => {
    select.innerHTML = options
      .map((option) => `<option value="${option.value}">${escapeHtml(option.text)}</option>`)
      .join("");
  });

  state.experimentEdits.forEach((edit, index) => {
    if (!options.some((option) => option.value === edit.target)) {
      edit.target = options[Math.min(index, options.length - 1)]?.value || options[0]?.value;
      edit.values = null;
    }
  });

  planeEditSelect.value = state.experimentEdits[0].target;
  planeEdit2Select.value = state.experimentEdits[1].target;
  planeEdit2Enabled.checked = state.experimentEdits[1].enabled;
  setPlaneEditorDisabled(false);
  fillPlaneEditorFields(0);
  fillPlaneEditorFields(1);
}

function setPlaneEditorDisabled(disabled) {
  [
    planeEditSelect,
    planeCoeffA,
    planeCoeffB,
    planeCoeffC,
    planeCoeffD,
    planeEdit2Enabled,
    planeEdit2Select,
    planeCoeff2A,
    planeCoeff2B,
    planeCoeff2C,
    planeCoeff2D,
    applyPlaneButton,
    resetExperimentButton,
  ].forEach((element) => {
    if (element) element.disabled = disabled;
  });
}

function fillPlaneEditorFields(slotIndex = 0) {
  const selected = getSelectedPlane(slotIndex);
  if (!selected) return;
  const edit = state.experimentEdits[slotIndex];
  const p = edit.values || selected.plane;
  const inputs = getPlaneEditorInputs(slotIndex);
  inputs.a.value = formatNumber(p.a);
  inputs.b.value = formatNumber(p.b);
  inputs.c.value = formatNumber(p.c);
  inputs.d.value = formatNumber(p.d);
  updatePlanePreviewFromInputs();
}

function getSelectedPlane(slotIndex = 0) {
  const select = slotIndex === 0 ? planeEditSelect : planeEdit2Select;
  if (!select?.value) return null;
  const [solidIndex, planeIndex] = select.value.split(":").map(Number);
  const solid = state.solids[solidIndex];
  const selectedPlane = solid?.planes[planeIndex];
  if (!solid || !selectedPlane) return null;
  return { solid, solidIndex, planeIndex, plane: selectedPlane };
}

function getPlaneEditorInputs(slotIndex = 0) {
  return slotIndex === 0
    ? { a: planeCoeffA, b: planeCoeffB, c: planeCoeffC, d: planeCoeffD }
    : { a: planeCoeff2A, b: planeCoeff2B, c: planeCoeff2C, d: planeCoeff2D };
}

function readPlaneEditorValues(slotIndex = 0) {
  const inputs = getPlaneEditorInputs(slotIndex);
  const values = {
    a: Number(inputs.a.value),
    b: Number(inputs.b.value),
    c: Number(inputs.c.value),
    d: Number(inputs.d.value),
  };
  if (!Object.values(values).every(Number.isFinite)) {
    throw new Error("a, b, c, d는 모두 숫자로 입력해야 합니다.");
  }
  if (Math.abs(values.a) < EPS && Math.abs(values.b) < EPS && Math.abs(values.c) < EPS) {
    throw new Error("a, b, c가 모두 0이면 평면이 만들어지지 않습니다.");
  }
  return values;
}

function updatePlanePreviewFromInputs() {
  try {
    const first = readPlaneEditorValues(0);
    const parts = [`<span>1번 변경: ${escapeHtml(formatPlane(first))}</span>`];
    if (planeEdit2Enabled.checked) {
      const second = readPlaneEditorValues(1);
      parts.push(`<span>2번 변경: ${escapeHtml(formatPlane(second))}</span>`);
    }
    planePreview.innerHTML = `<strong>2번 창에 반영될 평면</strong>${parts.join("")}`;
  } catch (error) {
    planePreview.innerHTML = `<span class="preview-error">${escapeHtml(error.message)}</span>`;
  }
}

function applyPlaneEdit() {
  syncExperimentFromEditor();
}

function syncExperimentFromEditor() {
  try {
    state.experimentEdits[0] = {
      enabled: true,
      target: planeEditSelect.value,
      values: readPlaneEditorValues(0),
    };
    state.experimentEdits[1] = {
      enabled: planeEdit2Enabled.checked,
      target: planeEdit2Select.value,
      values: planeEdit2Enabled.checked ? readPlaneEditorValues(1) : null,
    };
    computeExperimentScene();
    updatePlanePreviewFromInputs();
    updateExperimentBadge();
  } catch (error) {
    planePreview.innerHTML = `<span class="preview-error">${escapeHtml(error.message)}</span>`;
  }
}

function resetExperimentEdits() {
  state.experimentEdits = [
    { enabled: true, target: "0:0", values: null },
    { enabled: false, target: "0:1", values: null },
  ];
  computeExperimentScene();
  updatePlaneEditor();
  updateExperimentBadge();
}

function moveVertexPanelTo(x, y) {
  const parent = vertexList.parentElement;
  if (!parent) return;
  const parentRect = parent.getBoundingClientRect();
  const panelRect = vertexList.getBoundingClientRect();
  const maxX = Math.max(0, parentRect.width - panelRect.width - 12);
  const maxY = Math.max(0, parentRect.height - panelRect.height - 12);
  const nextX = clamp(x, 12, maxX);
  const nextY = clamp(y, 12, maxY);
  state.vertexPanelPosition = { x: nextX, y: nextY };
  vertexList.style.left = `${nextX}px`;
  vertexList.style.top = `${nextY}px`;
  vertexList.style.right = "auto";
  vertexList.style.bottom = "auto";
}

function keepVertexPanelInBounds() {
  if (!state.vertexPanelPosition) return;
  moveVertexPanelTo(state.vertexPanelPosition.x, state.vertexPanelPosition.y);
}

function updateVertexList() {
  if (state.error || !state.globalVertices.length) {
    vertexList.innerHTML = "";
    return;
  }

  vertexList.innerHTML = `
    <div class="vertex-list-handle" data-drag-handle="true">
      <strong>꼭짓점 좌표</strong>
      <span>드래그로 이동</span>
    </div>
    <div class="vertex-list-items">
      ${state.globalVertices
    .map((v) => {
      const active = v.key === state.selectedVertexKey ? " active" : "";
      return `
        <button class="vertex-item${active}" type="button" data-key="${v.key}">
          <span class="vertex-index">${v.displayIndex}</span>
          <span class="vertex-coord">(${formatNumber(v.x)}, ${formatNumber(v.y)}, ${formatNumber(v.z)})</span>
        </button>
      `;
    })
    .join("")}
    </div>
  `;

  vertexList.querySelectorAll(".vertex-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedVertexKey = button.dataset.key;
      updateVertexList();
      updateCramerPanel();
      updateExplanationPanel();
    });
  });
}

function getSelectedCramerData(selected) {
  const source = selected.sources[0];
  const solid = state.builtSolids[selected.solidIndex];
  const planes = source.planes.map((index) => solid.planes[index]);
  const matrixA = planes.map((p) => [p.a, p.b, p.c]);
  const vectorB = planes.map((p) => p.d);

  return {
    source,
    solid,
    planes,
    matrixA,
    vectorB,
    matrixDx: matrixA.map((row, index) => [vectorB[index], row[1], row[2]]),
    matrixDy: matrixA.map((row, index) => [row[0], vectorB[index], row[2]]),
    matrixDz: matrixA.map((row, index) => [row[0], row[1], vectorB[index]]),
    cramer: source.cramer,
    planeNames: source.planes.map((index) => `P${index + 1}`).join(", "),
    equations: source.planes
      .map((index) => `<span>${escapeHtml(formatEquation(solid.planes[index]))}</span>`)
      .join(""),
  };
}

function matrixMarkup(rows, highlightColumn = -1) {
  return `
    <table class="matrix-table">
      <tbody>
        ${rows
    .map(
      (row) => `
          <tr>
            ${row
    .map((value, index) => `<td class="${index === highlightColumn ? "is-replaced" : ""}">${formatNumber(value)}</td>`)
    .join("")}
          </tr>
        `,
    )
    .join("")}
      </tbody>
    </table>
  `;
}

function vectorMarkup(values) {
  return `
    <table class="matrix-table vector-table">
      <tbody>
        ${values
    .map((value) => {
      const label = Number.isFinite(value) ? formatNumber(value) : escapeHtml(value);
      return `<tr><td class="is-replaced">${label}</td></tr>`;
    })
    .join("")}
      </tbody>
    </table>
  `;
}

function determinantCard(label, description, rows, highlightColumn, value) {
  return `
    <div class="det-card">
      <strong>${label}</strong>
      <span>${description}</span>
      ${matrixMarkup(rows, highlightColumn)}
      <em>${label} = ${formatNumber(value)}</em>
    </div>
  `;
}

function matrixEquationMarkup(data) {
  return `
    <div class="matrix-equation">
      <div>
        <strong>A</strong>
        ${matrixMarkup(data.matrixA)}
      </div>
      <div class="matrix-times">×</div>
      <div>
        <strong>X</strong>
        ${vectorMarkup(["x", "y", "z"])}
      </div>
      <div class="matrix-times">=</div>
      <div>
        <strong>B</strong>
        ${vectorMarkup(data.vectorB)}
      </div>
    </div>
  `;
}

function determinantGridMarkup(data) {
  const c = data.cramer;
  return `
    <div class="det-grid">
      ${determinantCard("D", "원래 계수행렬 A의 행렬식", data.matrixA, -1, c.determinant)}
      ${determinantCard("Dx", "A의 x열을 B로 바꾼 행렬식", data.matrixDx, 0, c.dx)}
      ${determinantCard("Dy", "A의 y열을 B로 바꾼 행렬식", data.matrixDy, 1, c.dy)}
      ${determinantCard("Dz", "A의 z열을 B로 바꾼 행렬식", data.matrixDz, 2, c.dz)}
    </div>
  `;
}

function cramerMatrixProcess(data) {
  return `
    ${matrixEquationMarkup(data)}
    ${determinantGridMarkup(data)}
  `;
}

function cramerSubstitution(selected, c) {
  return `
    <div class="substitution-grid">
      <div><strong>x</strong><span>Dx / D</span><em>${formatNumber(c.dx)} / ${formatNumber(c.determinant)} = ${formatNumber(selected.x)}</em></div>
      <div><strong>y</strong><span>Dy / D</span><em>${formatNumber(c.dy)} / ${formatNumber(c.determinant)} = ${formatNumber(selected.y)}</em></div>
      <div><strong>z</strong><span>Dz / D</span><em>${formatNumber(c.dz)} / ${formatNumber(c.determinant)} = ${formatNumber(selected.z)}</em></div>
    </div>
  `;
}

function updateCramerPanel() {
  if (state.error) {
    cramerPanel.innerHTML = `<div class="error-box">${escapeHtml(state.error)}</div>`;
    return;
  }

  const selected = state.globalVertices.find((v) => v.key === state.selectedVertexKey);
  if (!selected) {
    cramerPanel.innerHTML = `<p>계산된 꼭짓점이 없습니다.</p>`;
    return;
  }

  const data = getSelectedCramerData(selected);
  const c = data.cramer;
  cramerPanel.innerHTML = `
    <strong>V${selected.displayIndex} ${escapeHtml(selected.solidName)}의 크래머 공식 적용</strong>
    <div class="formula">선택된 세 평면: ${data.planeNames}<br>계산 결과: (${formatNumber(selected.x)}, ${formatNumber(selected.y)}, ${formatNumber(selected.z)})</div>
    <div class="equation-stack">${data.equations}</div>
    ${cramerMatrixProcess(data)}
    ${cramerSubstitution(selected, c)}
  `;
}

function updateExplanationPanel() {
  if (!explanationPanel) return;

  if (state.error) {
    explanationPanel.innerHTML = `<div class="error-box">${escapeHtml(state.error)}</div>`;
    return;
  }

  const selected = state.globalVertices.find((v) => v.key === state.selectedVertexKey);
  if (!selected) {
    explanationPanel.innerHTML = `<p>꼭짓점을 선택하면 3D 모델이 평면 방정식과 크래머 공식으로 만들어지는 흐름이 표시됩니다.</p>`;
    return;
  }

  const data = getSelectedCramerData(selected);
  const c = data.cramer;

  explanationPanel.innerHTML = `
    <div class="explanation-steps cramer-guide">
      <p><strong>선택한 꼭짓점 V${selected.displayIndex}이 계산되는 흐름</strong><br>
      입체의 꼭짓점 하나는 평면 세 장이 동시에 만나는 점입니다. 여기서는 ${data.planeNames} 평면을 골라서 실제로 크래머 공식을 적용합니다.</p>

      <div class="process-lane">
        <section>
          <b>1</b>
          <div>
            <strong>부등식을 잠깐 등식으로 바꾸기</strong>
            <p>꼭짓점은 경계 위에 있으므로 선택된 세 평면을 등식으로 놓습니다.</p>
            <div class="equation-stack">${data.equations}</div>
          </div>
        </section>

        <section>
          <b>2</b>
          <div>
            <strong>계수행렬 A와 상수항 B 만들기</strong>
            <p>x, y, z 앞의 숫자는 A, 오른쪽 숫자는 B가 됩니다.</p>
            ${matrixEquationMarkup(data)}
          </div>
        </section>

        <section>
          <b>3</b>
          <div>
            <strong>열을 바꿔 D, Dx, Dy, Dz 계산하기</strong>
            <p>Dx는 x열, Dy는 y열, Dz는 z열을 B로 바꾼 뒤 행렬식을 구한 값입니다. 보라색 열이 바뀐 열입니다.</p>
            ${determinantGridMarkup(data)}
          </div>
        </section>

        <section>
          <b>4</b>
          <div>
            <strong>크래머 공식으로 좌표 얻기</strong>
            <p>D가 0이 아니면 세 평면은 한 점에서 만나고, 그 점의 좌표는 x = Dx / D, y = Dy / D, z = Dz / D입니다.</p>
            ${cramerSubstitution(selected, c)}
          </div>
        </section>
      </div>

      <p><strong>마지막 확인</strong><br>
      이렇게 나온 (${formatNumber(selected.x)}, ${formatNumber(selected.y)}, ${formatNumber(selected.z)})이 다른 평면 부등식도 모두 만족하면 실제 입체의 꼭짓점으로 인정합니다.</p>
    </div>
  `;
}

function updateModelBadge() {
  if (state.error) {
    modelBadge.innerHTML = `<strong>입력 확인</strong><span>${escapeHtml(state.error)}</span>`;
    return;
  }
  const selected = models[modelSelect.value];
  const vertices = state.globalVertices.length;
  const solids = state.builtSolids.length;
  modelBadge.innerHTML = `<strong>${selected.label}</strong><span>평면 부등식 ${state.solids.reduce(
    (sum, solid) => sum + solid.planes.length,
    0,
  )}개로 ${solids}개 다면체와 꼭짓점 ${vertices}개를 계산했습니다.</span>`;
}

function updateExperimentBadge() {
  if (!experimentBadge) return;
  if (state.error) {
    experimentBadge.innerHTML = `<strong>2번 창</strong><span>${escapeHtml(state.error)}</span>`;
    return;
  }

  const applied = state.experimentApplied || [];
  const summary = applied.length
    ? applied.map((item) => `P${item.planeIndex + 1}: ${formatPlane(item.plane)}`).join(" / ")
    : "아직 변경된 평면이 없습니다.";
  experimentBadge.innerHTML = `<strong>2번 실험 모델</strong><span>${escapeHtml(summary)}<br>꼭짓점 ${state.experimentVertices.length}개</span>`;
}

function resizeCanvas() {
  resizeOneCanvas(canvas, ctx);
  resizeOneCanvas(experimentCanvas, experimentCtx);
  keepVertexPanelInBounds();
  updatePageScrollControl();
}

function resizeOneCanvas(targetCanvas, targetCtx) {
  const rect = targetCanvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  targetCanvas.width = Math.max(1, Math.floor(rect.width * ratio));
  targetCanvas.height = Math.max(1, Math.floor(rect.height * ratio));
  targetCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function render() {
  renderScene(canvas, ctx, {
    builtSolids: state.builtSolids,
    vertices: state.globalVertices,
    bounds: state.bounds,
    selectedVertexKey: state.selectedVertexKey,
  });
  renderScene(experimentCanvas, experimentCtx, {
    builtSolids: state.experimentBuiltSolids,
    vertices: state.experimentVertices,
    bounds: state.experimentBounds,
    selectedVertexKey: null,
  });

  requestAnimationFrame(render);
}

function renderScene(targetCanvas, targetCtx, sceneData) {
  const width = targetCanvas.clientWidth;
  const height = targetCanvas.clientHeight;
  targetCtx.clearRect(0, 0, width, height);
  drawSceneBackground(targetCtx, width, height);

  if (state.error || !sceneData.bounds) return;
  if (state.showAxes) drawSceneAxes(targetCtx, width, height, sceneData);
  drawSceneSolids(targetCtx, width, height, sceneData);
}

function drawSceneBackground(targetCtx, width, height) {
  const gradient = targetCtx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#111019");
  gradient.addColorStop(1, "#07070c");
  targetCtx.fillStyle = gradient;
  targetCtx.fillRect(0, 0, width, height);

  targetCtx.strokeStyle = "rgba(255, 255, 255, 0.055)";
  targetCtx.lineWidth = 1;
  const gap = 44;
  for (let x = width % gap; x < width; x += gap) {
    targetCtx.beginPath();
    targetCtx.moveTo(x, 0);
    targetCtx.lineTo(x, height);
    targetCtx.stroke();
  }
  for (let y = height % gap; y < height; y += gap) {
    targetCtx.beginPath();
    targetCtx.moveTo(0, y);
    targetCtx.lineTo(width, y);
    targetCtx.stroke();
  }
}

function drawSceneSolids(targetCtx, width, height, sceneData) {
  const projectedFaces = [];
  sceneData.builtSolids.forEach((solid) => {
    solid.faces.forEach((face) => {
      const points = face.indices.map((index) => projectScenePoint(solid.vertices[index], width, height, sceneData));
      const depth = points.reduce((sum, p) => sum + p.depth, 0) / points.length;
      projectedFaces.push({ face, points, depth });
    });
  });

  projectedFaces.sort((a, b) => a.depth - b.depth);

  if (state.showFaces) {
    projectedFaces.forEach(({ face, points }) => drawSceneFace(targetCtx, face, points));
  }

  if (state.showEdges) {
    sceneData.builtSolids.forEach((solid) => {
      solid.edges.forEach(([a, b]) => {
        const pa = projectScenePoint(solid.vertices[a], width, height, sceneData);
        const pb = projectScenePoint(solid.vertices[b], width, height, sceneData);
        drawSceneLine(targetCtx, pa, pb, "rgba(233, 241, 244, 0.48)", 1.4);
      });
    });
  }

  sceneData.vertices.forEach((vertex, index) => {
    const point = projectScenePoint(vertex, width, height, sceneData);
    const selected = vertex.key === sceneData.selectedVertexKey;
    targetCtx.beginPath();
    targetCtx.arc(point.x, point.y, selected ? 5.5 : 3.2, 0, Math.PI * 2);
    targetCtx.fillStyle = selected ? "#d9aa68" : "#f4f7f8";
    targetCtx.fill();

    if (selected) {
      targetCtx.fillStyle = "#f4f7f8";
      targetCtx.font = "700 12px Inter, system-ui, sans-serif";
      targetCtx.fillText(`V${vertex.displayIndex || index + 1}`, point.x + 8, point.y - 8);
    }
  });
}

function drawSceneFace(targetCtx, face, points) {
  if (points.length < 3) return;
  const cameraNormal = transformSceneVector(face.normal);
  const light = normalize([-0.35, -0.65, 0.92]);
  const brightness = 0.62 + 0.34 * Math.max(0, dot(cameraNormal, light));

  targetCtx.beginPath();
  targetCtx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((p) => targetCtx.lineTo(p.x, p.y));
  targetCtx.closePath();
  targetCtx.fillStyle = shadeColor(face.color, brightness, 0.78);
  targetCtx.fill();
  targetCtx.strokeStyle = "rgba(255, 255, 255, 0.58)";
  targetCtx.lineWidth = 1;
  targetCtx.stroke();
}

function drawSceneAxes(targetCtx, width, height, sceneData) {
  const length = Math.ceil(Math.max(sceneData.bounds.radius * 1.5, 2));
  const tickStep = Math.max(1, Math.ceil(length / 4));

  targetCtx.save();
  targetCtx.font = "700 11px Inter, system-ui, sans-serif";
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";

  for (let value = -length; value <= length; value += tickStep) {
    const xBase = projectScenePoint({ x: value, y: -length, z: 0 }, width, height, sceneData);
    const xTop = projectScenePoint({ x: value, y: length, z: 0 }, width, height, sceneData);
    const yBase = projectScenePoint({ x: -length, y: value, z: 0 }, width, height, sceneData);
    const yTop = projectScenePoint({ x: length, y: value, z: 0 }, width, height, sceneData);

    drawSceneLine(targetCtx, xBase, xTop, "rgba(123, 132, 158, 0.11)", 0.8);
    drawSceneLine(targetCtx, yBase, yTop, "rgba(215, 118, 140, 0.13)", 0.8);

    if (value !== 0) {
      const xLabel = projectScenePoint({ x: value, y: 0, z: 0 }, width, height, sceneData);
      const yLabel = projectScenePoint({ x: 0, y: value, z: 0 }, width, height, sceneData);
      const zLabel = projectScenePoint({ x: 0, y: 0, z: value }, width, height, sceneData);
      drawAxisLabel(targetCtx, `${value}`, xLabel.x, xLabel.y + 14, "#d7768c");
      drawAxisLabel(targetCtx, `${value}`, yLabel.x + 16, yLabel.y, "#7b849e");
      drawAxisLabel(targetCtx, `${value}`, zLabel.x - 16, zLabel.y, "#d9aa68");
    }
  }

  const axes = [
    [{ x: -length, y: 0, z: 0 }, { x: length, y: 0, z: 0 }, "#d7768c", "x"],
    [{ x: 0, y: -length, z: 0 }, { x: 0, y: length, z: 0 }, "#7b849e", "y"],
    [{ x: 0, y: 0, z: -length }, { x: 0, y: 0, z: length }, "#d9aa68", "z"],
  ];

  axes.forEach(([start, end, color, label]) => {
    const a = projectScenePoint(start, width, height, sceneData);
    const b = projectScenePoint(end, width, height, sceneData);
    drawSceneLine(targetCtx, a, b, color, 1.2);
    targetCtx.fillStyle = color;
    targetCtx.font = "800 13px Inter, system-ui, sans-serif";
    targetCtx.fillText(label, b.x + 5, b.y + 4);
  });

  const origin = projectScenePoint({ x: 0, y: 0, z: 0 }, width, height, sceneData);
  drawAxisLabel(targetCtx, "0", origin.x + 12, origin.y + 12, "#dce6ea");
  targetCtx.restore();
}

function drawAxisLabel(targetCtx, text, x, y, color) {
  targetCtx.save();
  targetCtx.fillStyle = "rgba(7, 9, 12, 0.8)";
  targetCtx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  targetCtx.lineWidth = 1;
  targetCtx.beginPath();
  targetCtx.roundRect(x - 10, y - 8, 20, 16, 4);
  targetCtx.fill();
  targetCtx.stroke();
  targetCtx.fillStyle = color;
  targetCtx.fillText(text, x, y + 0.5);
  targetCtx.restore();
}

function drawSceneLine(targetCtx, a, b, color, lineWidth) {
  targetCtx.beginPath();
  targetCtx.moveTo(a.x, a.y);
  targetCtx.lineTo(b.x, b.y);
  targetCtx.strokeStyle = color;
  targetCtx.lineWidth = lineWidth;
  targetCtx.stroke();
}

function projectScenePoint(point, width, height, sceneData) {
  const bounds = sceneData.bounds || {
    center: { x: 0, y: 0, z: 0 },
    radius: 2,
  };
  const scale = (Math.min(width, height) * 0.2 * state.camera.zoom) / Math.max(bounds.radius, 0.2);
  const p = {
    x: point.x - bounds.center.x,
    y: point.y - bounds.center.y,
    z: point.z - bounds.center.z,
  };
  const rotated = rotateScenePoint(p);
  return {
    x: width / 2 + rotated.x * scale,
    y: height / 2 - rotated.z * scale,
    depth: rotated.depth,
  };
}

function rotateScenePoint(point) {
  const cy = Math.cos(state.camera.yaw);
  const sy = Math.sin(state.camera.yaw);
  const cp = Math.cos(state.camera.pitch);
  const sp = Math.sin(state.camera.pitch);
  const x1 = cy * point.x - sy * point.y;
  const y1 = sy * point.x + cy * point.y;
  const z1 = point.z;
  return {
    x: x1,
    depth: cp * y1 - sp * z1,
    z: sp * y1 + cp * z1,
  };
}

function transformSceneVector(vector) {
  const rotated = rotateScenePoint({ x: vector[0], y: vector[1], z: vector[2] });
  return normalize([rotated.x, rotated.depth, rotated.z]);
}

function drawBackground(width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#f9fbf9");
  gradient.addColorStop(1, "#dfe6e2");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(39, 53, 47, 0.08)";
  ctx.lineWidth = 1;
  const gap = 44;
  for (let x = width % gap; x < width; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = height % gap; y < height; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawSolids(width, height) {
  const projectedFaces = [];
  state.builtSolids.forEach((solid) => {
    solid.faces.forEach((face) => {
      const points = face.indices.map((index) => projectPoint(solid.vertices[index], width, height));
      const depth = points.reduce((sum, p) => sum + p.depth, 0) / points.length;
      projectedFaces.push({ face, points, depth, solid });
    });
  });

  projectedFaces.sort((a, b) => a.depth - b.depth);

  if (state.showFaces) {
    projectedFaces.forEach(({ face, points }) => {
      drawFace(face, points);
    });
  }

  if (state.showEdges) {
    state.builtSolids.forEach((solid) => {
      solid.edges.forEach(([a, b]) => {
        const pa = projectPoint(solid.vertices[a], width, height);
        const pb = projectPoint(solid.vertices[b], width, height);
        drawLine(pa, pb, "rgba(22, 33, 29, 0.66)", 1.4);
      });
    });
  }

  drawVertices(width, height);
}

function drawFace(face, points) {
  if (points.length < 3) return;
  const cameraNormal = transformVector(face.normal);
  const light = normalize([-0.35, -0.65, 0.92]);
  const brightness = 0.62 + 0.34 * Math.max(0, dot(cameraNormal, light));

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fillStyle = shadeColor(face.color, brightness, 0.78);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawVertices(width, height) {
  state.globalVertices.forEach((vertex) => {
    const point = projectPoint(vertex, width, height);
    const selected = vertex.key === state.selectedVertexKey;
    ctx.beginPath();
    ctx.arc(point.x, point.y, selected ? 5.5 : 3.2, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "#d97706" : "#17211d";
    ctx.fill();

    if (selected) {
      ctx.fillStyle = "#17211d";
      ctx.font = "700 12px Inter, system-ui, sans-serif";
      ctx.fillText(`V${vertex.displayIndex}`, point.x + 8, point.y - 8);
    }
  });
}

function drawAxes(width, height) {
  const bounds = state.bounds;
  const length = Math.max(bounds.radius * 1.35, 1);
  const origin = { x: 0, y: 0, z: 0 };
  const axes = [
    [{ x: -length, y: 0, z: 0 }, { x: length, y: 0, z: 0 }, "#be3f5f", "x"],
    [{ x: 0, y: -length, z: 0 }, { x: 0, y: length, z: 0 }, "#7b849e", "y"],
    [{ x: 0, y: 0, z: -length }, { x: 0, y: 0, z: length }, "#d97706", "z"],
  ];

  axes.forEach(([start, end, color, label]) => {
    const a = projectPoint(shiftByCenter(start, origin), width, height);
    const b = projectPoint(shiftByCenter(end, origin), width, height);
    drawLine(a, b, color, 1.2);
    ctx.fillStyle = color;
    ctx.font = "800 13px Inter, system-ui, sans-serif";
    ctx.fillText(label, b.x + 5, b.y + 4);
  });
}

function shiftByCenter(point) {
  return point;
}

function drawLine(a, b, color, lineWidth) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function projectPoint(point, width, height, useModelCenter = true) {
  const bounds = state.bounds || {
    center: { x: 0, y: 0, z: 0 },
    radius: 2,
  };
  const center = useModelCenter ? bounds.center : { x: 0, y: 0, z: 0 };
  const scale = (Math.min(width, height) * 0.2 * state.camera.zoom) / Math.max(bounds.radius, 0.2);
  const p = {
    x: point.x - center.x,
    y: point.y - center.y,
    z: point.z - center.z,
  };
  const rotated = rotatePoint(p);
  return {
    x: width / 2 + rotated.x * scale,
    y: height / 2 - rotated.z * scale,
    depth: rotated.depth,
  };
}

function rotatePoint(point) {
  const cy = Math.cos(state.camera.yaw);
  const sy = Math.sin(state.camera.yaw);
  const cp = Math.cos(state.camera.pitch);
  const sp = Math.sin(state.camera.pitch);

  const x1 = cy * point.x - sy * point.y;
  const y1 = sy * point.x + cy * point.y;
  const z1 = point.z;

  return {
    x: x1,
    depth: cp * y1 - sp * z1,
    z: sp * y1 + cp * z1,
  };
}

function transformVector(vector) {
  const rotated = rotatePoint({ x: vector[0], y: vector[1], z: vector[2] });
  return normalize([rotated.x, rotated.depth, rotated.z]);
}

function shadeColor(hex, brightness, alpha) {
  const { r, g, b } = hexToRgb(hex);
  const mix = (value) => Math.max(0, Math.min(255, Math.round(value * brightness + 255 * (1 - brightness) * 0.18)));
  return `rgba(${mix(r)}, ${mix(g)}, ${mix(b)}, ${alpha})`;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "NaN";
  const rounded = Math.abs(value) < 1e-9 ? 0 : value;
  return Number.parseFloat(rounded.toFixed(4)).toString();
}

function paletteColor(index) {
  const palette = [colors.teal, colors.blue, colors.amber, colors.rose, colors.violet, colors.green, colors.slate];
  return palette[index % palette.length];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getScrollMetrics() {
  const scroller = document.scrollingElement || document.documentElement;
  const maxScroll = Math.max(0, scroller.scrollHeight - window.innerHeight);
  return { scroller, maxScroll };
}

function getScrollTrackMetrics() {
  if (!pageScrollControl || !pageScrollThumb) return null;
  const controlRect = pageScrollControl.getBoundingClientRect();
  const trackHeight = Math.max(1, pageScrollControl.clientHeight - 6);
  const thumbHeight = pageScrollThumb.offsetHeight || 44;
  const maxThumbTop = Math.max(1, trackHeight - thumbHeight);
  return { controlRect, trackHeight, thumbHeight, maxThumbTop };
}

function updatePageScrollControl() {
  if (!pageScrollControl || !pageScrollThumb) return;
  const { scroller, maxScroll } = getScrollMetrics();
  if (maxScroll <= 8) {
    pageScrollControl.classList.add("is-hidden");
    return;
  }

  pageScrollControl.classList.remove("is-hidden");
  const trackHeight = Math.max(1, pageScrollControl.clientHeight - 6);
  const thumbHeight = clamp((window.innerHeight / scroller.scrollHeight) * trackHeight, 44, trackHeight);
  const maxThumbTop = Math.max(1, trackHeight - thumbHeight);
  const thumbTop = (scroller.scrollTop / maxScroll) * maxThumbTop;
  pageScrollThumb.style.height = `${thumbHeight}px`;
  pageScrollThumb.style.transform = `translateY(${thumbTop}px)`;
}

function scrollFromThumbTop(thumbTop) {
  const { scroller, maxScroll } = getScrollMetrics();
  const track = getScrollTrackMetrics();
  if (!track || maxScroll <= 0) return;
  const ratio = clamp(thumbTop / track.maxThumbTop, 0, 1);
  scroller.scrollTop = ratio * maxScroll;
  updatePageScrollControl();
}

function setCompetitionStatus(message, type = "") {
  if (!competitionStatus) return;
  competitionStatus.textContent = message;
  competitionStatus.classList.toggle("is-good", type === "good");
  competitionStatus.classList.toggle("is-error", type === "error");
}

function setCompetitionMode(mode) {
  state.competitionMode = mode;
  if (!competitionMode) return;
  const labels = {
    database: "영구 DB 저장",
    server: "임시 서버 저장",
    local: "브라우저 저장",
  };
  competitionMode.textContent = labels[mode] || labels.local;
}

function readLocalCompetitionEntries() {
  try {
    const raw = localStorage.getItem(COMPETITION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCompetitionEntries(entries) {
  localStorage.setItem(COMPETITION_STORAGE_KEY, JSON.stringify(entries.slice(0, 36)));
}

function hasLocalStudentSubmission(studentId, entries = readLocalCompetitionEntries()) {
  const target = String(studentId || "").replace(/\s+/g, "").toLowerCase();
  if (!target) return false;
  return entries.some((entry) => String(entry.studentId || entry.googleId || "").replace(/\s+/g, "").toLowerCase() === target);
}

async function fetchServerCompetitionEntries() {
  const response = await fetch("/api/submissions", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("server unavailable");
  const data = await response.json();
  if (data.mode) setCompetitionMode(data.mode === "supabase" ? "database" : "server");
  return Array.isArray(data) ? data : data.entries || [];
}

async function postServerCompetitionEntry(entry) {
  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    let message = "server unavailable";
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {}
    const error = new Error(message);
    error.serverResponse = true;
    throw error;
  }
  const data = await response.json();
  if (data.mode) setCompetitionMode(data.mode === "supabase" ? "database" : "server");
  return Array.isArray(data) ? data : data.entries || [];
}

function captureCompetitionImage(source) {
  const sourceCanvas = source === "experiment" ? experimentCanvas : canvas;
  const maxWidth = 900;
  const scale = Math.min(1, maxWidth / Math.max(1, sourceCanvas.width));
  const targetWidth = Math.max(1, Math.round(sourceCanvas.width * scale));
  const targetHeight = Math.max(1, Math.round(sourceCanvas.height * scale));
  const targetCanvas = document.createElement("canvas");
  const targetCtx = targetCanvas.getContext("2d");
  targetCanvas.width = targetWidth;
  targetCanvas.height = targetHeight;
  targetCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  return targetCanvas.toDataURL("image/jpeg", 0.86);
}

function getCompetitionSceneData(source) {
  const isExperiment = source === "experiment";
  return {
    vertices: isExperiment ? state.experimentVertices : state.globalVertices,
    builtSolids: isExperiment ? state.experimentBuiltSolids : state.builtSolids,
    bounds: isExperiment ? state.experimentBounds : state.bounds,
    applied: isExperiment ? state.experimentApplied || [] : [],
  };
}

function calculateAestheticScore(source, description) {
  const scene = getCompetitionSceneData(source);
  const vertices = scene.vertices.length;
  const faces = scene.builtSolids.reduce((sum, solid) => sum + solid.faces.length, 0);
  const planes = scene.builtSolids.reduce((sum, solid) => sum + solid.planes.length, 0);
  const edits = scene.applied.length;
  const bounds = scene.bounds || { minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: -1, maxZ: 1 };
  const dimensions = [
    Math.max(0.001, bounds.maxX - bounds.minX),
    Math.max(0.001, bounds.maxY - bounds.minY),
    Math.max(0.001, bounds.maxZ - bounds.minZ),
  ];
  const averageSize = dimensions.reduce((sum, value) => sum + value, 0) / dimensions.length;
  const spread = dimensions.reduce((sum, value) => sum + Math.abs(value - averageSize), 0) / averageSize;

  const balance = Math.round(clamp(100 - spread * 28, 48, 100));
  const structure = Math.round(clamp(46 + vertices * 2.8 + faces * 2.4 + planes * 0.9, 50, 100));
  const originality = Math.round(clamp(58 + edits * 12 + (source === "experiment" ? 8 : 0) + Math.min(10, Math.abs(state.camera.yaw) * 4), 52, 100));
  const presentation = Math.round(clamp(60 + Math.min(description.length, 120) * 0.16 + Math.min(vertices, 18) * 0.9, 55, 100));
  const total = Math.round(balance * 0.32 + structure * 0.28 + originality * 0.24 + presentation * 0.16);

  return {
    total,
    breakdown: {
      balance,
      structure,
      originality,
      presentation,
    },
  };
}

function normalizeCompetitionEntry(entry) {
  const score = Number.isFinite(Number(entry.aestheticScore)) ? Number(entry.aestheticScore) : 0;
  const studentId = entry.studentId || entry.googleId || "";
  const fallbackName = studentId ? String(studentId) : "익명";
  return {
    ...entry,
    studentId,
    displayName: entry.displayName || fallbackName,
    aestheticScore: score,
    scoreBreakdown: entry.scoreBreakdown || {
      balance: score,
      structure: score,
      originality: score,
      presentation: score,
    },
    description: entry.description || "",
  };
}

function createCompetitionEntry() {
  const displayName = competitionName.value.trim();
  const studentId = competitionStudentId.value.trim();
  const title = competitionTitle.value.trim() || `${models[modelSelect.value].label} 입체`;
  const description = competitionDescription.value.trim();
  const source = competitionScene.value;
  if (!studentId) {
    throw new Error("학번을 입력해 주세요.");
  }
  if (!displayName) {
    throw new Error("참가자 이름을 입력해 주세요.");
  }
  if (studentId.length > 20) {
    throw new Error("학번이 너무 깁니다.");
  }

  const applied = state.experimentApplied || [];
  const score = calculateAestheticScore(source, description);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    displayName: displayName.slice(0, 24),
    studentId,
    title: title.slice(0, 40),
    description: description.slice(0, 160),
    source,
    sourceLabel: source === "experiment" ? "2번 실험 모델" : "1번 기본 모델",
    model: models[modelSelect.value].label,
    image: captureCompetitionImage(source),
    createdAt: new Date().toISOString(),
    aestheticScore: score.total,
    scoreBreakdown: score.breakdown,
    vertexCount: source === "experiment" ? state.experimentVertices.length : state.globalVertices.length,
    planeSummary:
      source === "experiment" && applied.length
        ? applied.map((item) => `P${item.planeIndex + 1}: ${formatPlane(item.plane)}`).join(" / ")
        : `${state.solids.reduce((sum, solid) => sum + solid.planes.length, 0)}개 평면`,
  };
}

function renderCompetitionGallery() {
  if (!competitionGallery) return;
  const entries = (state.competitionEntries || [])
    .map(normalizeCompetitionEntry)
    .sort((a, b) => b.aestheticScore - a.aestheticScore || new Date(b.createdAt) - new Date(a.createdAt));
  if (!entries.length) {
    competitionGallery.innerHTML = `<div class="competition-empty">아직 제출된 3D 사진이 없습니다.</div>`;
    updatePageScrollControl();
    return;
  }

  competitionGallery.innerHTML = entries
    .map((entry, index) => {
      const date = entry.createdAt ? new Date(entry.createdAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : "";
      const score = Math.round(entry.aestheticScore || 0);
      const breakdown = entry.scoreBreakdown || {};
      const scoreRows = [
        ["균형", breakdown.balance],
        ["구조", breakdown.structure],
        ["독창", breakdown.originality],
        ["표현", breakdown.presentation],
      ]
        .map(([label, value]) => {
          const safeValue = clamp(Number(value) || 0, 0, 100);
          return `
            <div class="score-row">
              <span>${label}</span>
              <div class="score-bar"><span style="width: ${safeValue}%"></span></div>
              <span>${Math.round(safeValue)}</span>
            </div>
          `;
        })
        .join("");
      return `
        <article class="gallery-card">
          <div class="gallery-rank">${index + 1}위</div>
          <div class="gallery-score">미 ${score}</div>
          <img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.title)}" />
          <div class="gallery-card-body">
            <strong>${escapeHtml(entry.displayName)}</strong>
            <em>${escapeHtml(entry.title)} · 학번 ${escapeHtml(entry.studentId || "-")}</em>
            <span>${escapeHtml(entry.sourceLabel || "3D 모델")} · 꼭짓점 ${escapeHtml(entry.vertexCount ?? "-")}개</span>
            <span>${escapeHtml(entry.model || "")} · ${escapeHtml(date)}</span>
            <span>${escapeHtml(entry.planeSummary || "")}</span>
            ${entry.description ? `<p class="gallery-description">${escapeHtml(entry.description)}</p>` : ""}
            <div class="score-breakdown">${scoreRows}</div>
          </div>
        </article>
      `;
    })
    .join("");
  updatePageScrollControl();
}

async function loadCompetitionEntries() {
  try {
    const entries = await fetchServerCompetitionEntries();
    state.competitionEntries = entries;
    setCompetitionStatus(state.competitionMode === "database" ? "영구 DB 갤러리를 불러왔습니다." : "임시 서버 갤러리를 불러왔습니다.", "good");
  } catch {
    state.competitionEntries = readLocalCompetitionEntries();
    setCompetitionMode("local");
    setCompetitionStatus("현재는 이 브라우저에 저장됩니다.", "");
  }
  renderCompetitionGallery();
}

async function saveCompetitionEntry() {
  try {
    setCompetitionStatus("3D 사진을 저장하는 중입니다.");
    const entry = createCompetitionEntry();
    try {
      state.competitionEntries = await postServerCompetitionEntry(entry);
      setCompetitionStatus(state.competitionMode === "database" ? "영구 DB 대회 갤러리에 저장했습니다." : "임시 서버 대회 갤러리에 저장했습니다.", "good");
    } catch (serverError) {
      if (serverError.serverResponse) throw serverError;
      const currentEntries = readLocalCompetitionEntries();
      if (hasLocalStudentSubmission(entry.studentId, currentEntries)) {
        throw new Error("이미 이 학번으로 제출된 작품이 있습니다.");
      }
      const entries = [entry, ...currentEntries].slice(0, 36);
      writeLocalCompetitionEntries(entries);
      state.competitionEntries = entries;
      setCompetitionMode("local");
      setCompetitionStatus("이 브라우저의 대회 갤러리에 저장했습니다.", "good");
    }
    renderCompetitionGallery();
  } catch (error) {
    setCompetitionStatus(error.message, "error");
  }
}

function setupEvents() {
  modelSelect.addEventListener("change", () => {
    renderParameters();
    resetExperimentEdits();
    refreshPlanesFromModel();
    computeScene();
  });

  generateButton?.addEventListener("click", () => {
    resetExperimentEdits();
    computeScene();
  });
  syncButton.addEventListener("click", () => {
    resetExperimentEdits();
    refreshPlanesFromModel();
    computeScene();
  });
  resetViewButton.addEventListener("click", () => {
    state.camera.yaw = -0.72;
    state.camera.pitch = 0.58;
    state.camera.zoom = 1;
  });

  planesInput.addEventListener("input", computeScene);
  planeEditSelect.addEventListener("change", () => {
    state.experimentEdits[0].target = planeEditSelect.value;
    state.experimentEdits[0].values = null;
    fillPlaneEditorFields(0);
    syncExperimentFromEditor();
  });
  planeEdit2Select.addEventListener("change", () => {
    state.experimentEdits[1].target = planeEdit2Select.value;
    state.experimentEdits[1].values = null;
    fillPlaneEditorFields(1);
    syncExperimentFromEditor();
  });
  planeEdit2Enabled.addEventListener("change", syncExperimentFromEditor);
  [planeCoeffA, planeCoeffB, planeCoeffC, planeCoeffD, planeCoeff2A, planeCoeff2B, planeCoeff2C, planeCoeff2D].forEach((input) => {
    input.addEventListener("input", syncExperimentFromEditor);
  });
  applyPlaneButton.addEventListener("click", applyPlaneEdit);
  resetExperimentButton.addEventListener("click", resetExperimentEdits);
  saveCompetitionButton?.addEventListener("click", saveCompetitionEntry);
  refreshCompetitionButton?.addEventListener("click", loadCompetitionEntries);

  const startVertexPanelDrag = (event, captureTarget = null) => {
    event.preventDefault();
    const panelRect = vertexList.getBoundingClientRect();
    const parentRect = vertexList.parentElement.getBoundingClientRect();
    state.vertexPanelDragging = true;
    state.vertexPanelDragStart = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: panelRect.left - parentRect.left,
      y: panelRect.top - parentRect.top,
    };
    vertexList.classList.add("dragging");
    if (captureTarget?.setPointerCapture && event.pointerId !== undefined) {
      captureTarget.setPointerCapture(event.pointerId);
    }
  };

  const moveVertexPanelDrag = (event) => {
    if (!state.vertexPanelDragging) return;
    const dx = event.clientX - state.vertexPanelDragStart.pointerX;
    const dy = event.clientY - state.vertexPanelDragStart.pointerY;
    moveVertexPanelTo(state.vertexPanelDragStart.x + dx, state.vertexPanelDragStart.y + dy);
  };

  const endVertexPanelDrag = (event) => {
    if (!state.vertexPanelDragging) return;
    state.vertexPanelDragging = false;
    vertexList.classList.remove("dragging");
    if (event.pointerId !== undefined && vertexList.hasPointerCapture?.(event.pointerId)) {
      vertexList.releasePointerCapture(event.pointerId);
    }
  };

  vertexList.addEventListener("pointerdown", (event) => {
    if (!event.target.closest("[data-drag-handle='true']")) return;
    startVertexPanelDrag(event, vertexList);
  });

  vertexList.addEventListener("pointermove", moveVertexPanelDrag);
  vertexList.addEventListener("pointerup", endVertexPanelDrag);
  vertexList.addEventListener("pointercancel", endVertexPanelDrag);

  vertexList.addEventListener("mousedown", (event) => {
    if (!event.target.closest("[data-drag-handle='true']")) return;
    if (state.vertexPanelDragging) return;
    startVertexPanelDrag(event);
  });
  window.addEventListener("mousemove", moveVertexPanelDrag);
  window.addEventListener("mouseup", endVertexPanelDrag);

  toggleFacesButton.addEventListener("click", () => toggleOption("showFaces", toggleFacesButton));
  toggleEdgesButton.addEventListener("click", () => toggleOption("showEdges", toggleEdgesButton));
  toggleAxesButton.addEventListener("click", () => toggleOption("showAxes", toggleAxesButton));

  [canvas, experimentCanvas].forEach((targetCanvas) => {
    const startCanvasDrag = (event, captureTarget = null) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.button !== undefined && event.button !== 0) return;
      state.dragging = true;
      state.dragTarget = targetCanvas;
      state.dragStart = {
        x: event.clientX,
        y: event.clientY,
        yaw: state.camera.yaw,
        pitch: state.camera.pitch,
      };
      if (captureTarget?.setPointerCapture && event.pointerId !== undefined) {
        captureTarget.setPointerCapture(event.pointerId);
      }
    };

    const moveCanvasDrag = (event) => {
      if (!state.dragging || state.dragTarget !== targetCanvas) return;
      const dx = event.clientX - state.dragStart.x;
      const dy = event.clientY - state.dragStart.y;
      state.camera.yaw = state.dragStart.yaw + dx * 0.008;
      state.camera.pitch = clamp(state.dragStart.pitch + dy * 0.006, -1.18, 1.18);
    };

    const endCanvasDrag = (event) => {
      if (state.dragTarget !== targetCanvas) return;
      state.dragging = false;
      state.dragTarget = null;
      state.dragStart = null;
      if (event.pointerId !== undefined && targetCanvas.hasPointerCapture?.(event.pointerId)) {
        targetCanvas.releasePointerCapture(event.pointerId);
      }
    };

    targetCanvas.addEventListener("pointerdown", (event) => {
      startCanvasDrag(event, targetCanvas);
    });
    targetCanvas.addEventListener("pointermove", moveCanvasDrag);
    targetCanvas.addEventListener("pointerup", endCanvasDrag);
    targetCanvas.addEventListener("pointercancel", endCanvasDrag);

    targetCanvas.addEventListener("mousedown", (event) => {
      if (state.dragging) return;
      startCanvasDrag(event);
    });
    window.addEventListener("mousemove", moveCanvasDrag);
    window.addEventListener("mouseup", endCanvasDrag);

    targetCanvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      state.camera.zoom = clamp(state.camera.zoom * (1 + direction * 0.09), 0.45, 2.4);
    });
  });

  const pageDragIgnoreSelector = [
    "button",
    "input",
    "select",
    "textarea",
    "a",
    "#sceneCanvas",
    "#experimentCanvas",
    ".vertex-list",
    ".viewer-toolbar",
    ".page-scroll-control",
  ].join(",");
  let pageDragStart = null;

  document.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(pageDragIgnoreSelector)) return;
    pageDragStart = {
      x: event.clientX,
      y: event.clientY,
      lastY: event.clientY,
      active: false,
    };
  });

  window.addEventListener("mousemove", (event) => {
    if (!pageDragStart) return;
    const dx = event.clientX - pageDragStart.x;
    const dy = event.clientY - pageDragStart.y;

    if (!pageDragStart.active) {
      const distance = Math.hypot(dx, dy);
      if (distance < 8) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.1) {
        pageDragStart = null;
        return;
      }
      pageDragStart.active = true;
    }

    event.preventDefault();
    const scrollDelta = pageDragStart.lastY - event.clientY;
    if (scrollDelta !== 0) {
      window.scrollBy(0, scrollDelta);
      pageDragStart.lastY = event.clientY;
    }
  });

  window.addEventListener("mouseup", () => {
    pageDragStart = null;
  });

  const startScrollControlDrag = (event, captureTarget = null) => {
    if (event.button !== undefined && event.button !== 0) return;
    const { maxScroll } = getScrollMetrics();
    const track = getScrollTrackMetrics();
    if (!track || maxScroll <= 0) return;

    event.preventDefault();
    const currentTop = ((document.scrollingElement || document.documentElement).scrollTop / maxScroll) * track.maxThumbTop;
    const clickTop = event.clientY - track.controlRect.top - 3 - track.thumbHeight / 2;
    const startTop = event.target === pageScrollThumb ? currentTop : clamp(clickTop, 0, track.maxThumbTop);

    if (event.target !== pageScrollThumb) {
      scrollFromThumbTop(startTop);
    }

    state.pageScrollDrag = {
      pointerY: event.clientY,
      thumbTop: startTop,
    };

    if (captureTarget?.setPointerCapture && event.pointerId !== undefined) {
      captureTarget.setPointerCapture(event.pointerId);
    }
  };

  const moveScrollControlDrag = (event) => {
    if (!state.pageScrollDrag) return;
    event.preventDefault();
    const track = getScrollTrackMetrics();
    if (!track) return;
    const dy = event.clientY - state.pageScrollDrag.pointerY;
    scrollFromThumbTop(clamp(state.pageScrollDrag.thumbTop + dy, 0, track.maxThumbTop));
  };

  const endScrollControlDrag = (event) => {
    if (!state.pageScrollDrag) return;
    state.pageScrollDrag = null;
    if (event.pointerId !== undefined && pageScrollControl?.hasPointerCapture?.(event.pointerId)) {
      pageScrollControl.releasePointerCapture(event.pointerId);
    }
  };

  pageScrollControl?.addEventListener("pointerdown", (event) => {
    startScrollControlDrag(event, pageScrollControl);
  });
  pageScrollControl?.addEventListener("pointermove", moveScrollControlDrag);
  pageScrollControl?.addEventListener("pointerup", endScrollControlDrag);
  pageScrollControl?.addEventListener("pointercancel", endScrollControlDrag);

  pageScrollControl?.addEventListener("mousedown", (event) => {
    if (state.pageScrollDrag) return;
    startScrollControlDrag(event);
  });
  window.addEventListener("mousemove", moveScrollControlDrag);
  window.addEventListener("mouseup", endScrollControlDrag);
  window.addEventListener("scroll", updatePageScrollControl, { passive: true });

  window.addEventListener("resize", resizeCanvas);
}

function toggleOption(key, button) {
  state[key] = !state[key];
  button.classList.toggle("active", state[key]);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function init() {
  renderModelOptions();
  renderParameters();
  refreshPlanesFromModel();
  computeScene();
  setupEvents();
  resizeCanvas();
  loadCompetitionEntries();
  requestAnimationFrame(render);
}

init();
