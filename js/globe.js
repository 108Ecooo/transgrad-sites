/* ============================================================
   ТРАНСГРАД — 3D-глобус с маршрутами (Three.js)
   Блок «География перевозок»
   ============================================================ */
/* THREE подключён глобально классическим <script> в index.html */
(function () {
'use strict';

const canvas = document.getElementById('globe');
if (canvas) init(canvas);

function init(canvas) {
  const RED = 0x1b4b8f;   // акцент маршрута/точки отправления (яркий авиационный синий)
  const BLUE = 0x9aa9c6;  // базовые (неактивные) дуги — приглушённый стальной
  const R = 1;                       // радиус глобуса
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Точки: происхождение (Россия, Н.Новгород) + 4 направления --- */
  const ORIGIN = { lat: 56.3, lng: 44.0 };
  const ROUTES = [
    { name: 'Восточная и Западная Европа', lat: 50.1, lng: 8.7 },
    { name: 'Закавказье, Турция и Иран',   lat: 37.0, lng: 44.0 },
    { name: 'Центральная Азия',            lat: 43.2, lng: 69.0 },
    { name: 'Монголия и Китай',            lat: 43.0, lng: 105.0 },
  ];

  /* --- Renderer / Scene / Camera --- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.35, 3.4);

  const root = new THREE.Group();          // вращаем целиком
  scene.add(root);
  // Лёгкий наклон, чтобы Россия и направления смотрели на зрителя
  root.rotation.x = 0.32;
  root.rotation.y = -1.25;

  /* --- Свет --- */
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.25); key.position.set(2, 1.5, 2.5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x3a6bb0, 0.6); rim.position.set(-2.5, -1, -1); scene.add(rim);

  /* --- Ядро глобуса: реальная фото-текстура Земли (equirectangular) --- */
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x2a4a7a,                 // запасной цвет, пока текстура грузится / если недоступна
    roughness: 0.95, metalness: 0.05,
    emissive: 0x0a1a33, emissiveIntensity: 0.28,
  });
  new THREE.TextureLoader().load(
    'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      coreMat.map = tex; coreMat.color.set(0xffffff); coreMat.needsUpdate = true;
    }
  );
  const core = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), coreMat);
  // UV-развёртка SphereGeometry совпадает с latLngToVec3 → метки лягут на нужные материки
  root.add(core);

  /* --- Атмосфера (fresnel-свечение) --- */
  (function atmosphere() {
    const mat = new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(0x3a6bb0) } },
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vN; uniform vec3 uColor; void main(){ float i = pow(0.62 - dot(vN, vec3(0.,0.,1.)), 3.0); gl_FragColor = vec4(uColor, clamp(i,0.0,1.0)); }`,
    });
    const m = new THREE.Mesh(new THREE.SphereGeometry(R * 1.16, 64, 64), mat);
    scene.add(m);
  })();

  /* --- Звёздное поле: на светлом фоне скрыто (оставлено для тёмной темы) --- */
  (function starfield() {
    return;                       // светлая тема — звёзды визуально лишние
    /* eslint-disable no-unreachable */
    const pos = [];
    for (let i = 0; i < 320; i++) {
      // равномерно по сфере большого радиуса
      const u = (i * 0.61803398875) % 1;        // детерминированно, без Math.random
      const v = (i * 0.7548776662) % 1;
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 7 + (i % 5) * 0.6;
      pos.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0x8a97d6, size: 0.05, transparent: true, opacity: 0.7, sizeAttenuation: true });
    scene.add(new THREE.Points(g, m));
  })();

  /* --- Маркеры точек --- */
  function marker(lat, lng, color, size) {
    const grp = new THREE.Group();
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(size, 16, 16),
      new THREE.MeshBasicMaterial({ color })
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(size * 2.4, 16, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 })
    );
    grp.add(dot, halo);
    grp.position.copy(latLngToVec3(lat, lng, R * 1.01));
    grp.userData.halo = halo;
    root.add(grp);
    return grp;
  }

  marker(ORIGIN.lat, ORIGIN.lng, RED, 0.028);           // Россия
  const destMarkers = ROUTES.map((r) => marker(r.lat, r.lng, 0x9fb0ff, 0.02));

  /* --- Дуги маршрутов + бегущие частицы --- */
  const start = latLngToVec3(ORIGIN.lat, ORIGIN.lng, R);
  const routeObjs = ROUTES.map((r, i) => {
    const end = latLngToVec3(r.lat, r.lng, R);
    const dist = start.distanceTo(end);
    const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R * (1 + dist * 0.42));
    const curve = new THREE.QuadraticBezierCurve3(start.clone(), mid, end.clone());

    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 80, 0.006, 8, false),
      new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.5 })
    );
    const idxCount = tube.geometry.index.count;
    tube.geometry.setDrawRange(0, 0);   // дуга «прорисовывается» при появлении
    root.add(tube);

    // бегущая частица
    const pellet = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 12),
      new THREE.MeshBasicMaterial({ color: RED })
    );
    root.add(pellet);

    return { curve, tube, pellet, idxCount, marker: destMarkers[i], offset: i * 0.22, active: i === 0 };
  });

  /* --- Прорисовка дуг при первом появлении секции --- */
  let drawT = -1;                       // < 0 — ещё не запущено
  function startDraw() { if (drawT < 0) drawT = 0; }

  /* --- Пульсирующее кольцо-«пинг» у точки отправления --- */
  const pingMat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  const ping = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.05, 32), pingMat);
  ping.position.copy(latLngToVec3(ORIGIN.lat, ORIGIN.lng, R * 1.02));
  ping.lookAt(ping.position.clone().multiplyScalar(2));
  root.add(ping);

  /* --- HTML-подписи направлений, следящие за точками --- */
  const wrap = canvas.parentElement;
  const labels = ROUTES.map((r) => {
    const el = document.createElement('span');
    el.className = 'geo__label';
    el.textContent = r.name;
    wrap.appendChild(el);
    return el;
  });
  const _wp = new THREE.Vector3();

  /* --- Поворот глобуса к выбранному направлению --- */
  let targetY = root.rotation.y, seeking = false;
  function seekTo(idx) {
    const m = destMarkers[idx];
    const a0 = Math.atan2(m.position.z, m.position.x);
    let ty = a0 - Math.PI / 2 - 0.15;            // лёгкий доворот, чтобы точка была чуть правее центра
    while (ty - root.rotation.y > Math.PI) ty -= Math.PI * 2;
    while (ty - root.rotation.y < -Math.PI) ty += Math.PI * 2;
    targetY = ty; seeking = true;
  }

  /* --- Подсветка активного маршрута --- */
  function setActive(idx) {
    seekTo(idx);
    routeObjs.forEach((o, i) => {
      o.active = i === idx;
      o.tube.material.color.setHex(o.active ? RED : BLUE);
      o.tube.material.opacity = o.active ? 0.95 : 0.4;
      o.tube.scale.setScalar(o.active ? 1 : 1);
      o.marker.scale.setScalar(o.active ? 1.5 : 1);
      o.marker.userData.halo.material.opacity = o.active ? 0.5 : 0.18;
    });
    // синхрон со списком
    document.querySelectorAll('.geo__item').forEach((el, i) => el.classList.toggle('is-active', i === idx));
  }
  setActive(0);

  /* --- Список направлений: hover/click --- */
  document.querySelectorAll('.geo__item').forEach((el) => {
    const idx = +el.dataset.route;
    el.addEventListener('mouseenter', () => setActive(idx));
    el.addEventListener('click', () => setActive(idx));
  });

  /* --- Управление: перетаскивание + автоповорот + инерция --- */
  let dragging = false, px = 0, py = 0, velY = 0, velX = 0, autoRot = reduceMotion ? 0 : 0.0016;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; seeking = false; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
    velY = dx * 0.005; velX = dy * 0.005;
    root.rotation.y += velY; root.rotation.x += velX;
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  /* --- Размеры --- */
  function resize() {
    const s = canvas.clientWidth || canvas.parentElement.clientWidth;
    renderer.setSize(s, s, false);
    camera.aspect = 1; camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* --- Пауза, когда секция вне экрана --- */
  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible) startDraw();
    }, { threshold: 0.12 }).observe(document.getElementById('geography'));
  } else {
    startDraw();
  }

  /* --- Цикл рендера --- */
  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    const t = clock.getElapsedTime();

    if (!dragging) {
      if (seeking) {
        root.rotation.y += (targetY - root.rotation.y) * 0.07;
        root.rotation.x += (0.3 - root.rotation.x) * 0.07;
        velY = velX = 0;
        if (Math.abs(targetY - root.rotation.y) < 0.008) seeking = false;
      } else {
        root.rotation.y += autoRot + velY;
        root.rotation.x += velX;
        velY *= 0.94; velX *= 0.94;
        root.rotation.x = Math.max(-0.5, Math.min(0.7, root.rotation.x));
      }
    }

    // прорисовка дуг (draw-on)
    if (drawT >= 0 && drawT < 1) {
      drawT = Math.min(1, drawT + 0.018);
      routeObjs.forEach((o, i) => {
        const local = Math.max(0, Math.min(1, (drawT - i * 0.12) / 0.6));
        const eased = 1 - Math.pow(1 - local, 3);
        o.tube.geometry.setDrawRange(0, Math.floor(eased * o.idxCount));
      });
    }

    // бегущие частицы по дугам (только после прорисовки)
    routeObjs.forEach((o) => {
      const tt = (t * 0.18 + o.offset) % 1;
      o.curve.getPointAt(tt, o.pellet.position);
      const sc = o.active ? 1.3 : 0.8;
      o.pellet.scale.setScalar(sc);
      o.pellet.material.opacity = (o.active ? 1 : 0.7) * (drawT < 0 ? 0 : 1);
    });

    // пульсация активного маркера
    destMarkers.forEach((m) => {
      if (m.scale.x > 1.1) {
        const p = 1.5 + Math.sin(t * 4) * 0.18;
        m.userData.halo.scale.setScalar(p);
      } else m.userData.halo.scale.setScalar(1);
    });

    // пинг-кольцо у точки отправления
    const pp = (t * 0.6) % 1;
    ping.scale.setScalar(1 + pp * 3.2);
    ping.material.opacity = 0.6 * (1 - pp);

    renderer.render(scene, camera);

    // подписи направлений — проекция 3D → экран
    const w = canvas.clientWidth, h = canvas.clientHeight;
    routeObjs.forEach((o, i) => {
      o.marker.getWorldPosition(_wp);
      const camZ = _wp.clone().applyMatrix4(camera.matrixWorldInverse).z; // ближе к камере = больше
      const front = camZ > -3.4;
      const ndc = _wp.clone().project(camera);
      const x = (ndc.x * 0.5 + 0.5) * w;
      const y = (-ndc.y * 0.5 + 0.5) * h;
      const lbl = labels[i];
      lbl.style.transform = `translate(${x}px, ${y}px) translate(-50%, -150%)`;
      // показываем подпись только активного направления — без визуального шума
      lbl.classList.toggle('is-visible', o.active && front && drawT > 0.2);
      lbl.classList.toggle('is-active', o.active);
    });
  }
  loop();

  /* --- lat/lng → Vector3 --- */
  function latLngToVec3(lat, lng, r) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }
}
})();
