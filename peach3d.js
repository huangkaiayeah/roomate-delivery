// The 3D box and peach bun tower for the open task. Three.js is loaded only when this task starts.
function loadThree() {
  if (window.THREE) return Promise.resolve();
  return new Promise((ok, no) => {
    const tag = document.createElement("script");
    tag.src = "assets/three.min.js";
    tag.onload = ok;
    tag.onerror = no;
    document.head.append(tag);
  });
}

// hooks: stage ("box" or "tower"), tool() = held tool or null, say(text), pct(text), onStage(stage), onOpened()
function startPeach3D(el, hooks) {
  const T = window.THREE;
  const W = 2.4, H = 5.6, D = 2.4, CUT_REACH = 0.28, WRAP_REACH = 0.24, TAPE_GOAL = 0.9, PULL_PIXELS = 140;
  const width = el.clientWidth, height = Math.round(width * 1.1);
  const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !!hooks.snapshot }); // snapshot: the card can be saved as a picture
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(width, height);
  const canvas = renderer.domElement;
  el.append(canvas);

  const scene = new T.Scene();
  scene.background = new T.Color("#f2e9d8");
  scene.add(new T.HemisphereLight("#ffffff", "#b9a98a", 1.5));
  const sun = new T.DirectionalLight("#ffffff", 1.8);
  sun.position.set(3, 6, 5);
  scene.add(sun);
  const floor = new T.Mesh(new T.CircleGeometry(9, 48), new T.MeshStandardMaterial({ color: "#e4d6ba" }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const camera = new T.PerspectiveCamera(38, width / height, 0.1, 60);
  const view = { az: 0.5, el: 0.5, dist: 12.5, y: 2.8 }; // the box is as tall as the tower inside it
  const goal = { ...view };

  const std = (color, extra) => new T.MeshStandardMaterial({ color, ...extra });
  function textTexture(size, draw, height = size) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = height;
    draw(c.getContext("2d"), size, height);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  // ---------- Box ----------
  const boxG = new T.Group();
  scene.add(boxG);
  const card = std("#c99a5b");
  const label = textTexture(512, (g, s, h) => {
    g.fillStyle = "#c99a5b";
    g.fillRect(0, 0, s, h);
    g.strokeStyle = g.fillStyle = "#c62f1f";
    g.lineWidth = 10;
    g.strokeRect(50, 470, 412, 110);
    g.textAlign = "center";
    g.font = '900 54px "Noto Sans TC", sans-serif';
    g.fillText(PEACH.label, 256, 545);
    g.fillStyle = "#4a3417";
    g.font = '700 28px "Noto Sans TC", sans-serif';
    g.fillText(PEACH.sublabel, 256, 635);
  }, Math.round((512 * H) / W));
  const body = new T.Mesh(new T.BoxGeometry(W, H, D), [card, card, std("#3a2a16"), card, std("#ffffff", { map: label }), card]);
  body.position.y = H / 2;
  boxG.add(body);

  function flap(z, sign) {
    const pivot = new T.Group();
    pivot.position.set(0, H + 0.015, z);
    const m = new T.Mesh(new T.BoxGeometry(W, 0.03, D / 2), std("#bd8e50"));
    m.position.z = (-sign * D) / 4;
    pivot.add(m);
    boxG.add(pivot);
    return { pivot, mesh: m };
  }
  const flapFront = flap(D / 2, 1), flapBack = flap(-D / 2, -1);

  // The tape runs down the left side, over the top along the seam, and down the right side, so she has to turn the box.
  const tape = [];
  const tapeMat = std("#e8d9a8", { roughness: 0.25 });
  function tapePiece(x, y, sx, sy) {
    const m = new T.Mesh(new T.BoxGeometry(sx, sy, 0.34), tapeMat);
    m.position.set(x, y, 0);
    boxG.add(m);
    tape.push(m);
  }
  const SIDE = 8, TOP = 22, drop = 0.9;
  for (let i = 0; i < SIDE; i++) {
    const y = H - drop + ((i + 0.5) * drop) / SIDE;
    tapePiece(-W / 2 - 0.012, y, 0.024, drop / SIDE);
    tapePiece(W / 2 + 0.012, y, 0.024, drop / SIDE);
  }
  for (let i = 0; i < TOP; i++) tapePiece(-W / 2 + ((i + 0.5) * W) / TOP, H + 0.042, W / TOP, 0.024);
  const seam = new T.Mesh(new T.BoxGeometry(W, 0.012, 0.03), std("#2a1c0c"));
  seam.position.y = H + 0.036;
  boxG.add(seam);

  // ---------- Tower ----------
  const towerG = new T.Group();
  towerG.visible = false;
  scene.add(towerG);
  // Modeled on the photo of the real tower: about 120 photo pixels to one unit.
  const baseTex = textTexture(512, (g, s) => {
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, "#e8473a");
    grad.addColorStop(1, "#d61f14");
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.fillStyle = "#6f7a2a";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = '700 150px "BiauKai", "DFKai-SB", "Noto Serif TC", serif';
    for (const x of [0, s]) g.fillText("壽", x, s / 2); // u = 0 is the front of the bucket
  });
  const base = new T.Mesh(new T.CylinderGeometry(0.82, 0.78, 0.62, 40), [std("#ffffff", { map: baseTex }), std("#d61f14"), std("#d61f14")]);
  base.position.y = 0.31;
  towerG.add(base);

  // Cellophane: a transparent shell, from the bucket up and gathered under the bow.
  const profile = [[0.86, 0.34], [1.02, 0.66], [1.0, 0.85], [0.82, 1.6], [0.62, 2.5], [0.42, 3.4], [0.2, 4.2], [0.07, 4.6], [0.06, 4.72]];
  const radiusAt = (y) => {
    for (let i = 1; i < profile.length; i++) {
      if (y <= profile[i][1]) {
        const [r0, y0] = profile[i - 1], [r1, y1] = profile[i];
        return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
      }
    }
    return profile[profile.length - 1][0];
  };

  const skin = textTexture(256, (g, s) => {
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, "#b8142a");
    grad.addColorStop(0.5, "#ee4656");
    grad.addColorStop(1, "#fbb4a8");
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
  function peachGeometry(r) {
    const geo = new T.SphereGeometry(r, 18, 14);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, pos.getY(i) / r);
      pos.setY(i, pos.getY(i) + r * 0.4 * t ** 6);
    }
    geo.computeVertexNormals();
    return geo;
  }
  const fallers = [];
  const peachMat = std("#ffffff", { map: skin, roughness: 0.5 });
  const leafMat = std("#2f8f3c", { roughness: 0.6 });
  const leafGeo = new T.SphereGeometry(0.13, 10, 8);
  const addFaller = (m, r, a, speed = 0.95) => {
    towerG.add(m);
    fallers.push({ m, r, v: new T.Vector3(Math.sin(a) * speed, 0.5, Math.cos(a) * speed), spin: 3 + Math.random() * 3 });
  };
  for (let tier = 0; tier < 9; tier++) {
    const y = 0.98 + tier * 0.4, size = 0.27 - tier * 0.013, r = Math.max(radiusAt(y) - size * 0.8, 0.02);
    const n = Math.max(3, Math.floor((2 * Math.PI * r) / (size * 1.7)));
    const geo = peachGeometry(size);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + tier * 0.7;
      const m = new T.Mesh(geo, peachMat);
      m.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      m.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
      addFaller(m, size, a);
      // Green leaves between the tiers, as on the real one.
      const leaf = new T.Mesh(leafGeo, leafMat);
      const la = a + Math.PI / n, lr = radiusAt(y - 0.2) - 0.03;
      leaf.scale.set(1.15 * (1 - tier * 0.05), 0.28, 0.55);
      leaf.position.set(Math.sin(la) * lr, y - 0.2, Math.cos(la) * lr);
      leaf.rotation.y = la + Math.PI / 2;
      addFaller(leaf, 0.04, la);
    }
  }

  const shou = new T.TextureLoader().load(PEACH.emblem);
  shou.colorSpace = T.SRGBColorSpace;
  const emblem = new T.Mesh(new T.PlaneGeometry(0.782, 1.45), new T.MeshBasicMaterial({ map: shou, transparent: true, alphaTest: 0.35, side: T.DoubleSide }));
  emblem.position.set(0, 2.5, radiusAt(2.5) + 0.14);
  emblem.rotation.x = -0.22;
  towerG.add(emblem);
  fallers.push({ m: emblem, r: 0.04, v: new T.Vector3(0, 0.4, 0.8), spin: 2 });

  // Roses where the cellophane meets the bucket.
  [-1, 1].forEach((side) => {
    const rose = new T.Mesh(new T.SphereGeometry(0.14, 14, 10), std("#d81e2c", { roughness: 0.45 }));
    rose.position.set(side * 0.98, 0.82, 0.32);
    addFaller(rose, 0.14, side * 1.2, 0.8);
    [-0.55, 0.55].forEach((tilt) => {
      const leaf = new T.Mesh(leafGeo, leafMat);
      leaf.scale.set(1, 0.3, 0.6);
      leaf.position.set(side * (0.98 + 0.13), 0.82 + tilt * 0.2, 0.27);
      leaf.rotation.z = tilt * side;
      addFaller(leaf, 0.04, side * 1.2, 0.8);
    });
  });

  const wrapMat = new T.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.24, roughness: 0.08, side: T.DoubleSide, depthWrite: false });
  const wrap = new T.Mesh(new T.LatheGeometry(profile.map(([r, y]) => new T.Vector2(r, y)), 48), wrapMat);
  wrap.renderOrder = 2;
  towerG.add(wrap);

  // The dashed line to cut along, away from the emblem on the right side.
  const dashes = [];
  const dashMat = std("#c8201d"), slitMat = std("#555555");
  const DASH_ANGLE = 0.95, DASH_COUNT = 18, DASH_SPARE = 2; // the tip is narrow, so a couple of misses still count
  for (let i = 0; i < DASH_COUNT; i++) {
    const y = 1.0 + (i * 3.1) / (DASH_COUNT - 1);
    const r = radiusAt(y) + 0.012;
    const m = new T.Mesh(new T.BoxGeometry(0.06, 0.11, 0.012), dashMat);
    m.position.set(Math.sin(DASH_ANGLE) * r, y, Math.cos(DASH_ANGLE) * r);
    m.rotation.y = DASH_ANGLE;
    towerG.add(m);
    dashes.push(m);
  }

  const bow = new T.Group();
  bow.position.y = 4.74;
  towerG.add(bow);
  const ribbon = std("#ea4a1c", { roughness: 0.35 }), ribbonEdge = std("#e8b53a", { roughness: 0.3, metalness: 0.4 });
  // Each loop is an orange ribbon with a thin gold line around its outside.
  const loops = [0.15, 0.8, 1.45, 2.1, 2.75, 3.4, -0.5, -1.15].flatMap((rot) => [[ribbon, 0.24, 0.07], [ribbonEdge, 0.31, 0.014]].map(([mat, radius, tube]) => {
    const m = new T.Mesh(new T.TorusGeometry(radius, tube, 8, 28), mat);
    m.scale.set(1.25, 0.6, 0.5);
    m.rotation.z = rot;
    m.position.set(Math.cos(rot) * 0.3, Math.sin(rot) * 0.26, 0);
    bow.add(m);
    return m;
  }));
  const knot = new T.Mesh(new T.SphereGeometry(0.12, 16, 12), ribbon);
  bow.add(knot);
  const tails = [-1, 1].map((s) => {
    const m = new T.Mesh(new T.BoxGeometry(0.17, 1.0, 0.015), ribbon);
    m.position.set(s * 0.26, -0.55, 0.12);
    m.rotation.z = s * 0.22;
    bow.add(m);
    return m;
  });
  // The long ribbons from the bow down each side to the bucket.
  const sideRibbons = [-1, 1].map((s) => {
    const dx = s * (0.14 - 1.04), dy = 4.5 - 0.3, len = Math.hypot(dx, dy);
    const m = new T.Mesh(new T.BoxGeometry(0.07, len, 0.012), ribbon);
    m.position.set(s * 0.59, 2.4, 0.2);
    m.rotation.z = -Math.asin(dx / len);
    towerG.add(m);
    return m;
  });
  const bowTarget = new T.Mesh(new T.SphereGeometry(0.65, 12, 10), new T.MeshBasicMaterial({ visible: false }));
  bow.add(bowTarget);

  // ---------- Peach mountain on the desk ----------
  const deskG = new T.Group();
  deskG.visible = false;
  scene.add(deskG);
  const grain = textTexture(512, (g, s) => {
    g.fillStyle = "#b5824f";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(${i % 2 ? "90,55,25" : "215,170,120"},.18)`;
      g.lineWidth = 1 + (i % 3);
      g.beginPath();
      const y = (i * s) / 70;
      g.moveTo(0, y);
      g.bezierCurveTo(s / 3, y + 8, (s * 2) / 3, y - 8, s, y);
      g.stroke();
    }
  });
  const desk = new T.Mesh(new T.BoxGeometry(16, 0.4, 9), std("#ffffff", { map: grain }));
  desk.position.y = -0.2;
  // A stack of the invoices she was meant to be auditing.
  const papers = new T.Mesh(new T.BoxGeometry(1.5, 0.3, 1.05), std("#f7f4ea"));
  papers.position.set(3.1, 0.15, 1.5);
  papers.rotation.y = 0.25;
  deskG.add(desk, papers);
  const mountain = new T.Group();
  deskG.add(mountain);
  const heap = [];
  for (let y = 0.22; y < 3.1; y += 0.4) {
    const R = 2.9 * (1 - y / 3.3) ** 1.15, n = Math.max(1, Math.round((2 * Math.PI * R) / 0.62));
    for (let i = 0; i < n; i++) heap.push([(i / n) * Math.PI * 2 + y * 3, R, y]);
  }
  const heapPeaches = new T.InstancedMesh(peachGeometry(0.3), peachMat, heap.length);
  const heapLeaves = new T.InstancedMesh(leafGeo, leafMat, heap.length);
  const place = new T.Object3D();
  heap.forEach(([a, r, y], i) => {
    place.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    place.rotation.set(Math.cos(a) * 0.6, a, -Math.sin(a) * 0.6);
    place.scale.setScalar(1);
    place.updateMatrix();
    heapPeaches.setMatrixAt(i, place.matrix);
    place.position.set(Math.sin(a + 0.25) * (r + 0.12), y - 0.17, Math.cos(a + 0.25) * (r + 0.12));
    place.scale.set(1.1, 0.3, 0.6);
    place.updateMatrix();
    heapLeaves.setMatrixAt(i, place.matrix);
  });
  mountain.add(heapPeaches, heapLeaves);

  // ---------- Motion ----------
  const tweens = [];
  function tween(seconds, step, done) {
    tweens.push({ t: 0, seconds, step, done });
  }
  const ease = (t) => t * t * (3 - 2 * t);

  let stage = hooks.stage;
  let falling = false, cutShare = 0, bowShare = 0, bowPixels = 0;
  // Cut progress and viewing angle survive leaving the page, e.g. to fetch a tool.
  const cutIndexes = (items) => items.flatMap((m, i) => (m.userData.cut ? [i] : []));
  function saveCut() {
    hooks.saveCut({ tape: cutIndexes(tape), dashes: cutIndexes(dashes), bow: bowPixels, az: goal.az, el: goal.el });
  }
  function cutTape(m) {
    m.userData.cut = true;
    m.visible = false;
  }
  function cutDash(m) {
    m.userData.cut = true;
    m.material = slitMat;
    m.scale.x = 0.5;
  }
  function showTape() {
    const done = tape.filter((m) => m.userData.cut).length / tape.length;
    hooks.pct(`膠帶已割開 ${Math.round(done * 100)}%`);
    return done;
  }
  function showBow() {
    bowShare = Math.min(1, bowPixels / PULL_PIXELS);
    const k = 1 - 0.8 * bowShare;
    loops.forEach((m) => m.scale.set(1.25 * k, 0.6 * k, 0.5));
    knot.scale.setScalar(k);
    tails.forEach((m) => (m.position.y = -0.55 - 0.2 * bowShare));
  }
  function towerView() {
    Object.assign(goal, { dist: 9.8, y: 2.5, el: 0.2, az: 0.25 });
  }
  function showTowerProgress() {
    hooks.pct(`開封 ${Math.round((cutShare + bowShare) * 50)}%`);
  }
  if (stage === "done") {
    boxG.visible = false;
  } else if (stage === "tower") {
    boxG.visible = false;
    towerG.visible = true;
    towerView();
    Object.assign(view, goal);
    showTowerProgress();
  } else {
    showTape();
  }

  function openBox() {
    stage = "opening";
    tape.forEach((m) => (m.visible = false));
    seam.visible = false;
    hooks.say(PEACH.boxOpened);
    tween(0.8, (t) => {
      flapFront.pivot.rotation.x = 2.5 * ease(t);
      flapBack.pivot.rotation.x = -2.5 * ease(t);
    }, () => {
      towerG.visible = true; // it was inside the box all along
      towerView();
      tween(1.6, (t) => {
        boxG.position.y = -(H + 0.1) * ease(t);
      }, () => {
        boxG.visible = false;
        stage = "tower";
        saveCut();
        hooks.onStage("tower");
        hooks.say(PEACH.towerIntro);
        showTowerProgress();
      });
    });
  }

  function dropPeaches() {
    stage = "dropping";
    falling = true;
    hooks.pct("開封完成");
    hooks.say(PEACH.dropping);
    dashes.forEach((m) => (m.visible = false));
    tween(0.7, (t) => {
      wrapMat.opacity = 0.24 * (1 - t);
      wrap.scale.y = 1 - 0.5 * t;
    }, () => (wrap.visible = false));
    bow.visible = false;
    sideRibbons.forEach((m) => (m.visible = false));
    tween(2.0, () => {}, () => showMountain(false));
  }

  function showCaption() {
    el.querySelectorAll(".peach-cap").forEach((c) => c.remove());
    el.insertAdjacentHTML("beforeend", `<b class="meme-text peach-cap">${PEACH.caption.replace("🍑", "<i>🍑</i>")}</b>`);
  }

  // The fallen peaches pop up into a mountain on her desk.
  function showMountain(instant) {
    stage = "mountain";
    falling = false;
    towerG.visible = false;
    floor.visible = false;
    deskG.visible = true;
    scene.background.set("#e9dfcb");
    hooks.pct("開封完成");
    Object.assign(goal, { dist: 10.5, y: 1.7, el: 0.3, az: 0.25 });
    if (instant) {
      Object.assign(view, goal);
      showCaption();
      return;
    }
    const pop = 2.7; // how far it overshoots
    tween(0.9, (t) => {
      const u = t - 1;
      mountain.scale.setScalar(Math.max(0.01, 1 + (pop + 1) * u ** 3 + pop * u ** 2));
    }, () => {
      showCaption();
      hooks.onOpened();
    });
  }

  function checkTowerOpen() {
    showTowerProgress();
    if (cutShare + bowShare >= 1) dropPeaches();
  }

  // ---------- Finger ----------
  const ray = new T.Raycaster();
  const toolMark = document.createElement("span");
  toolMark.className = "tool-mark";
  toolMark.hidden = true;
  el.append(toolMark);

  function pick(e, targets) {
    const box = canvas.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(targets, false)[0];
    return hit ? hit.point.clone() : null;
  }

  // Marks every item the finger's path touched, so a fast swipe still counts.
  function cutAlong(e, items, targets, onCut, reach = CUT_REACH) {
    const p = pick(e, targets);
    if (!p) {
      last = null;
      return;
    }
    const from = last || p;
    for (let s = 0; s <= 6; s++) {
      const at = from.clone().lerp(p, s / 6);
      items.forEach((item) => {
        if (!item.userData.cut && item.getWorldPosition(new T.Vector3()).distanceTo(at) < reach) onCut(item);
      });
    }
    last = p;
  }

  let last = null, down = false, grabBow = false, lastX = 0, lastY = 0;
  canvas.style.touchAction = "none";
  canvas.onpointerdown = (e) => {
    canvas.setPointerCapture(e.pointerId);
    down = true;
    last = null;
    lastX = e.clientX;
    lastY = e.clientY;
    grabBow = stage === "tower" && !!pick(e, [bowTarget]);
    if (grabBow) hooks.say(PEACH.bowPull);
    else if ((stage === "box" || stage === "tower") && !hooks.tool()) hooks.say(PEACH.needTool);
  };
  canvas.onpointerup = canvas.onpointercancel = () => {
    if (down && (stage === "box" || stage === "tower")) saveCut();
    down = false;
    toolMark.hidden = true;
  };
  canvas.onpointermove = (e) => {
    if (!down) return;
    if (grabBow && stage === "tower") {
      bowPixels += Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      showBow();
      checkTowerOpen();
      return;
    }
    const tool = hooks.tool();
    if (!tool) return;
    const box = canvas.getBoundingClientRect();
    toolMark.hidden = false;
    toolMark.textContent = TOOLS[tool].icon;
    toolMark.style.left = `${e.clientX - box.left}px`;
    toolMark.style.top = `${e.clientY - box.top}px`;
    if (stage === "box") {
      cutAlong(e, tape, [body, flapFront.mesh, flapBack.mesh], cutTape);
      if (showTape() >= TAPE_GOAL) openBox();
    } else if (stage === "tower") {
      cutAlong(e, dashes, [wrap], cutDash, WRAP_REACH);
      cutShare = Math.min(1, dashes.filter((m) => m.userData.cut).length / (DASH_COUNT - DASH_SPARE));
      checkTowerOpen();
    }
  };

  // ---------- Loop ----------
  const gravity = 7;
  let before = performance.now();
  function frame(now) {
    if (!canvas.isConnected) {
      renderer.dispose();
      renderer.forceContextLoss();
      return;
    }
    const dt = Math.min((now - before) / 1000, 0.05);
    before = now;
    for (const key of ["az", "el", "dist", "y"]) view[key] += (goal[key] - view[key]) * Math.min(1, dt * 5);
    camera.position.set(
      Math.sin(view.az) * Math.cos(view.el) * view.dist,
      view.y + Math.sin(view.el) * view.dist,
      Math.cos(view.az) * Math.cos(view.el) * view.dist
    );
    camera.lookAt(0, view.y, 0);
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      tw.step(Math.min(1, tw.t / tw.seconds));
      if (tw.t >= tw.seconds) {
        tweens.splice(i, 1);
        if (tw.done) tw.done();
      }
    }
    if (falling) {
      for (const f of fallers) {
        f.v.y -= gravity * dt;
        f.m.position.addScaledVector(f.v, dt);
        if (f.spin) f.m.rotation.x += f.spin * dt;
        if (f.m.position.y < f.r) {
          f.m.position.y = f.r;
          f.v.y *= -0.45;
          f.v.x *= 0.72;
          f.v.z *= 0.72;
          f.spin *= 0.6;
        }
      }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Put back what she already did. A page left mid-animation finishes that animation now.
  const saved = hooks.saved;
  (saved.tape || []).forEach((i) => cutTape(tape[i]));
  (saved.dashes || []).forEach((i) => cutDash(dashes[i]));
  bowPixels = saved.bow || 0;
  showBow();
  cutShare = Math.min(1, dashes.filter((m) => m.userData.cut).length / (DASH_COUNT - DASH_SPARE));
  if (saved.az !== undefined && stage !== "done") {
    view.az = goal.az = saved.az;
    view.el = goal.el = saved.el;
  }
  if (stage === "done") {
    showMountain(true);
  } else if (stage === "box") {
    if (showTape() >= TAPE_GOAL) openBox();
  } else {
    checkTowerOpen();
  }

  return {
    // The card replays the mountain popping up and the caption growing.
    replay: () => {
      mountain.scale.setScalar(0.01);
      showMountain(false);
    },
    snapshot: () => canvas.toDataURL("image/png"),
    turn: (dir) => {
      goal.az += (dir * Math.PI) / 2;
      saveCut();
    },
    tilt: () => {
      goal.el = goal.el > 0.9 ? 0.28 : 1.15;
      saveCut();
    },
  };
}
