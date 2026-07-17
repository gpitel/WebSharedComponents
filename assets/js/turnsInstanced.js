/**
 * turnsInstanced.js — client-side instanced 3D turn rendering.
 *
 * Replaces the MVB++ (WASM/OCC) `drawTurns` STL path for concentric designs.
 * Rationale: for high-turn-count magnetics the OCC tessellation emits one
 * solid per turn (~2.7k triangles each, 155 MB STL / 3.1 M triangles for a
 * 1163-turn transformer), which stalls the browser on clone + STLLoader
 * parse + GPU upload. But turns within one layer differ ONLY by their axial
 * position, so the whole coil collapses to a handful of unique geometries
 * (one per layer radius x wire cross-section) instanced by a translation.
 *
 * Coordinate conventions (verified against MVB++ STL output):
 *   - scene X = radial (MAS turn coordinates[0]), Y = axial / column axis
 *     (MAS coordinates[1]), Z = depth.
 *   - a turn is a closed "racetrack" loop in the XZ plane around the winding
 *     column: straight runs along the column faces + quarter-circle corners
 *     of radius r = radialPos - columnWidth/2 (the offset of the wire centre
 *     from the column surface). For round columns the path is a circle.
 *
 * Supported: cartesian turn descriptions on rectangular or round central
 * columns, round wires (tube) and rectangular/foil wires (extruded ring).
 * Anything else (toroids, additionalCoordinates, rotated rectangular wires)
 * returns null so the caller can fall back to the exact WASM STL path.
 */

import {
  Curve,
  Vector3,
  Matrix4,
  TubeGeometry,
  ExtrudeGeometry,
  Shape,
  Path,
  Mesh,
  InstancedMesh,
  Group,
} from 'three';

const EPS = 1e-9;
const MIN_CORNER = 1e-6; // clamp for wires seated directly on the column

/**
 * Closed rounded-rectangle ("racetrack") curve in the XZ plane, y = 0,
 * centred on the origin. hw/hd are the column half-width/half-depth and
 * r is the corner radius (wire-centre offset from the column surface).
 * hw = hd = 0 degenerates to a circle of radius r (round column).
 */
class RacetrackCurve extends Curve {
  constructor(hw, hd, r) {
    super();
    this.segments = [];
    let total = 0;
    const seg = (len, fn) => {
      if (len > EPS) {
        this.segments.push({ start: total, len, fn });
        total += len;
      }
    };
    const HALF_PI = Math.PI / 2;
    // Counter-clockwise (viewed from +Y), starting at (hw + r, -hd).
    seg(2 * hd, (u) => [hw + r, -hd + 2 * hd * u]);                                   // right face
    seg(HALF_PI * r, (u) => arc(hw, hd, r, 0 + HALF_PI * u));                          // corner (+x,+z)
    seg(2 * hw, (u) => [hw - 2 * hw * u, hd + r]);                                     // far face
    seg(HALF_PI * r, (u) => arc(-hw, hd, r, HALF_PI + HALF_PI * u));                   // corner (-x,+z)
    seg(2 * hd, (u) => [-hw - r, hd - 2 * hd * u]);                                    // left face
    seg(HALF_PI * r, (u) => arc(-hw, -hd, r, Math.PI + HALF_PI * u));                  // corner (-x,-z)
    seg(2 * hw, (u) => [-hw + 2 * hw * u, -hd - r]);                                   // near face
    seg(HALF_PI * r, (u) => arc(hw, -hd, r, 3 * HALF_PI + HALF_PI * u));               // corner (+x,-z)
    this.totalLength = total;
    function arc(cx, cz, radius, theta) {
      return [cx + radius * Math.cos(theta), cz + radius * Math.sin(theta)];
    }
  }

  getPoint(t, optionalTarget = new Vector3()) {
    const s = Math.min(Math.max(t, 0), 1) * this.totalLength;
    // segments are few (<= 8): linear scan is fine
    let chosen = this.segments[this.segments.length - 1];
    for (const sg of this.segments) {
      if (s <= sg.start + sg.len + EPS) { chosen = sg; break; }
    }
    const u = chosen.len > EPS ? (s - chosen.start) / chosen.len : 0;
    const [x, z] = chosen.fn(Math.min(Math.max(u, 0), 1));
    return optionalTarget.set(x, 0, z);
  }
}

/** Rounded-rectangle contour at `off` from a hw x hd column, into a Shape/Path. */
function traceRoundedRect(ctx, hw, hd, off) {
  const HALF_PI = Math.PI / 2;
  ctx.moveTo(hw + off, -hd);
  ctx.lineTo(hw + off, hd);
  ctx.absarc(hw, hd, off, 0, HALF_PI, false);
  ctx.lineTo(-hw, hd + off);
  ctx.absarc(-hw, hd, off, HALF_PI, Math.PI, false);
  ctx.lineTo(-hw - off, -hd);
  ctx.absarc(-hw, -hd, off, Math.PI, 3 * HALF_PI, false);
  ctx.lineTo(hw, -hd - off);
  ctx.absarc(hw, -hd, off, 3 * HALF_PI, 2 * Math.PI, false);
  return ctx;
}

/** Round wire: closed tube along the racetrack. */
function roundTurnGeometry(hw, hd, r, wireRadius, opts) {
  const path = new RacetrackCurve(hw, hd, Math.max(r, MIN_CORNER));
  const tubularSegments = opts.tubularSegments ?? 96;
  const radialSegments = opts.radialSegments ?? 10;
  return new TubeGeometry(path, tubularSegments, wireRadius, radialSegments, true);
}

/**
 * Rectangular / foil wire: ring (outer rounded-rect minus inner rounded-rect)
 * extruded by the wire's axial height, then laid flat into the XZ plane.
 * `r` is the wire-centre offset from the column surface, `tw` the radial
 * thickness, `th` the axial height.
 */
function rectTurnGeometry(hw, hd, r, tw, th, opts) {
  const outerOff = r + tw / 2;
  const innerOff = Math.max(r - tw / 2, MIN_CORNER);
  const shape = traceRoundedRect(new Shape(), hw, hd, outerOff);
  const hole = traceRoundedRect(new Path(), hw, hd, innerOff);
  shape.holes.push(hole);
  const geometry = new ExtrudeGeometry(shape, {
    depth: th,
    bevelEnabled: false,
    curveSegments: opts.curveSegments ?? 16,
  });
  geometry.translate(0, 0, -th / 2); // centre the extrusion
  geometry.rotateX(Math.PI / 2);     // shape XY plane -> scene XZ plane
  return geometry;
}

function triangleCount(geometry) {
  const index = geometry.getIndex();
  if (index) return index.count / 3;
  const pos = geometry.getAttribute('position');
  return pos ? pos.count / 3 : 0;
}

/**
 * Build a THREE.Group of instanced turn meshes from a MAS magnetic.
 *
 * @param {Object} magnetic  enriched MAS magnetic (core.processedDescription
 *                           and coil.turnsDescription populated)
 * @param {Object} options
 *   - materialFor(turn, windingIndex) -> THREE.Material  (required; one call
 *     per winding, materials are shared within a winding)
 *   - tubularSegments / radialSegments / curveSegments: tessellation knobs
 * @returns {{group: Group, stats: Object} | null}  null when the design is
 *          not representable (caller should fall back to the WASM STL path).
 */
export function buildInstancedTurns(magnetic, options = {}) {
  const coil = magnetic?.coil;
  const turns = coil?.turnsDescription;
  if (!Array.isArray(turns) || turns.length === 0) return null;

  // Toroids wind through the window — not a simple planar loop.
  const family = magnetic?.core?.functionalDescription?.shape?.family;
  if (typeof family === 'string' && ['t', 'toroidal', 'ur'].includes(family.toLowerCase()) && family.toLowerCase() === 't') {
    return null;
  }

  const columns = magnetic?.core?.processedDescription?.columns;
  if (!Array.isArray(columns) || columns.length === 0) return null;
  const column = columns.find((c) => c.type === 'central') ?? columns[0];
  const colShape = (column.shape ?? 'round').toLowerCase();
  let hw;
  let hd;
  if (colShape === 'rectangular') {
    hw = column.width / 2;
    hd = column.depth / 2;
  } else if (colShape === 'round') {
    hw = 0;
    hd = 0;
  } else {
    return null; // oblong/irregular columns: keep exact WASM geometry
  }
  const cx = column.coordinates?.[0] ?? 0;
  const cz = column.coordinates?.[2] ?? 0;

  // Validate every turn before building anything.
  for (const t of turns) {
    if (t.coordinateSystem && t.coordinateSystem !== 'cartesian') return null;
    if (Array.isArray(t.additionalCoordinates) && t.additionalCoordinates.length > 0) return null;
    if (!Array.isArray(t.coordinates) || t.coordinates.length < 2) return null;
    const shape = (t.crossSectionalShape ?? 'round').toLowerCase();
    if (shape !== 'round' && shape !== 'rectangular') return null;
    if (shape === 'rectangular' && ((t.rotation ?? 0) % 360) !== 0) return null;
    if (!Array.isArray(t.dimensions) || !(t.dimensions[0] > 0)) return null;
    const radial = t.coordinates[0] - cx;
    if (colShape === 'round' ? radial <= 0 : radial <= hw - EPS) return null;
  }

  const windingIndex = new Map(
    (coil.functionalDescription ?? []).map((w, i) => [w.name, i])
  );

  // Group turns sharing a geometry (same cross-section, dims, radial pos)
  // and a material (same winding).
  const groups = new Map();
  for (const t of turns) {
    const shape = (t.crossSectionalShape ?? 'round').toLowerCase();
    const radial = t.coordinates[0] - cx;
    const key = [
      shape,
      t.dimensions[0].toFixed(9),
      (t.dimensions[1] ?? t.dimensions[0]).toFixed(9),
      radial.toFixed(9),
      t.winding ?? '',
    ].join('|');
    let g = groups.get(key);
    if (!g) {
      g = { shape, radial, dims: t.dimensions, sample: t, turns: [] };
      groups.set(key, g);
    }
    g.turns.push(t);
  }

  const materialFor = options.materialFor ?? (() => null);
  const materialCache = new Map(); // per winding
  const geometryCache = new Map(); // per cross-section+radius (winding-independent)

  const group = new Group();
  group.name = 'instancedTurns';
  let triangles = 0;
  let meshCount = 0;
  const matrix = new Matrix4();

  for (const g of groups.values()) {
    const geoKey = [g.shape, g.dims[0], g.dims[1] ?? g.dims[0], g.radial.toFixed(9)].join('|');
    let geometry = geometryCache.get(geoKey);
    if (!geometry) {
      const r = colShape === 'round' ? g.radial : g.radial - hw;
      geometry = g.shape === 'round'
        ? roundTurnGeometry(hw, hd, r, g.dims[0] / 2, options)
        : rectTurnGeometry(hw, hd, r, g.dims[0], g.dims[1] ?? g.dims[0], options);
      geometryCache.set(geoKey, geometry);
    }

    const winding = g.sample.winding ?? '';
    let material = materialCache.get(winding);
    if (!material) {
      material = materialFor(g.sample, windingIndex.get(winding) ?? 0);
      materialCache.set(winding, material);
    }

    let mesh;
    if (g.turns.length === 1) {
      mesh = new Mesh(geometry, material);
      mesh.position.set(cx, g.turns[0].coordinates[1], cz);
    } else {
      mesh = new InstancedMesh(geometry, material, g.turns.length);
      g.turns.forEach((t, i) => {
        matrix.makeTranslation(cx, t.coordinates[1], cz);
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    mesh.name = `turns:${winding}`;
    group.add(mesh);
    meshCount += 1;
    triangles += triangleCount(geometry) * g.turns.length;
  }

  return {
    group,
    stats: {
      turnCount: turns.length,
      groupCount: groups.size,
      geometryCount: geometryCache.size,
      meshCount,
      triangles: Math.round(triangles),
    },
  };
}
