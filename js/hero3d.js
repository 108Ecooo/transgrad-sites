/* ============================================================
   ТРАНСГРАД — лёгкий 3D-акцент в hero (Three.js)
   Медленно вращающийся каркасный «узел-хаб»: намёк на сеть
   маршрутов. Специально минималистичный, чтобы не перегружать.
   ============================================================ */
/* THREE подключён глобально классическим <script> в index.html */
(function () {
'use strict';

const canvas = document.getElementById('heroObj');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (canvas && !reduceMotion) init(canvas);

function init(canvas) {
  const NAVY = 0x16335f, STEEL = 0x26548c;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 4.4;

  const group = new THREE.Group();
  scene.add(group);

  // геометрия-основа: гранёный многогранник = «хаб» сети
  const geo = new THREE.IcosahedronGeometry(1.4, 1);

  // почти прозрачное тело — только лёгкая заливка граней
  group.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: NAVY, transparent: true, opacity: 0.05,
  })));
  // каркас рёбер
  group.add(new THREE.LineSegments(
    new THREE.WireframeGeometry(geo),
    new THREE.LineBasicMaterial({ color: NAVY, transparent: true, opacity: 0.5 })
  ));
  // узлы-вершины
  group.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: STEEL, size: 0.07, sizeAttenuation: true,
  })));

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // пауза, когда hero вне экрана
  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
  }

  // мягкий параллакс от курсора
  let tx = 0, ty = 0;
  window.addEventListener('mousemove', (e) => {
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  });

  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    group.rotation.y += 0.0024;
    group.rotation.x += (ty * 0.4 - group.rotation.x) * 0.05;
    group.rotation.z += (tx * 0.18 - group.rotation.z) * 0.05;
    renderer.render(scene, camera);
  })();
}
})();
