"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const MODEL = new THREE.Color("#c9c7c0");
const OVERHANG = new THREE.Color("#ef6b5e");

type Props = {
  positions: Float32Array;
  overhang: Uint8Array | null;
  showOverhangs: boolean;
  /** Kolor każdego trójkąta (r, g, b w 0–1); brak = jednolity szary. */
  colors?: Float32Array | null;
};

/** Podgląd 3D (oś Z w górę, model postawiony na stole i wyśrodkowany). */
export default function Viewer({ positions, overhang, showOverhangs, colors }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ mesh: THREE.Mesh; frame: (fit: boolean) => void } | null>(null);

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
    const grid = new THREE.GridHelper(1, 1);
    grid.rotation.x = Math.PI / 2;
    sc.add(grid);

    const mesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05, side: THREE.DoubleSide }),
    );
    sc.add(mesh);

    const frame = (fit: boolean) => {
      const geo = mesh.geometry;
      geo.computeBoundingBox();
      const b = geo.boundingBox!;
      const sz = b.getSize(new THREE.Vector3());
      const r = Math.max(sz.x, sz.y, sz.z, 1);
      // Siatka stołu 10 mm, dopasowana do modelu.
      const span = Math.ceil((Math.max(sz.x, sz.y) * 1.6 + 20) / 10) * 10;
      grid.geometry.dispose();
      const g2 = new THREE.GridHelper(span, span / 10, 0x2d2d32, 0x222226);
      grid.geometry = g2.geometry;
      grid.material = g2.material;
      if (fit) {
        const target = new THREE.Vector3(0, 0, sz.z / 2);
        controls.target.copy(target);
        camera.position.set(r * 1.4, -r * 1.9, sz.z / 2 + r * 1.2);
        camera.near = r / 100;
        camera.far = r * 100;
        camera.updateProjectionMatrix();
      }
    };
    scene.current = { mesh, frame };

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
      renderer.dispose();
      renderer.domElement.remove();
      scene.current = null;
    };
  }, []);

  // Nowa geometria przy zmianie modelu/orientacji.
  useEffect(() => {
    const s = scene.current;
    if (!s) return;
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i]); maxX = Math.max(maxX, positions[i]);
      minY = Math.min(minY, positions[i + 1]); maxY = Math.max(maxY, positions[i + 1]);
      minZ = Math.min(minZ, positions[i + 2]);
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const p = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      p[i] = positions[i] - cx;
      p[i + 1] = positions[i + 1] - cy;
      p[i + 2] = positions[i + 2] - minZ;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(p.length), 3));
    geo.computeVertexNormals();
    s.mesh.geometry.dispose();
    s.mesh.geometry = geo;
    s.frame(true);
  }, [positions]);

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
  }, [positions, overhang, showOverhangs, colors]);

  return <div ref={host} className="viewer" />;
}
