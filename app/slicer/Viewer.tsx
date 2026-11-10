"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MODEL = new THREE.Color("#c9c7c0");
const OVERHANG = new THREE.Color("#ef6b5e");

export type BedRect = { x: number; y: number; w: number; d: number; label?: string };

type Props = {
  positions: Float32Array;
  overhang: Uint8Array | null;
  showOverhangs: boolean;
  /** Kolor każdego trójkąta (r, g, b w 0–1); brak = jednolity szary. */
  colors?: Float32Array | null;
  /** Stoły we współrzędnych modelu; brak = siatka pod modelem. */
  beds?: BedRect[];
};

/** Podgląd 3D (oś Z w górę). */
export default function Viewer({ positions, overhang, showOverhangs, colors, beds }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ mesh: THREE.Mesh; bedGroup: THREE.Group; frame: () => void } | null>(null);

  // Scena tworzona raz.
  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const sc = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10000);
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    sc.add(new THREE.HemisphereLight(0xffffff, 0x303034, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(1, -1.5, 2);
    sc.add(key);
    const bedGroup = new THREE.Group();
    sc.add(bedGroup);

    const mesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05, side: THREE.DoubleSide }),
    );
    sc.add(mesh);

    // Kadr obejmujący model i stoły.
    const frame = () => {
      const box = new THREE.Box3().setFromObject(mesh);
      box.union(new THREE.Box3().setFromObject(bedGroup));
      if (box.isEmpty()) return;
      const c = box.getCenter(new THREE.Vector3());
      const sz = box.getSize(new THREE.Vector3());
      const r = Math.max(sz.x, sz.y, sz.z, 1);
      controls.target.set(c.x, c.y, Math.min(c.z, sz.z / 2));
      camera.position.set(c.x + r * 0.55, c.y - r * 1.15, r * 0.9);
      camera.near = r / 200;
      camera.far = r * 50;
      camera.updateProjectionMatrix();
    };
    scene.current = { mesh, bedGroup, frame };

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let raf = 0;
    const loop = () => {
      controls.update();
      renderer.render(sc, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      mesh.geometry.dispose();
      clearGroup(bedGroup);
      renderer.dispose();
      renderer.domElement.remove();
      scene.current = null;
    };
  }, []);

  // Geometria + stoły.
  const bedKey = JSON.stringify(beds ?? null);
  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    const list: BedRect[] = JSON.parse(bedKey) ?? [];
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i]); maxX = Math.max(maxX, positions[i]);
      minY = Math.min(minY, positions[i + 1]); maxY = Math.max(maxY, positions[i + 1]);
      minZ = Math.min(minZ, positions[i + 2]);
    }
    // Bez stołów: model wyśrodkowany na siatce. Ze stołami: współrzędne bez zmian.
    const p = new Float32Array(positions.length);
    const cx = list.length ? 0 : (minX + maxX) / 2, cy = list.length ? 0 : (minY + maxY) / 2, cz = list.length ? 0 : minZ;
    for (let i = 0; i < positions.length; i += 3) {
      p[i] = positions[i] - cx;
      p[i + 1] = positions[i + 1] - cy;
      p[i + 2] = positions[i + 2] - cz;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(p.length), 3));
    geo.computeVertexNormals();
    s.mesh.geometry.dispose();
    s.mesh.geometry = geo;

    clearGroup(s.bedGroup);
    const span = Math.ceil((Math.max(maxX - minX, maxY - minY) * 1.6 + 20) / 10) * 10;
    const rects = list.length ? list : [{ x: -span / 2, y: -span / 2, w: span, d: span }];
    for (const r of rects) s.bedGroup.add(bedMesh(r, list.length > 0));
    s.frame();
  }, [positions, bedKey]);

  // Kolory części; nawisy wymagające podpór na czerwono.
  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    const col = s.mesh.geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (!col) return;
    const a = col.array as Float32Array;
    const tris = a.length / 9;
    for (let t = 0; t < tris; t++) {
      let r = MODEL.r, g = MODEL.g, b = MODEL.b;
      if (showOverhangs && overhang && overhang.length === tris && overhang[t]) (r = OVERHANG.r), (g = OVERHANG.g), (b = OVERHANG.b);
      else if (colors && colors.length === tris * 3) (r = colors[t * 3]), (g = colors[t * 3 + 1]), (b = colors[t * 3 + 2]);
      for (let v = 0; v < 3; v++) {
        a[t * 9 + v * 3] = r;
        a[t * 9 + v * 3 + 1] = g;
        a[t * 9 + v * 3 + 2] = b;
      }
    }
    col.needsUpdate = true;
  }, [positions, overhang, showOverhangs, colors, bedKey]);

  return <div ref={host} className="viewer" />;
}

/** Stół: płyta z siatką co 10 mm i obrysem. */
function bedMesh(r: BedRect, solid: boolean) {
  const g = new THREE.Group();
  if (solid) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), new THREE.MeshBasicMaterial({ color: 0x16161a }));
    plate.position.set(r.x + r.w / 2, r.y + r.d / 2, -0.05);
    g.add(plate);
  }
  const pts: number[] = [];
  for (let x = 0; x <= r.w + 1e-6; x += 10) pts.push(r.x + x, r.y, 0, r.x + x, r.y + r.d, 0);
  for (let y = 0; y <= r.d + 1e-6; y += 10) pts.push(r.x, r.y + y, 0, r.x + r.w, r.y + y, 0);
  const grid = new THREE.BufferGeometry();
  grid.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(grid, new THREE.LineBasicMaterial({ color: 0x26262b })));
  if (solid) {
    const edge = new THREE.BufferGeometry();
    edge.setAttribute("position", new THREE.Float32BufferAttribute([r.x, r.y, 0.02, r.x + r.w, r.y, 0.02, r.x + r.w, r.y + r.d, 0.02, r.x, r.y + r.d, 0.02], 3));
    g.add(new THREE.LineLoop(edge, new THREE.LineBasicMaterial({ color: 0x4a4a52 })));
  }
  return g;
}

function clearGroup(g: THREE.Group) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
  g.clear();
}
