const KEY = "roommate-post-v8";
const app = document.getElementById("app");
const S = JSON.parse(localStorage.getItem(KEY)) || {
  parts: {}, rungs: null, start: null, landed: null, current: null,
  bag: [], icons: [], matched: {}, fillHints: 0, held: null, log: [], peachStage: "box", chat: [], chatHint: false, tracked: false,
  queueId: "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)),
};
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
const newCardState = () => ({ open: [], answers: {}, hints: {}, won: null, app: null });
S.card = S.card || newCardState();
S.dormLogin = S.dormLogin || {};

const norm = (s) => s.normalize("NFKC").toLowerCase().replace(/[\s-]/g, "");
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const isCorrect = (item, text) =>
  item.check ? item.check(norm(text)) : item.answer.some((a) => norm(text).includes(norm(a)));
const openTasks = () => Object.keys(TASKS).filter((k) => !S.parts[k]);
const cardUnlocked = (key) => (key === "chat" ? S.chatHint : key === "meme" ? S.card.memeSeen : S.parts[key]);

function rocDate() {
  const d = new Date();
  return `${d.getFullYear() - 1911} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function shell(section, title, body) {
  const nav = [["", "查詢專區"], ["download", "下載專區"], ["mobile", "行動郵局"]];
  const here = location.hash.slice(1);
  app.innerHTML = `
    <div class="topbar"><a href="#sitemap">網站導覽</a><a href="#dorm">宿舍郵局</a><a href="#ntpu">北大郵局</a></div>
    <header class="brand">
      <a href="#" class="emblem" aria-label="回首頁">室</a>
      <a href="#" class="name"><b>室友郵政全球資訊網</b><small>Roommate Post Co., Ltd.</small></a>
      <div class="date">${rocDate()}</div>
    </header>
    <nav class="mainnav">${nav.map(([h, t]) => `<a href="#${h}" class="${(here === "download" || here === "mobile" ? here : "") === h ? "on" : ""}">${t}</a>`).join("")}</nav>
    <main class="page">
      <h2 class="title"><b>${section}</b><span>${title}</span></h2>
      <p class="crumb"><a href="#">首頁</a> &gt; ${section} &gt; <em>${title}</em></p>
      ${body}
    </main>
    <footer>本站為私人生日禮物，純屬惡搞，與中華郵政股份有限公司無關。<span class="version">v${CONFIG.version}</span>
      ${location.search.includes("test") ? `<button class="reset" data-restart>測試用：清除紀錄，從頭開始</button>` : ""}</footer>`;
}

function restart() {
  if (!confirm("確定要從頭開始嗎？")) return;
  localStorage.removeItem(KEY);
  location.href = location.pathname + location.search;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-restart]")) restart();
});

// A real event: notifies her now and stays in the record list with its time.
function record(title, body) {
  S.log.push({ at: Date.now(), title, body });
  save();
  showPush(title, body);
  renderBag(false);
}

function collectIcon(id, where) {
  S.icons.push(id);
  record(`【物品領取】${ICONS[id].emoji} ${ICONS[id].name}`, `已於${where}領取，並收進郵便箱。`);
}

function finishTask(key) {
  const t = TASKS[key];
  S.parts[key] = true;
  record("【任務完成】" + t.title, `已取得追蹤號碼第 ${t.n + 1} 段：${CONFIG.parts[t.n]}，並解鎖一張卡片。`);
  Object.assign(S, { current: null, rungs: null, start: null, landed: null });
  save();
  render();
}

function renderGot(key) {
  const t = TASKS[key];
  shell("主線任務", t.title, `
    <div class="got">
      <p>任務完成，已取得追蹤號碼第 ${t.n + 1} 段</p>
      <p class="part">${CONFIG.parts[t.n]}</p>
      ${key === "match" ? `<figure class="evidence"><img src="${UK_EVIDENCE.img}" alt="${UK_EVIDENCE.alt}"><figcaption>${UK_EVIDENCE.caption}</figcaption></figure>` : ""}
      <p>下載專區已解鎖一張新卡片。</p>
      <a class="btn" href="#download">前往下載專區</a>
      <a class="btn alt" href="#">回查詢專區</a>
    </div>`);
}

// Clues stay hidden until she asks: each click of the button reveals exactly one more.
const clueLine = (h) => `<p class="hintbox">${h}</p>`;
const clueButton = (id, hidden) => `<button type="button" class="clue-q" id="${id}" aria-label="線索" ${hidden ? "hidden" : ""}>?</button>`;
const clueList = (id, hints, shown) => `<div id="${id}list">${hints.slice(0, shown).map(clueLine).join("")}</div>`;
function mountClue(id, hints, shown, onShow) {
  const button = document.getElementById(id);
  button.onclick = () => {
    document.getElementById(`${id}list`).insertAdjacentHTML("beforeend", clueLine(hints[shown++]));
    button.hidden = shown >= hints.length;
    if (onShow) onShow(shown);
  };
}

function drawTask(key) {
  S.current = key;
  save();
  if (key === "match") record("【服務開通】收集魚", "可從三牲連連看頁面前往查詢專區收集。");
}

function fishBlank() {
  if (S.current !== "match" || S.icons.includes(FISH_BLANK.icon)) return "";
  return `
    <form id="fishform" class="fishform">
      <div class="q-row"><label for="fishans">${FISH_BLANK.before} ___${FISH_BLANK.after}</label>${clueButton("fishhint", S.fillHints >= FISH_BLANK.hints.length)}</div>
      <input id="fishans" autocomplete="off">
      <button>收集 🐟</button>
      ${clueList("fishhint", FISH_BLANK.hints, S.fillHints)}
      <p class="err" id="fisherr" role="alert"></p>
    </form>`;
}

function renderHome() {
  const slots = Object.entries(TASKS).map(([key, t]) => `<span class="slot">${S.parts[key] ? CONFIG.parts[t.n] : "－－－－"}</span>`).join("");
  const open = openTasks().length;
  shell("郵務業務", "國際郵件追蹤查詢", `
    <p class="notice">${HOME.notice.replace(/^(.*?君：)/, "<b>$1</b>")}</p>
    <div class="tiles">
      <a class="tile main ${open ? "" : "done"}" href="${S.current ? `#${S.current}` : "#ladder"}"><span><b>${HOME.ladder}</b><small>${S.current ? `進行中：${TASKS[S.current].title}` : open ? HOME.ladderStart : "全部完成"}</small></span><i>→</i></a>
    </div>
    ${fishBlank()}
    <form id="track" class="trackbox">
      <label for="num">國際包裹追蹤號碼</label>
      <div class="slots" aria-label="已取得的號碼">${slots}</div>
      <input id="num" autocomplete="off" inputmode="numeric" placeholder="請輸入完整號碼">
      <button>查詢</button>
      <p class="err" id="err" role="alert"></p>
    </form>`);
  const fishform = document.getElementById("fishform");
  if (fishform) {
    mountClue("fishhint", FISH_BLANK.hints, S.fillHints, (shown) => {
      S.fillHints = shown;
      save();
    });
    fishform.onsubmit = (e) => {
      e.preventDefault();
      if (isCorrect(FISH_BLANK, document.getElementById("fishans").value)) {
        collectIcon(FISH_BLANK.icon, "查詢專區");
        location.hash = S.current;
      } else {
        document.getElementById("fisherr").textContent = "查核未通過，請再試一次。";
      }
    };
  }
  document.getElementById("track").onsubmit = (e) => {
    e.preventDefault();
    if (!openTasks().length && norm(document.getElementById("num").value) === CONFIG.parts.join("")) {
      if (!S.tracked) record("【查詢成功】國際包裹", "已查到您的包裹。");
      S.tracked = true;
      save();
      location.hash = "track";
    } else {
      document.getElementById("err").textContent = "查無此郵件資料，請確認號碼。";
    }
  };
}

// Ladder geometry: columns sit at cell centers so the HTML buttons above line up with the SVG.
// One column per unfinished task.
const LW = 300, LH = 220, ROWS = 7;
const colX = (c) => ((c + 0.5) * LW) / openTasks().length;
const rowY = (r) => ((r + 1) * LH) / (ROWS + 1);

function tracePath(start) {
  let c = start;
  const pts = [[colX(c), 0]];
  S.rungs.forEach((gap, r) => {
    if (gap === c || gap === c - 1) {
      pts.push([colX(c), rowY(r)]);
      c = gap === c ? c + 1 : c - 1;
      pts.push([colX(c), rowY(r)]);
    }
  });
  pts.push([colX(c), LH]);
  return { pts, end: c };
}

const toPoints = (pts) => pts.map((p) => p.join(",")).join(" ");

function animate(pts, done) {
  const line = document.getElementById("trace");
  line.setAttribute("points", toPoints(pts));
  line.classList.add("run");
  setTimeout(done, 1100);
}

const pickCard = (opt, side) => `<button data-side="${side}">
  ${opt.img ? `<img src="${opt.img}" alt="">` : ""}<span>${opt.label}</span></button>`;

function renderLadder() {
  const open = openTasks();
  if (!open.length) {
    return shell("主線任務", "郵路爬梯抽籤", `<div class="got"><p>所有郵路都走完了。到查詢專區輸入追蹤號碼吧。</p><a class="btn" href="#">回查詢專區</a></div>`);
  }
  // The last task needs no draw.
  if (open.length === 1 && !S.current) drawTask(open[0]);
  if (S.current && S.landed === null) {
    return shell("主線任務", "郵路爬梯抽籤", `
      <div class="got"><p>只剩最後一條郵路：</p><p class="part small-part">${TASKS[S.current].title}</p>
      <a class="btn" href="#${S.current}">開始任務</a></div>`);
  }
  if (!S.rungs) {
    S.rungs = Array.from({ length: ROWS }, () => Math.floor(Math.random() * (open.length - 1)));
    save();
  }
  const n = open.length;
  const cols = open.map((_, c) => `<line x1="${colX(c)}" y1="0" x2="${colX(c)}" y2="${LH}"/>`).join("");
  const rungs = S.rungs.map((g, r) => `<line x1="${colX(g)}" y1="${rowY(r)}" x2="${colX(g + 1)}" y2="${rowY(r)}"/>`).join("");
  const landed = S.landed !== null;
  const walked = landed ? tracePath(S.start).pts : [];
  shell("主線任務", "郵路爬梯抽籤", `
    ${landed ? "" : "<p>選一條郵路，看看會抽中哪項任務。</p>"}
    <div class="starts" style="grid-template-columns:repeat(${n},1fr)">
      ${open.map((_, c) => `<button data-c="${c}" ${landed ? "disabled" : ""}>${"甲乙丙"[c]}</button>`).join("")}
    </div>
    <svg class="ladder" viewBox="0 0 ${LW} ${LH}" role="img" aria-label="爬梯抽籤圖">${cols}${rungs}
      <polyline class="walked" pathLength="1" points="${toPoints(walked)}"/><polyline id="trace" pathLength="1" points=""/></svg>
    <div class="starts ends" style="grid-template-columns:repeat(${n},1fr)">
      ${open.map((_, c) => `<span class="${S.landed === c ? "hit" : ""}">${S.landed === c ? "✉" : "？"}</span>`).join("")}
    </div>
    ${landed ? `<div class="gift"><small>你抽中的任務</small><b>${TASKS[S.current].title}</b><p>${TASKS[S.current].desc}</p></div><a class="btn" href="#${S.current}">開始任務</a>` : ""}`);
  if (landed) return;
  app.querySelectorAll(".starts button").forEach((b) => {
    b.onclick = () => {
      app.querySelectorAll(".starts button").forEach((x) => (x.disabled = true));
      const { pts, end } = tracePath(+b.dataset.c);
      animate(pts, () => {
        S.start = +b.dataset.c;
        S.landed = end;
        drawTask(openTasks()[end]);
        render();
      });
    };
  });
}

// A task can only be opened once the ladder has drawn it.
function taskGuard(key) {
  if (S.parts[key]) {
    renderGot(key);
    return false;
  }
  if (S.current !== key) {
    location.hash = "ladder";
    return false;
  }
  return true;
}

// What a food looks like at a given age (seconds in the pan).
function fryStage(food, age) {
  if (age >= food.gone) return "gone";
  if (age >= food.burnt) return "burnt";
  return age >= food.ready ? "ready" : "raw";
}

// Drawn after the sender's reference pictures. .crust is the browned part that appears once cooked.
const FRY_CHEF = `<img src="assets/chef.png" alt="">`;

const FRY_ART = {
  gyoza: `<path class="dough" d="M3 30 Q8 22 14 18 Q18 14 22 16 Q26 12 30 14 Q34 11 38 14 Q42 12 46 16 Q50 15 54 20 Q58 24 61 30 C57 37 46 41 32 41 C18 41 7 37 3 30 Z"/>
    <path class="crust" d="M5 32 C10 38 22 41 32 41 C42 41 54 38 59 32 C50 36 14 36 5 32 Z"/>
    <path class="crust" d="M15 26 C19 21 26 21 30 24 C26 28 19 29 15 26 Z"/>
    <path class="crust" d="M34 23 C38 19 45 20 49 24 C45 28 38 28 34 23 Z"/>
    <path class="pleat" d="M20 17 L22 23 M28 14 L29 21 M36 13 L35 20 M44 15 L42 22 M51 19 L48 24"/>`,
  xlb: `<path class="dough" d="M7 37 C5 22 18 9 32 8 C46 9 59 22 57 37 C45 43 19 43 7 37 Z"/>
    <path class="pleat" d="M32 8 C25 13 19 22 15 34 M32 8 C28 16 26 25 25 39 M32 8 C36 16 38 25 39 39 M32 8 C39 13 45 22 49 34"/>
    <circle class="dough knot" cx="32" cy="8" r="3"/>
    <ellipse class="shine" cx="21" cy="24" rx="4" ry="6" transform="rotate(25 21 24)"/>`,
  bun: `<ellipse class="dough" cx="32" cy="25" rx="27" ry="17"/>
    <path class="crust" d="M6 27 C10 38 54 38 58 27 C56 37 46 42 32 42 C18 42 8 37 6 27 Z"/>
    <ellipse class="crust" cx="20" cy="27" rx="8" ry="5"/>
    <ellipse class="crust" cx="43" cy="22" rx="7" ry="4.5"/>
    <path class="pleat" d="M32 12 C27 15 24 19 23 23 M32 12 C30 16 30 20 31 24 M32 12 C35 15 38 18 40 22 M32 12 C37 13 42 15 45 18"/>
    <rect class="green" x="14" y="17" width="5" height="2.6" rx="1.2" transform="rotate(-20 16 18)"/>
    <rect class="green" x="38" y="29" width="5" height="2.6" rx="1.2" transform="rotate(15 40 30)"/>
    <rect class="green" x="27" y="31" width="4.5" height="2.4" rx="1.2"/>`,
};

function renderEat() {
  if (!taskGuard("eat")) return;
  const title = TASKS.eat.title;
  const stages = Object.keys(FRY.states);
  shell("主線任務", title, `
    <p>${FRY.intro}</p>
    <div class="fry-legend">
      <b class="fry-state" id="frystate" role="status">${FRY.states.raw}</b>
      <div class="fry-pan">
        ${Object.keys(FRY.foods).map((t) => `<div class="fry-slot ${t} raw" data-legend><svg viewBox="0 0 64 46" aria-hidden="true">${FRY_ART[t]}</svg><small>${FRY.foods[t].name}</small></div>`).join("")}
      </div>
    </div>
    <button class="btn" id="frystart">${FRY.start}</button>`);
  // Shows each food going raw, cooked, burnt, so she knows what to look for.
  let n = 0;
  legendTimer = setInterval(() => {
    const stage = stages[++n % stages.length];
    document.getElementById("frystate").textContent = FRY.states[stage];
    app.querySelectorAll("[data-legend]").forEach((el) => {
      el.classList.remove(...stages);
      el.classList.add(stage);
    });
  }, 1400);
  document.getElementById("frystart").onclick = () => {
    clearInterval(legendTimer);
    playFry();
  };
}

function playFry() {
  shell("主線任務", TASKS.eat.title, `
    <div class="fry-bar"><b id="frycount" role="status">🥟 0 / ${FRY.goal}</b><b id="frytime">${FRY.seconds.toFixed(1)}</b></div>
    <p class="fry-msg" id="frymsg" role="status"></p>
    <div class="fry-kitchen" id="kitchen">
      ${[0, 1, 2].map((p) => `
        <div class="fry-station">
          <div class="fry-chef" data-chef="${p}" aria-hidden="true">${FRY_CHEF}</div>
          <div class="fry-pan">
            ${Array.from({ length: FRY.panSize }, (_, i) => `<button class="fry-slot" data-pan="${p}" data-i="${i}" aria-label="空的"></button>`).join("")}
          </div>
        </div>`).join("")}
    </div>`);
  const kitchen = document.getElementById("kitchen"), types = Object.keys(FRY.foods);
  const [lo, hi] = FRY.chefDelay, wait = () => lo + Math.random() * (hi - lo);
  const pans = [0, 1, 2].map(() => Array(FRY.panSize).fill(null));
  const nextCook = pans.map(() => Math.random() * lo);
  const startedAt = performance.now();
  let eaten = 0, over = false;
  const say = (text) => (document.getElementById("frymsg").textContent = text);
  const slotEl = (p, i) => kitchen.querySelector(`[data-pan="${p}"][data-i="${i}"]`);
  const clear = (p, i) => {
    pans[p][i] = null;
    const el = slotEl(p, i);
    el.className = "fry-slot";
    el.innerHTML = "";
    el.setAttribute("aria-label", "空的");
  };

  kitchen.onclick = (e) => {
    const el = e.target.closest("[data-pan]");
    if (!el || over) return;
    const p = +el.dataset.pan, i = +el.dataset.i, item = pans[p][i];
    if (!item) return;
    const stage = fryStage(FRY.foods[item.type], (performance.now() - startedAt) / 1000 - item.born);
    if (stage === "raw") return say(FRY.raw);
    const chop = document.createElement("span");
    chop.className = "fry-chop";
    chop.textContent = "🥢";
    el.parentElement.append(chop);
    chop.style.top = `${el.offsetTop}px`;
    setTimeout(() => chop.remove(), 300);
    clear(p, i);
    if (stage === "burnt") return say(FRY.burnt);
    if (item.type !== "gyoza") return say(FRY.notGyoza);
    eaten++;
    say(FRY.got);
    document.getElementById("frycount").textContent = `🥟 ${eaten} / ${FRY.goal}`;
    if (eaten >= FRY.goal) {
      over = true;
      finishTask("eat");
    }
  };

  const tick = (now) => {
    if (over || !kitchen.isConnected) return;
    const t = (now - startedAt) / 1000;
    const left = FRY.seconds - t;
    if (left <= 0) {
      over = true;
      document.getElementById("frytime").textContent = "0.0";
      kitchen.classList.add("fry-over");
      kitchen.insertAdjacentHTML("afterend", `<p class="err">${FRY.timeUp}只吃到 ${eaten} 顆。</p><button class="btn" id="fryretry">${FRY.retry}</button>`);
      document.getElementById("fryretry").onclick = playFry;
      return;
    }
    document.getElementById("frytime").textContent = left.toFixed(1);
    pans.forEach((pan, p) => {
      pan.forEach((item, i) => {
        if (!item) return;
        const food = FRY.foods[item.type], stage = fryStage(food, t - item.born);
        if (stage === "gone") return clear(p, i);
        if (stage !== item.stage) {
          item.stage = stage;
          const el = slotEl(p, i);
          el.className = `fry-slot ${item.type} ${stage}`;
          el.setAttribute("aria-label", `${food.name}，${{ raw: "還沒熟", ready: "熟了", burnt: "燒焦了" }[stage]}`);
        }
      });
      const free = pan.indexOf(null);
      if (free >= 0 && t >= nextCook[p]) {
        const type = types[Math.floor(Math.random() * types.length)];
        pan[free] = { type, born: t, stage: "raw" };
        const el = slotEl(p, free);
        el.className = `fry-slot ${type} raw`;
        el.setAttribute("aria-label", `${FRY.foods[type].name}，還沒熟`);
        el.innerHTML = `<svg viewBox="0 0 64 46" aria-hidden="true">${FRY_ART[type]}</svg><small>${FRY.foods[type].name}</small>`;
        nextCook[p] = t + wait();
        const chef = kitchen.querySelector(`[data-chef="${p}"]`);
        chef.classList.remove("cook");
        void chef.offsetWidth;
        chef.classList.add("cook");
      }
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

let peach3dFailed = false;
function renderOpen() {
  if (!taskGuard("open")) return;
  const done = S.peachStage === "done";
  const intro = done ? PEACH.after : S.peachStage === "tower" ? PEACH.towerIntro : PEACH.boxIntro;
  shell("主線任務", TASKS.open.title, `
    <p id="peachmsg" role="status">${intro}</p>
    ${done && peach3dFailed ? "" : `
      <p class="progress" id="peachpct"></p>
      <div class="stage3d" id="stage3d"></div>
      <div class="angles" id="angles" hidden>
        <button data-turn="-1">◀ 向左轉</button><button data-tilt>俯視／平視</button><button data-turn="1">向右轉 ▶</button>
      </div>`}
    <button class="btn" id="claim" ${done ? "" : "hidden"}>收下壽桃，取得號碼</button>`);
  document.getElementById("claim").onclick = () => finishTask("open");
  if (done && peach3dFailed) return;
  const say = (text) => (document.getElementById("peachmsg").textContent = text);
  const stageEl = document.getElementById("stage3d");
  const finish = () => {
    S.peachStage = "done";
    save();
  };
  loadThree().then(() => {
    if (!stageEl.isConnected) return;
    const view3d = startPeach3D(stageEl, {
      stage: S.peachStage,
      tool: () => S.held,
      saved: S.peachCut || {},
      saveCut: (cut) => {
        S.peachCut = cut;
        save();
      },
      say,
      pct: (text) => (document.getElementById("peachpct").textContent = text),
      onStage: (stage) => {
        S.peachStage = stage;
        save();
      },
      onOpened: () => {
        finish();
        say(PEACH.after);
        document.getElementById("claim").hidden = false;
        document.getElementById("angles").hidden = true;
      },
    });
    document.getElementById("angles").hidden = S.peachStage === "done";
    app.querySelectorAll("[data-turn]").forEach((b) => {
      b.onclick = () => view3d.turn(+b.dataset.turn);
    });
    app.querySelector("[data-tilt]").onclick = () => view3d.tilt();
  }).catch(() => {
    // No 3D on this device: never block the gift, show the photo instead.
    peach3dFailed = true;
    finish();
    render();
  });
}

const PARCEL_ICON = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <polygon points="32,6 60,19 32,32 4,19" fill="#fbfbf6" stroke="#a9ab9c"/>
  <polygon points="12,17.5 35,28 28.5,31 5.5,20" fill="#8cc63f"/>
  <polygon points="4,19 32,32 32,61 4,48" fill="#f3f4ea" stroke="#a9ab9c"/>
  <polygon points="32,32 60,19 60,48 32,61" fill="#fbfbf6" stroke="#a9ab9c"/>
  <g transform="matrix(1,.464,0,1,4,19)">
    <path d="M0 11 Q13 3 28 8 V29 H0 Z" fill="#8cc63f"/>
    <path d="M3 29 C2 19 9 11 16 11 C20 11 22.5 13.5 23 17 C18 19 16 23 16 29 Z" fill="#fff"/>
    <polygon points="22.6,14.5 28,18 22.8,19.2" fill="#e8542f"/>
    <circle cx="18.5" cy="15.2" r="1" fill="#2b2420"/>
  </g>
  <g transform="matrix(1,-.464,0,1,32,32)">
    <path d="M0 29 V19 Q14 26 28 15 V29 Z" fill="#8cc63f"/>
    <text x="5" y="11" font-size="8" font-weight="700" fill="#5d8f1f">box</text>
  </g>
</svg>`;

// Taiwan post office style, e.g. 115/11/06 00:12:34, on her device's clock.
function rocTime(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear() - 1911}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

let bagPanel = null; // "bag", "log" or nothing open
function renderBag(locked) {
  const box = document.getElementById("bag");
  if (locked) {
    box.innerHTML = "";
    return;
  }
  const items = S.bag.map((key) => `
    <button data-tool="${key}" class="${S.held === key ? "held" : ""}">${TOOLS[key].icon} ${TOOLS[key].name}<small>${S.held === key ? "使用中，點一下放回" : "點一下取出"}</small></button>`).join("");
  const unplaced = S.icons.filter((id) => !Object.values(S.matched).includes(id));
  const count = S.bag.length + unplaced.length + (S.card.won ? 1 : 0);
  const head = (title) => `<div class="bag-head"><b>${title}</b><button class="bag-x" id="bagx" aria-label="關閉">✕</button></div>`;
  const panels = {
    bag: `<div class="bag-panel">${head("我的郵便箱")}
      <div class="bag-body">
        <p>${S.bag.length ? BAG.filled : BAG.empty}</p>
        ${items}
        ${S.card.won ? `<a class="bag-card" href="#studentid">💳 學生證<small>點一下查看</small></a>` : ""}
        ${unplaced.length ? `<p class="bag-icons" aria-label="收集到的三牲">${unplaced.map((id) => ICONS[id].emoji).join("")}</p>` : ""}
        ${S.bag.length === Object.keys(TOOLS).length ? "" : `<a href="#dorm">〉〉${BAG.more}</a>`}
      </div>
    </div>`,
    log: `<div class="bag-panel">${head("處理紀錄")}
      <div class="bag-body">
        ${S.log.length ? `<ol class="log-list">${[...S.log].reverse().map((e) => `<li><time>${rocTime(e.at)}</time><b>${e.title}</b><span>${e.body}</span></li>`).join("")}</ol>` : `<p>${BAG.noLog}</p>`}
      </div>
    </div>`,
  };
  box.innerHTML = `
    ${panels[bagPanel] || ""}
    <button class="bag-btn" id="bagbtn" aria-expanded="${bagPanel === "bag"}" aria-label="我的郵便箱">${PARCEL_ICON}${S.held ? `<i>${TOOLS[S.held].icon}</i>` : count ? `<i>${count}</i>` : ""}</button>
    <button class="log-btn" id="logbtn" aria-expanded="${bagPanel === "log"}">紀錄${S.log.length ? ` ${S.log.length}` : ""}</button>`;
  const toggle = (panel) => () => {
    bagPanel = bagPanel === panel ? null : panel;
    renderBag(false);
  };
  document.getElementById("bagbtn").onclick = toggle("bag");
  document.getElementById("logbtn").onclick = toggle("log");
  if (bagPanel) document.getElementById("bagx").onclick = toggle(bagPanel);
  box.querySelectorAll("[data-tool]").forEach((b) => {
    b.onclick = () => {
      S.held = S.held === b.dataset.tool ? null : b.dataset.tool;
      save();
      renderBag(false);
    };
  });
}

let matchPick = null, matchEarlyClue = false;

// Any order, as long as no picture stays where it was in the sender's original snapshot.
function shuffledSlots() {
  const order = MATCH.slots.map((_, i) => i);
  do {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  } while (order.some((slot, i) => slot === i));
  return order;
}

function renderMatch() {
  if (!taskGuard("match")) return;
  if (!S.matchOrder) {
    S.matchOrder = shuffledSlots();
    save();
  }
  const clues = S.matchSubmitted ? S.matchClue || 0 : 0;
  const total = MATCH.slots.length;
  const isRight = (i) => S.matched[i] && ICONS[S.matched[i]].type === MATCH.slots[i].type;
  const right = MATCH.slots.filter((_, i) => isRight(i)).length;
  const placed = Object.values(S.matched);
  const tray = S.icons.filter((id) => !placed.includes(id));
  const iconButton = (id) => `<button class="match-icon ${matchPick === id ? "on" : ""}" data-icon="${id}" aria-label="${ICONS[id].name}">${ICONS[id].emoji}</button>`;
  shell("主線任務", TASKS.match.title, `
    <div class="q-row"><p class="q-text">${MATCH.intro}</p>${clueButton("matchclue", clues >= 2)}</div>
    <p class="progress" role="status">已放 ${placed.length} / ${total}</p>
    ${clues >= 1 ? clueLine(`答對 ${right} / ${total}`) : ""}
    ${matchEarlyClue && !S.matchSubmitted ? clueLine(S.icons.length < total ? MATCH.missing : MATCH.notSubmitted) : ""}
    <div class="match-grid">
      ${S.matchOrder.map((i) => `
        <div class="match-slot ${S.matched[i] ? "filled" : ""} ${clues >= 2 && S.matched[i] && !isRight(i) ? "bad" : ""}" data-slot="${i}" role="button" tabindex="0" aria-label="${MATCH.slots[i].alt}">
          <img src="${MATCH.slots[i].img}" alt="" draggable="false">
          ${S.matched[i] ? iconButton(S.matched[i]) : ""}
        </div>`).join("")}
    </div>
    <div class="match-tray" id="matchtray" aria-label="郵便箱裡的三牲">
      ${tray.map(iconButton).join("")}
      ${tray.length || S.icons.length < total ? "" : `<p class="small">放回這裡可以重新選擇。</p>`}
    </div>
    <button class="btn" id="matchsubmit" ${placed.length < total ? "disabled" : ""}>送出</button>
    <p class="err" id="err" role="alert"></p>
    ${S.icons.includes(FISH_BLANK.icon) ? "" : `<a class="btn alt" href="#search">前往查詢專區，收集 🐟</a>`}`);
  // Redraws in place: render() would jump back to the top of the page on every move.
  const redraw = () => {
    save();
    renderMatch();
    renderBag(false);
  };
  const slotOf = (id) => Object.keys(S.matched).find((i) => S.matched[i] === id);
  const toTray = (id) => {
    delete S.matched[slotOf(id)];
    matchPick = null;
    redraw();
  };
  // A slot holds one icon: whatever was there goes back to the tray.
  const place = (id, i) => {
    if (slotOf(id) !== undefined) delete S.matched[slotOf(id)];
    S.matched[i] = id;
    matchPick = null;
    redraw();
  };
  document.getElementById("matchclue").onclick = () => {
    if (S.matchSubmitted) S.matchClue = clues + 1;
    else matchEarlyClue = true;
    redraw();
  };
  document.getElementById("matchsubmit").onclick = () => {
    if (right === total) return finishTask("match");
    if (!S.matchSubmitted) {
      S.matchSubmitted = true;
      redraw();
    }
    document.getElementById("err").textContent = MATCH.wrong;
  };
  document.getElementById("matchtray").onclick = () => {
    if (matchPick && slotOf(matchPick) !== undefined) toTray(matchPick);
  };
  app.querySelectorAll("[data-slot]").forEach((slot) => {
    slot.onclick = () => {
      if (matchPick) place(matchPick, slot.dataset.slot);
    };
    slot.onkeydown = (e) => {
      if (e.key === "Enter" && e.target === slot) slot.click();
    };
  });
  app.querySelectorAll("[data-icon]").forEach((b) => {
    let from = null, dragged = false;
    b.onpointerdown = (e) => {
      b.setPointerCapture(e.pointerId);
      from = [e.clientX, e.clientY];
      dragged = false;
    };
    b.onpointermove = (e) => {
      if (!from) return;
      if (Math.hypot(e.clientX - from[0], e.clientY - from[1]) > 8) dragged = true;
      if (dragged) b.style.transform = `translate(${e.clientX - from[0]}px, ${e.clientY - from[1]}px)`;
    };
    b.onpointercancel = () => {
      from = null;
      b.style.transform = "";
    };
    b.onpointerup = (e) => {
      from = null;
      if (!dragged) return;
      b.style.visibility = "hidden";
      const under = document.elementFromPoint(e.clientX, e.clientY);
      b.style.visibility = "";
      b.style.transform = "";
      const slot = under && under.closest("[data-slot]");
      if (slot) place(b.dataset.icon, slot.dataset.slot);
      else if (under && under.closest("#matchtray") && slotOf(b.dataset.icon) !== undefined) toTray(b.dataset.icon);
    };
    // A tap selects the icon, wherever it is; tapping a slot or the tray then moves it.
    b.onclick = (e) => {
      e.stopPropagation();
      if (dragged) return;
      if (matchPick && matchPick !== b.dataset.icon) {
        const slot = b.closest("[data-slot]");
        if (slot) return place(matchPick, slot.dataset.slot);
      }
      matchPick = matchPick === b.dataset.icon ? null : b.dataset.icon;
      renderMatch();
    };
  });
}

// Draws one card as a PNG. Pictures only work once the site is online: browsers block reading local files into a canvas.
async function downloadCard(card) {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 840;
  const g = c.getContext("2d");
  g.fillStyle = "#fffdf6";
  g.fillRect(0, 0, 600, 840);
  g.strokeStyle = "#038c00";
  g.lineWidth = 10;
  g.strokeRect(20, 20, 560, 800);
  g.textAlign = "center";
  g.fillStyle = "#038c00";
  g.font = '900 44px "Noto Sans TC", sans-serif';
  g.fillText(card.title, 300, 100);
  const src = card.anim === "peach" && cardPeach ? cardPeach.snapshot() : card.img;
  if (src) {
    const img = new Image();
    img.src = src;
    await img.decode();
    const h = Math.min(420, (500 * img.height) / img.width);
    g.drawImage(img, 300 - (h * img.width) / img.height / 2, 130, (h * img.width) / img.height, h);
    if (card.anim === "peach") {
      // The caption is drawn over the 3D view on the page, so add it to the picture too.
      g.font = '900 36px "Noto Sans TC", sans-serif';
      const capW = g.measureText(PEACH.caption).width + 24, capY = 130 + h * 0.45;
      g.fillStyle = "#fff";
      g.fillRect(300 - capW / 2, capY - 26, capW, 52);
      g.fillStyle = "#111";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(PEACH.caption, 300, capY + 2);
      g.textBaseline = "alphabetic";
    }
  }
  g.fillStyle = "#434343";
  g.font = '28px "Noto Sans TC", sans-serif';
  let line = "", y = 610;
  for (const ch of card.text) {
    if (g.measureText(line + ch).width > 500) {
      g.fillText(line, 300, y);
      line = "";
      y += 42;
    }
    line += ch;
  }
  g.fillText(line, 300, y);
  g.font = '20px "Noto Sans TC", sans-serif';
  g.fillStyle = "#707070";
  g.fillText("室友郵政 Roommate Post", 300, 790);
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = `${card.title}.png`;
  a.click();
}

function renderDownload() {
  const count = CARDS.filter((c) => cardUnlocked(c.key)).length;
  const items = CARDS.map((c, i) => {
    if (!cardUnlocked(c.key)) {
      return `<li class="pcard locked">
        <div class="gw-q" aria-hidden="true">????</div>
        <b class="gw-who">我是誰</b>
        <div class="gw-frame"><i></i><i></i><i></i><i></i>${c.shadow ? `<img src="${c.shadow}" alt="">` : `<span>${c.emoji}</span>`}</div>
        <small>解鎖條件：${c.unlock}</small></li>`;
    }
    if (c.key === "meme") {
      return `<li class="pcard wide">${memeEnding("dlfront")}<b>${c.title}</b><small>${c.text.replace(/\n/g, "<br>")}</small>
        <button class="btn" data-video="full">${STUDENT_CARD.meme.videoFull}</button>
        <button class="btn alt" data-video="ending">${STUDENT_CARD.meme.videoEnding}</button>
        <p class="err" id="videomsg" role="status"></p></li>`;
    }
    if (c.anim === "sansheng") {
      const sc = SANSHENG_CARD;
      return `<li class="pcard wide"><div class="ss-card">
          <img src="${sc.bg}" alt="普渡供桌，擺滿零食和供品">
          ${sc.lines.map((t, n) => `<b class="ss-line" style="top:${11 + n * 16}%;animation-delay:${0.4 + n * 1}s">${t}</b>`).join("")}
          ${sc.items.map(([src, x, y, w], n) => `<img class="ss-item" src="${src}" alt="" style="left:${x}%;top:${y}%;width:${w}%;animation-delay:${3.2 + n * 0.25}s">`).join("")}
        </div><b>${c.title}</b><small>${c.text}</small>
        <button class="btn" data-i="${i}">下載卡片</button></li>`;
    }
    if (c.anim === "gyoza") {
      const { ring } = GYOZA_CARD, tall = 1685 / 900;
      return `<li class="pcard wide"><div class="meme-end-pic gz-card">
          <img src="${c.img}" alt="8包煎餃拼到底看板與街頭拜票照，人臉都以手繪頭像遮住">
          ${Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            return `<span class="fry-slot gyoza ready gz-dumpling" style="left:${ring.x + ring.r * Math.cos(a)}%;top:${ring.y + (ring.r * Math.sin(a)) / tall}%;animation-delay:${0.4 + i * 0.22}s"><svg viewBox="0 0 64 46" aria-hidden="true">${FRY_ART.gyoza}</svg></span>`;
          }).join("")}
        </div><b>${c.title}</b><small>${c.text}</small>
        <button class="btn" data-i="${i}">下載卡片</button></li>`;
    }
    if (c.anim === "peach") {
      return `<li class="pcard wide"><div class="stage3d card-stage" id="cardpeach"><span class="card-fallback">🍑</span></div><b>${c.title}</b><small>${c.text}</small>
        <button class="btn" data-i="${i}">下載卡片</button></li>`;
    }
    const pic = c.img ? `<img src="${c.img}" alt="">` : "";
    return `<li class="pcard"><div class="face">${pic || c.emoji || "✉"}</div><b>${c.title}</b><small>${c.text}</small>
      <button class="btn" data-i="${i}">下載卡片</button></li>`;
  }).join("");
  shell("支線任務", "下載專區", `
    <p class="notice">已解鎖 ${count} / ${CARDS.length} 張。完成任務就能解鎖新卡片。</p>
    <ul class="pcards">${items}</ul>`);
  app.querySelectorAll("[data-i]").forEach((b) => {
    b.onclick = () => downloadCard(CARDS[+b.dataset.i]);
  });
  if (document.getElementById("dlfront")) paintCardFront(document.getElementById("dlfront"));
  const peachEl = document.getElementById("cardpeach");
  if (peachEl) {
    loadThree().then(() => {
      if (!peachEl.isConnected) return;
      const view3d = startPeach3D(peachEl, {
        stage: "done", snapshot: true, saved: {}, tool: () => null,
        say() {}, pct() {}, saveCut() {}, onStage() {}, onOpened() {},
      });
      peachEl.querySelector(".card-fallback").remove();
      cardPeach = view3d;
      view3d.replay();
      clearInterval(cardTimer);
      cardTimer = setInterval(() => (peachEl.isConnected ? view3d.replay() : clearInterval(cardTimer)), 5000);
    }).catch(() => {});
  }
  const videoButtons = [...app.querySelectorAll("[data-video]")];
  videoButtons.forEach((b) => {
    b.onclick = async () => {
      const m = STUDENT_CARD.meme, msg = document.getElementById("videomsg"), full = b.dataset.video === "full";
      videoButtons.forEach((x) => (x.disabled = true));
      try {
        const { blob, ext } = await recordMeme(full, (done) => (msg.textContent = `${m.videoBusy} ${Math.round(done * 100)}%`));
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `炫炮學生證-${full ? "完整" : "結尾"}.${ext}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
        msg.textContent = "";
      } catch {
        msg.textContent = m.videoFail;
      }
      videoButtons.forEach((x) => (x.disabled = false));
    };
  });
}

function chatReply(text) {
  const t = norm(text);
  if (CHAT.hintWords.some((w) => t.includes(norm(w)))) {
    if (!S.chatHint) record("【卡片解鎖】" + CARDS.find((c) => c.key === "chat").title, `已向${CHAT.name}詢問提示。`);
    S.chatHint = true;
    if (!openTasks().length) return CHAT.allDone;
    if (!S.current) return CHAT.noTask;
    return CHAT.taskHints[S.current];
  }
  const match = CHAT.replies.find((r) => r.words.some((w) => t.includes(norm(w))));
  return match ? match.text : CHAT.fallback;
}

async function saveProgress() {
  const file = new File([JSON.stringify(S)], "室友郵政進度.txt", { type: "text/plain" });
  // On phones the share sheet lists Google Drive. Elsewhere it downloads as a normal file.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "室友郵政進度" }).catch(() => {});
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const senderHour = () => (Date.now() / 3600000 + 8) % 24; // Taiwan time
function senderOnline() {
  if (location.search.includes("offline")) return false;
  const [from, to] = CHAT.onlineHours;
  return senderHour() >= from && senderHour() < to;
}

function chatPanel() {
  const log = [{ text: CHAT.greeting }, ...S.chat];
  return `
    <div class="chat">
      <div class="chathead">${CHAT.name}</div>
      <div class="log" id="log" role="log">${log.map((m) => `<p class="${m.me ? "me" : "them"}">${esc(m.text).replace("[?]", `<button type="button" class="clue-q chat-q" data-chatq aria-label="我要提示">?</button>`)}</p>`).join("")}</div>
      <div class="chips">${CHAT.chips.map((c) => `<button type="button">${c}</button>`).join("")}</div>
      <form id="say"><label for="msg">訊息</label><input id="msg" autocomplete="off"><button>傳送</button></form>
    </div>`;
}

function queuePanel() {
  const [from, to] = CHAT.onlineHours;
  const waited = ((senderHour() - to + 24) % 24) / (24 - (to - from));
  const pct = Math.round(Math.min(Math.max(waited, 0.1), 0.95) * 100);
  const hhmm = (h) => `${String(h).padStart(2, "0")}:00`;
  return `
    <div class="queue">
      <div class="q-notice"><span>公告</span><p>客服下班期間進入之用戶，系統將依<b>隨機取號</b>方式分配號碼，並依號碼順序安排對話。請保持此頁面開啟，無須重新整理。</p></div>
      <div class="q-card">
        <div class="q-logo"><span class="emblem">室</span><b>室友郵政</b></div>
        <h3>當前您正在排隊等候中</h3>
        <p class="q-why">您正在 ${CHAT.name} 排隊等候。當輪到您時，您有 10 分鐘進入對話，若超過時效未進入須重新排隊取號。</p>
        <details><summary>這是什麼？</summary><p>${CHAT.name}下班了。服務時間為每天 ${hhmm(from)}–${hhmm(to)}（台灣時間）。</p></details>
        <div class="q-track"><div class="q-pill"><div class="q-bar" style="width:${pct}%"><i class="q-person"></i></div></div></div>
        <div class="q-status">
          <p>隊列已暫停</p>
          <p class="q-time"><i class="q-dot"></i>最近更新狀態：<span id="qclock">${new Date().toLocaleTimeString("zh-TW")}</span></p>
        </div>
        <p class="q-id"><b>隊列 ID：</b>${S.queueId}</p>
      </div>
    </div>`;
}

function renderMobile() {
  clearInterval(timer);
  const online = senderOnline();
  shell("支線任務", "行動郵局", `
    ${online ? chatPanel() : queuePanel()}
    <h3 class="group">儲存進度</h3>
    <p class="small">把目前進度存成一個檔案。手機上可從分享選單選擇 Google 雲端硬碟；換裝置時再讀取這個檔案。</p>
    <button class="btn" id="saveit">儲存進度檔</button>
    <label class="btn alt upload">讀取進度檔<input id="loadit" type="file" accept=".txt,text/plain" hidden></label>
    <p class="err" id="err" role="alert"></p>
    <button class="reset" id="reset">清除紀錄，從頭開始</button>`);
  // The queue opens by itself when the online hours start, as the notice promises.
  timer = setInterval(() => {
    if (senderOnline() !== online) return render();
    const clock = document.getElementById("qclock");
    if (clock) clock.textContent = new Date().toLocaleTimeString("zh-TW");
  }, 30000);
  if (online) {
    const logEl = document.getElementById("log");
    logEl.scrollTop = logEl.scrollHeight;
    const send = (text) => {
      if (!text.trim()) return;
      S.chat.push({ me: true, text }, { text: chatReply(text) });
      save();
      renderMobile();
      window.scrollTo(0, document.querySelector(".chat").offsetTop);
    };
    app.querySelectorAll(".chips button").forEach((b) => {
      b.onclick = () => send(b.textContent);
    });
    app.querySelector("[data-chatq]").onclick = () => send(CHAT.chips[0]);
    document.getElementById("say").onsubmit = (e) => {
      e.preventDefault();
      send(document.getElementById("msg").value);
    };
  }
  document.getElementById("saveit").onclick = saveProgress;
  document.getElementById("loadit").onchange = async (e) => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (!data.parts || !Array.isArray(data.chat)) throw new Error("not a progress file");
      Object.assign(S, data);
      save();
      location.hash = "";
    } catch {
      document.getElementById("err").textContent = "這不是室友郵政的進度檔。";
    }
  };
  document.getElementById("reset").onclick = restart;
}

function cardQuestion(id) {
  const c = S.card, q = STUDENT_CARD.questions[id];
  if (!c.open.includes(id)) return "";
  const ans = c.answers[id], right = ans === q.answer;
  const shown = c.hints[id] || 0;
  const roc = new Date().getFullYear() - 1911, month = new Date().getMonth() + 1, day = new Date().getDate();
  const form = `
    <form id="cardform" class="cardform" data-q="${id}">
      <p class="progress">${STUDENT_CARD.right}</p>
      <fieldset><legend>學制</legend>
        <label><input type="radio" name="level" value="ba" checked> 學士班</label>
        <label><input type="radio" name="level" value="grad"> 碩．博班</label>
      </fieldset>
      <label>${STUDENT_CARD.photoLabel}<input type="file" name="photo" accept="image/*"></label>
      <label>系／研究所<input name="dept" required autocomplete="off"></label>
      <label>組（可不填）<input name="group" autocomplete="off"></label>
      <label>學號<input name="id" required autocomplete="off"></label>
      <label>手機號碼<input name="phone" required inputmode="tel" autocomplete="off"></label>
      <label>姓名<input name="name" required autocomplete="off"></label>
      <fieldset class="ymd"><legend>申請日期</legend>
        <label>年<input name="y" required inputmode="numeric" value="${roc}"></label>
        <label>月<input name="m" required inputmode="numeric" value="${month}"></label>
        <label>日<input name="d" required inputmode="numeric" value="${day}"></label>
      </fieldset>
      <fieldset><legend>申請原因</legend>
        ${STUDENT_CARD.reasons.map((r, i) => `<label><input type="radio" name="reason" value="${i}" ${i ? "" : "checked"}> ${r}</label>`).join("")}
      </fieldset>
      <p class="small">${STUDENT_CARD.privacy}</p>
      <button>送出申請</button>
    </form>`;
  return `
    <div class="card-q" id="cq-${id}">
      <div class="q-row"><b>${q.text}</b>${ans ? "" : clueButton(`ch-${id}`, shown >= STUDENT_CARD.hints.length)}</div>
      ${ans ? `<p class="small">你的回答：${ans === "yes" ? "是" : "否"}</p>` : `
        <div class="yn"><button data-yn="yes" data-q="${id}">是</button><button data-yn="no" data-q="${id}">否</button></div>
        ${clueList(`ch-${id}`, STUDENT_CARD.hints, shown)}`}
      ${ans && !right ? `<p class="err">${STUDENT_CARD.wrong}</p>` : ""}
      ${ans && !right && !q.next ? `<p>${STUDENT_CARD.failed}</p><button class="btn alt" id="cardrestart">${STUDENT_CARD.restart}</button>` : ""}
      ${right && !c.won ? form : ""}
    </div>`;
}

// Where each answer goes on the scanned form, in % of the image.
const FORM_AT = {
  dept: [17, 13.6], group: [36, 13.6], grad: [65, 13.6], id: [17.5, 18.3], phone: [65, 18.3], name: [17.5, 24.1],
  y: [68, 24.1], m: [79.5, 24.1], d: [90, 24.1], baBox: 5.6, gradBox: 52.4, reasonBox: 17.3, newCardBox: 25.4, reasonOf: [30.3, 34.9, 39.6, 44.3],
};
const STAMP_X = [13.7, 33.3, 53.6, 72.7, 89.3];

function loadImage(src) {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

// Crops an upload to the card's photo box. A file that can't be read just leaves the box empty.
async function readPhoto(file) {
  if (!file || !file.size) return null;
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  URL.revokeObjectURL(url);
  if (!img) return null;
  const [, , bw, bh] = STUDENT_CARD.frontBoxes.photo;
  const c = document.createElement("canvas");
  c.width = bw * 2;
  c.height = bh * 2;
  const scale = Math.max(c.width / img.width, c.height / img.height);
  const w = img.width * scale, h = img.height * scale;
  c.getContext("2d").drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
  return c.toDataURL("image/jpeg", 0.8);
}

// The card front with her photo, name, student number and major in the white boxes.
async function paintCardFront(canvas) {
  const sc = STUDENT_CARD, a = S.card.app, box = sc.frontBoxes;
  const front = await loadImage(sc.front);
  if (!front) return;
  canvas.width = front.width;
  canvas.height = front.height;
  const g = canvas.getContext("2d");
  g.drawImage(front, 0, 0);
  const photo = a.photo && (await loadImage(a.photo));
  if (photo) g.drawImage(photo, ...box.photo);
  g.fillStyle = "#111";
  g.textAlign = "center";
  g.textBaseline = "middle";
  [["name", a.name], ["id", a.id], ["dept", a.dept]].forEach(([key, text]) => {
    const [x, y, w, h] = box[key];
    let size = h * 0.62;
    do {
      g.font = `700 ${size}px "Noto Sans TC", sans-serif`;
      size -= 1;
    } while (g.measureText(text).width > w - 8 && size > 8);
    g.fillText(text, x + w / 2, y + h / 2 + 1);
  });
}

// Everything written on the form: x %, y %, text, is it a tick.
function appFields() {
  const a = S.card.app, reason = +a.reason, grad = a.level === "grad", y = FORM_AT.dept[1];
  const rows = [
    [grad ? FORM_AT.gradBox : FORM_AT.baBox, y, "✓", true],
    [grad ? FORM_AT.grad[0] : FORM_AT.dept[0], y, a.dept],
    [...FORM_AT.id, a.id], [...FORM_AT.phone, a.phone], [...FORM_AT.name, a.name],
    [...FORM_AT.y, a.y], [...FORM_AT.m, a.m], [...FORM_AT.d, a.d],
    [FORM_AT.reasonBox, FORM_AT.reasonOf[reason], "✓", true],
  ];
  if (!grad && a.group) rows.push([...FORM_AT.group, a.group]);
  if (reason < 2) rows.push([FORM_AT.newCardBox, FORM_AT.reasonOf[reason], "✓", true]);
  return rows;
}

function appSheet() {
  const sc = STUDENT_CARD;
  return `
    <div class="app-sheet">
      <img src="${sc.formImg}" alt="已填寫並蓋章的學生證掛失補換發申請單">
      ${appFields().map(([x, y, t, tick]) => `<span class="${tick ? "tick" : ""}" style="left:${x}%;top:${y}%">${esc(t)}</span>`).join("")}
      ${STAMP_X.map((x, i) => `<i class="app-stamp" style="left:${x}%;animation-delay:${i * 0.25}s">${sc.stamp.join("<br>")}</i>`).join("")}
    </div>`;
}

// The cat with the spinning 3D card. The card front still needs paintCardFront on the canvas with this id.
function memeEnding(frontId) {
  const sc = STUDENT_CARD;
  return `
    <div class="meme-end-pic">
      <img src="${sc.meme.ending}" alt="一隻貓舉著學生證衝向你，背景是漫畫集中線">
      <b class="meme-text">${sc.meme.endText}</b>
      <div class="card3d-wrap"><div class="card3d">
        ${[-1.5, -0.75, 0, 0.75, 1.5].map((z) => `<i style="transform:translateZ(${z}px)"></i>`).join("")}
        <canvas class="c3-face" id="${frontId}"></canvas>
        <img class="c3-face c3-back" src="${sc.backs[S.card.won].img}" alt="">
      </div></div>
    </div>`;
}

function renderStudentId() {
  const c = S.card;
  if (!c.won) return (location.hash = "ntpu");
  const sc = STUDENT_CARD;
  shell("各地郵局", "學生證補辦完成", `
    <p class="notice">申請已核准，可於郵便箱隨時查看學生證。</p>
    ${appSheet()}
    <h3 class="group">你的學生證</h3>
    ${memeEnding("idfront")}
    <button class="btn alt" id="memereplay">${sc.meme.replay}</button>
    <a class="btn alt" href="#ntpu">回北大郵局</a>`);
  paintCardFront(document.getElementById("idfront"));
  document.getElementById("memereplay").onclick = playMeme;
  if (!c.memeSeen) playMeme();
}

// Green screen to transparent, on a canvas: Safari can't play transparent video.
function keyGreen(video, canvas) {
  const g = canvas.getContext("2d", { willReadFrequently: true });
  g.drawImage(video, 0, 0, canvas.width, canvas.height);
  const frame = g.getImageData(0, 0, canvas.width, canvas.height), d = frame.data;
  for (let i = 0; i < d.length; i += 4) {
    const other = Math.max(d[i], d[i + 2]), gap = d[i + 1] - other;
    if (gap > 0) {
      d[i + 3] = gap > 30 ? 0 : gap < 6 ? 255 : 255 * (1 - (gap - 6) / 24);
      d[i + 1] = other; // removes the green glow along the fur
    }
  }
  g.putImageData(frame, 0, 0);
}

function memeSteps() {
  const c = S.card, sc = STUDENT_CARD, m = sc.meme;
  const picked = Object.keys(sc.backs).find((k) => sc.backs[k].first === c.open[0]);
  const answered = c.open.filter((id) => c.answers[id]);
  const steps = [
    ...m.opening.map((beat) => ({ who: "right", ...beat })),
    { who: "left", text: m.answers[picked], cards: [picked] },
    ...m.intro.map((line) => ({ who: "right", cards: [], ...line })),
  ];
  answered.forEach((id, n) => {
    const q = sc.questions[id], ans = c.answers[id], after = q.after && q.after[ans];
    steps.push({ who: "right", text: q.talk, cards: [] });
    q.said[ans].forEach((text) => steps.push({ who: "left", text, cards: [] }));
    if (q.fight && q.fight[ans]) q.fight[ans].forEach((text) => steps.push({ who: "right", clip: "fight", text, cards: [], ms: 1800 }));
    if (after) steps.push({ who: "right", text: after, cards: [] });
    // Wrong gets 蛤; a reaction to a right answer stays on screen while the cat changes.
    if (ans !== q.answer) steps.push({ who: "right", clip: "what", text: m.wrong[n], cards: [], ms: 1700 });
    else if (after) steps.push({ who: "right", clip: "what", text: after, cards: [], ms: 1700 });
  });
  // She only reaches this sequence by getting the last question right.
  steps.push({ who: "right", text: m.praise[answered.length - 1], cards: [] });
  return steps;
}
const memeStepMs = (step) => step.ms || Math.min(4200, 1400 + step.text.length * 110);
const MEME_APP_MS = 3200, MEME_END_MS = 5000;

let memeTimer;
function playMeme() {
  clearTimeout(memeTimer);
  const c = S.card, sc = STUDENT_CARD, m = sc.meme;
  const steps = memeSteps();

  const overlay = document.createElement("div");
  overlay.className = "meme talking";
  overlay.id = "meme";
  overlay.innerHTML = `
    <button class="meme-skip" id="memeskip">${m.skip}</button>
    <div class="meme-talk" id="memetalk" style="background-image:url(${m.background})">
      <div class="meme-bubble" id="memebubble" role="status"></div>
      <div class="meme-cards" id="memecards"></div>
      <canvas class="meme-cat left" data-who="left" width="270" height="360"></canvas>
      <canvas class="meme-cat right" data-who="right" width="270" height="360"></canvas>
      <canvas class="meme-cat right" data-who="what" width="270" height="360" hidden></canvas>
      <canvas class="meme-cat fight" data-who="fight" width="360" height="360" hidden></canvas>
    </div>`;
  app.append(overlay);

  const cats = {};
  overlay.querySelectorAll(".meme-cat").forEach((canvas) => {
    const v = document.createElement("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = m[canvas.dataset.who];
    v.addEventListener("loadeddata", () => keyGreen(v, canvas), { once: true });
    v.addEventListener("seeked", () => keyGreen(v, canvas));
    cats[canvas.dataset.who] = { v, canvas, last: -1 };
  });
  const paintCats = () => {
    if (!document.getElementById("memetalk")) return;
    Object.values(cats).forEach((cat) => {
      if (!cat.v.paused && cat.v.currentTime !== cat.last) {
        cat.last = cat.v.currentTime;
        keyGreen(cat.v, cat.canvas);
      }
    });
    requestAnimationFrame(paintCats);
  };
  requestAnimationFrame(paintCats);

  const finish = () => {
    clearTimeout(memeTimer);
    overlay.remove();
    if (!c.memeSeen) {
      c.memeSeen = true;
      record("【物品領取】學生證", "補辦申請已核准，學生證已收進郵便箱。");
    }
    window.scrollTo(0, 0);
  };
  document.getElementById("memeskip").onclick = finish;

  const showEnding = () => {
    overlay.querySelector(".meme-app").remove();
    overlay.insertAdjacentHTML("beforeend", `
      <div class="meme-end">
        ${memeEnding("card3dfront")}
        <button class="btn" id="memeclaim">${m.claim}</button>
      </div>`);
    paintCardFront(document.getElementById("card3dfront"));
    document.getElementById("memeclaim").onclick = finish;
    document.getElementById("memeskip").hidden = true;
  };
  const showApplication = () => {
    document.getElementById("memetalk").remove();
    overlay.classList.remove("talking");
    Object.values(cats).forEach((cat) => cat.v.pause());
    overlay.insertAdjacentHTML("beforeend", `<div class="meme-app">${appSheet()}</div>`);
    memeTimer = setTimeout(showEnding, MEME_APP_MS);
  };
  let i = 0;
  const next = () => {
    if (i === steps.length) return showApplication();
    const step = steps[i++];
    const bubble = document.getElementById("memebubble");
    bubble.textContent = step.text;
    bubble.className = `meme-bubble from-${step.who}`;
    document.getElementById("memecards").className = `meme-cards from-${step.who}`;
    document.getElementById("memecards").innerHTML = step.cards.map((k) => `<img src="${sc.backs[k].img}" alt="學生證${sc.backs[k].name}">`).join("");
    const active = step.clip || step.who;
    Object.entries(cats).forEach(([who, cat]) => {
      if (who === active) {
        if (cat.v.paused && step.clip) cat.v.currentTime = 0; // starts from the top, stays running across its lines
        cat.v.play().catch(() => {});
      } else {
        cat.v.pause();
      }
    });
    // The left cat stays put; the right side shows one of its three clips.
    const rightSide = step.clip || "right";
    ["right", "what", "fight"].forEach((who) => (cats[who].canvas.hidden = who !== rightSide));
    memeTimer = setTimeout(next, memeStepMs(step));
  };
  next();
}

function renderDormVote() {
  if (S.dormNamed) return (location.hash = "ntpu");
  const v = DORM_VOTE;
  shell("各地郵局", v.title, `
    <div class="elearn">
      <div class="el-head"><b>${v.site}</b></div>
      <div class="el-grid">
        <aside>
          <div class="q-row el-top"><p class="el-denied" id="voteempty"></p>${clueButton("voteclue", (S.dormClue || 0) >= v.hints.length)}</div>
          ${clueList("voteclue", v.hints, S.dormClue || 0)}
          ${v.logins.map((l) => `
            <form class="el-login" data-login="${l.key}">
              <h3>${v.heading}</h3>
              ${S.dormLogin[l.key] ? `<p class="el-ok">✓ ${l.label}：${v.ok}</p>` : `
                <div class="el-row"><label for="name-${l.key}">${v.nameLabel}</label><input id="name-${l.key}" value="${l.label}" readonly></div>
                <div class="el-row"><label for="vote-${l.key}">${v.votesLabel}</label>
                  <span class="el-num"><input id="vote-${l.key}" type="number" min="0" max="999" step="1" value="0" inputmode="numeric" autocomplete="off"><span class="el-spin"><button type="button" data-step="1" aria-label="增加票數">▲</button><button type="button" data-step="-1" aria-label="減少票數">▼</button></span></span>
                </div>
                <p class="el-denied" role="alert"></p>
                <button>${v.submit}</button>`}
            </form>`).join("")}
        </aside>
        <div class="el-main">
          <p class="el-path">位置：<span>${v.title}</span> &gt; <b>社群資訊</b></p>
          <table>
            <tr><th>項目</th><th>內容</th></tr>
            ${v.table.map(([k, t]) => `<tr><th scope="row">${k}</th><td>${t}</td></tr>`).join("")}
            <tr><th scope="row">社群描述</th><td>${v.description.map((t) => `<p>${t}</p>`).join("")}</td></tr>
          </table>
        </div>
      </div>
    </div>`);
  mountClue("voteclue", v.hints, S.dormClue || 0, (shown) => {
    S.dormClue = shown;
    save();
  });
  const voteInputs = [...app.querySelectorAll(".el-num input")];
  const allZero = () => voteInputs.length === v.logins.length && voteInputs.every((i) => !+i.value);
  const showEmpty = () => {
    document.getElementById("voteempty").textContent = allZero() ? v.denied : "";
    app.querySelectorAll(".el-login .el-denied").forEach((e) => (e.textContent = "")); // an old 權限不足 no longer applies
  };
  showEmpty();
  voteInputs.forEach((i) => (i.oninput = showEmpty));
  app.querySelectorAll("[data-step]").forEach((b) => {
    b.onclick = () => {
      const input = b.closest(".el-num").querySelector("input");
      input.value = Math.min(999, Math.max(0, +input.value + +b.dataset.step));
      showEmpty();
    };
  });
  app.querySelectorAll("[data-login]").forEach((f) => {
    f.onsubmit = (e) => {
      e.preventDefault();
      const login = v.logins.find((l) => l.key === f.dataset.login);
      if (+f.querySelector("[type=number]").value !== login.votes) {
        f.querySelector(".el-denied").textContent = allZero() ? "" : v.wrong;
        return;
      }
      S.dormLogin[login.key] = true;
      save();
      if (!v.logins.every((l) => S.dormLogin[l.key])) return renderDormVote();
      S.dormNamed = true;
      record("【任務完成】不具名的宿舍", `新宿舍樓已命名為${OFFICES.ntpu.dormName}。`);
      scrollAfterRender = "newsdorm";
      location.hash = "ntpu";
    };
  });
}

// Draws the sequence on a canvas and records it in real time, so a 30-second animation takes 30 seconds to make.
async function recordMeme(full, onProgress) {
  const c = S.card, sc = STUDENT_CARD, m = sc.meme, W = 566, H = 800;
  const mime = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  const canvas = document.createElement("canvas");
  if (!mime || !canvas.captureStream) throw new Error("no recorder");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  const [bg, form, pic, backOld, backNew] = await Promise.all([m.background, sc.formImg, m.ending, sc.backs.old.img, sc.backs.new.img].map(loadImage));
  const backs = { old: backOld, new: backNew };
  const front = document.createElement("canvas");
  await paintCardFront(front);
  const steps = full ? memeSteps() : [];

  const cats = {};
  if (full) {
    await Promise.all([["left", 270], ["right", 270], ["what", 270], ["fight", 360]].map(([who, cw]) => new Promise((ok) => {
      const v = document.createElement("video");
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.src = m[who];
      const layer = document.createElement("canvas");
      layer.width = cw;
      layer.height = 360;
      cats[who] = { v, layer };
      // A video that hasn't played has no picture to copy yet, so run each one briefly.
      const ready = async () => {
        await v.play().catch(() => {});
        await new Promise((wait) => setTimeout(wait, 200));
        v.pause();
        keyGreen(v, layer);
        ok();
      };
      v.addEventListener("loadeddata", ready, { once: true });
      v.addEventListener("error", ok, { once: true });
      setTimeout(ok, 8000);
    })));
  }
  const drawCat = (who, x, y, w) => {
    const { layer } = cats[who];
    g.drawImage(layer, W * x, H * y, W * w, (W * w * layer.height) / layer.width);
  };
  const wrap = (text, maxWidth) => text.split("\n").flatMap((line) => {
    const out = [""];
    for (const ch of line) {
      if (g.measureText(out[out.length - 1] + ch).width > maxWidth) out.push("");
      out[out.length - 1] += ch;
    }
    return out;
  });
  const drawTalk = (step) => {
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    const bh = (W * bg.height) / bg.width;
    g.drawImage(bg, 0, (H - bh) / 2, W, bh);
    const fromLeft = step.who === "left", cardW = W * (1 - 0.234 - 0.285) * 0.49;
    step.cards.forEach((k, i) => {
      const img = backs[k];
      g.drawImage(img, W * (fromLeft ? 0.237 : 0.234) + i * cardW * 1.03, H * (fromLeft ? 0.515 : 0.286), cardW, (cardW * img.height) / img.width);
    });
    const side = step.clip || "right";
    drawCat("left", -0.073, 0.555, 0.31);
    if (side === "fight") drawCat("fight", 0.56, 0.095, 0.43);
    else drawCat(side, 0.677, 0.095, 0.34);
    const size = W * 0.042, lh = size * 1.4;
    g.font = `700 ${size}px "Noto Sans TC", sans-serif`;
    g.textAlign = "left";
    g.textBaseline = "top";
    g.fillStyle = "#fff";
    if (fromLeft) {
      g.shadowColor = "#000";
      g.shadowBlur = W * 0.008;
    }
    const lines = wrap(step.text, W * (fromLeft ? 0.685 : 0.45));
    const top = fromLeft ? H * 0.65 : H * 0.255 - lines.length * lh;
    lines.forEach((line, i) => g.fillText(line, W * (fromLeft ? 0.275 : 0.26), top + i * lh));
    g.shadowBlur = 0;
  };
  const drawApp = (ms) => {
    g.fillStyle = "#e6e6e6";
    g.fillRect(0, 0, W, H);
    const fw = W * 0.94, fh = (fw * form.height) / form.width, fx = (W - fw) / 2, fy = (H - fh) / 2;
    g.fillStyle = "#fff";
    g.fillRect(fx, fy, fw, fh);
    g.drawImage(form, fx, fy, fw, fh);
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillStyle = "#1d3f8f";
    appFields().forEach(([x, y, text, tick]) => {
      g.font = tick ? `900 ${fw * 0.026}px "Noto Sans TC", sans-serif` : `${fw * 0.021}px "Noto Sans TC", sans-serif`;
      g.fillText(text, fx + (fw * x) / 100, fy + (fh * y) / 100);
    });
    const d = fw * 0.1;
    STAMP_X.forEach((x, i) => {
      const p = (ms - i * 250) / 400;
      if (p <= 0) return;
      const k = p >= 1 ? 1 : 3 - 2 * p;
      g.save();
      g.globalAlpha = 0.85 * Math.min(p, 1);
      g.translate(fx + (fw * x) / 100, fy + fh * 0.87);
      g.rotate((-10 * Math.PI) / 180);
      g.scale(k, k);
      g.strokeStyle = g.fillStyle = "#d0402b";
      g.lineWidth = fw * 0.005;
      g.beginPath();
      g.arc(0, 0, d / 2, 0, Math.PI * 2);
      g.stroke();
      g.textAlign = "center";
      g.font = `900 ${fw * 0.023}px "Noto Sans TC", sans-serif`;
      sc.stamp.forEach((line, n) => g.fillText(line, 0, (n - 0.5) * fw * 0.027));
      g.restore();
    });
  };
  const BOOM = [[0, 0.1, -10, 0], [0.6, 1.18, 2, 1], [0.8, 0.96, -1, 1], [1, 1, 0, 1]];
  const drawEnding = (ms) => {
    g.fillStyle = "#e6e6e6";
    g.fillRect(0, 0, W, H);
    const p = Math.min(ms / 700, 1), n = BOOM.findIndex((b) => b[0] >= p), [a, b] = n <= 0 ? [BOOM[0], BOOM[0]] : [BOOM[n - 1], BOOM[n]];
    const f = b[0] === a[0] ? 0 : (p - a[0]) / (b[0] - a[0]), mix = (i) => a[i] + (b[i] - a[i]) * f;
    const w = W * 0.94, h = (w * pic.height) / pic.width;
    g.save();
    g.globalAlpha = mix(3);
    g.translate(W / 2, H / 2);
    g.rotate((mix(2) * Math.PI) / 180);
    g.scale(mix(1), mix(1));
    g.drawImage(pic, -w / 2, -h / 2, w, h);
    g.font = `900 ${w * 0.145}px "Noto Sans TC", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "top";
    g.lineJoin = "round";
    g.lineWidth = w * 0.012;
    g.strokeStyle = "#fff";
    g.fillStyle = "#111";
    g.strokeText(m.endText, 0, -h / 2 + h * 0.015);
    g.fillText(m.endText, 0, -h / 2 + h * 0.015);
    g.translate(w * -0.01, h * 0.06);
    g.rotate((-14 * Math.PI) / 180);
    const cw = w * 0.56, ch = (cw * 409) / 657, turn = Math.cos((ms / MEME_END_MS) * Math.PI * 2), wide = (cw * Math.abs(turn)) / 2;
    g.fillStyle = "#9a9a9a";
    g.fillRect(-wide - 2, -ch / 2, wide * 2 + 4, ch);
    g.drawImage(turn > 0 ? front : backs[c.won], -wide, -ch / 2, wide * 2, ch);
    g.restore();
  };

  const talkMs = steps.reduce((sum, step) => sum + memeStepMs(step), 0);
  const appMs = full ? MEME_APP_MS : 0, total = talkMs + appMs + MEME_END_MS;
  if (full) drawTalk(steps[0]);
  else drawEnding(0);
  const rec = new MediaRecorder(canvas.captureStream(24), { mimeType: mime, videoBitsPerSecond: 2500000 });
  const chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  return new Promise((ok, no) => {
    rec.onerror = no;
    rec.onstop = () => ok({ blob: new Blob(chunks, { type: mime }), ext: mime.includes("mp4") ? "mp4" : "webm" });
    rec.start();
    const started = performance.now();
    let shown = -1;
    const frame = (now) => {
      const t = now - started;
      if (t >= total) {
        Object.values(cats).forEach((cat) => cat.v.pause());
        rec.stop();
        return;
      }
      onProgress(t / total);
      if (t < talkMs) {
        let i = 0, left = t;
        while (left >= memeStepMs(steps[i])) left -= memeStepMs(steps[i++]);
        const step = steps[i], active = step.clip || step.who;
        if (i !== shown) {
          shown = i;
          Object.entries(cats).forEach(([who, cat]) => {
            if (who === active) {
              if (cat.v.paused && step.clip) cat.v.currentTime = 0;
              cat.v.play().catch(() => {});
            } else {
              cat.v.pause();
            }
          });
        }
        if (cats[active].v.readyState >= 2) keyGreen(cats[active].v, cats[active].layer);
        drawTalk(step);
      } else if (t < talkMs + appMs) {
        Object.values(cats).forEach((cat) => cat.v.pause());
        drawApp(t - talkMs);
      } else {
        drawEnding(t - talkMs - appMs);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

function newsShows(when) {
  if (!when) return true;
  const done = when.startsWith("!") ? !NEWS_DONE[when.slice(1)]() : NEWS_DONE[when]();
  return done;
}
const NEWS_DONE = { card: () => !!S.card.won, dorm: () => !!S.dormNamed };

function renderOffice(key) {
  const o = OFFICES[key];
  const fold = (e) => (e.cardQ ? cardQuestion(e.cardQ) : `<details><summary>${e[0]}</summary><p>${e[1]}</p></details>`);
  const dated = ([d, t, id]) => `<li ${id ? `id="${id}"` : ""}><b>${t.replace("___", S.dormNamed ? `<u>${o.dormName}</u>` : "___").replace(/\n/g, "<br>")}</b><span>${d}</span></li>`;
  const taken = (opt) => (opt.tool && S.bag.includes(opt.tool)) || (opt.icon && S.icons.includes(opt.icon)) || (opt.card && S.card.won) || (opt.dorm && S.dormNamed);
  const optionText = (opt) => (taken(opt) ? `✓ ${opt.label}` : opt.label);
  const sections = [["news", "最新消息"], ["services", "常用線上服務"], ["faq", "常見問題"], ["charity", "近期活動"]];
  shell("各地郵局", o.title, `
    <div class="office-top">
      <div class="office-hero ${o.hero ? "photo" : ""}" ${o.hero ? `style="background-image:url(${o.hero})"` : ""}>
        <b>${o.title}</b><i>— ${o.en} —</i><small>${o.caption}</small>
      </div>
      <aside class="office-box"><h3>當地支局</h3><ul>${o.branches.map((b) => `<li>${b}</li>`).join("")}</ul></aside>
    </div>
    <div class="office-grid">
      <nav class="office-menu">${sections.map(([id, t]) => `<button data-go="${id}">${t}<span>›</span></button>`).join("")}</nav>
      <div class="office-main">
        <section id="news" class="office-sec">
          <h3>最新消息</h3>
          <ul class="office-news" data-pane="0">${o.news.filter((n) => newsShows(n[3])).map(dated).join("")}</ul>
        </section>
        <section id="services" class="office-sec">
          <h3 class="plain">常用線上服務</h3>
          <div class="office-services">
            ${o.services.map((sv, i) => `
              <div class="service" data-s="${i}">
                <div class="service-face"><span>${sv.icon}</span><b>${sv.name}</b></div>
                <div class="service-pick">
                  <select aria-label="${sv.name}"><option value="">請選擇</option>${sv.options.map((opt, j) => `<option value="${j}">${optionText(opt)}</option>`).join("")}</select>
                  <button aria-label="查詢${sv.name}">🔍</button>
                </div>
              </div>`).join("")}
          </div>
          <p class="clue" id="found" role="status" hidden></p>
        </section>
        <div class="office-pair">
          <section id="faq" class="office-sec"><h3>常見問題</h3>${o.faq.map(fold).join("")}</section>
          <section id="charity" class="office-sec"><h3>近期活動</h3>${o.charity.map(fold).join("")}</section>
        </div>
      </div>
    </div>`);
  app.querySelectorAll("[data-go]").forEach((b) => {
    b.onclick = () => {
      const target = document.getElementById(b.dataset.go);
      target.scrollIntoView({ behavior: "smooth" });
      target.classList.add("flash");
      setTimeout(() => target.classList.remove("flash"), 1600);
    };
  });
  const found = document.getElementById("found");
  const showQuestion = (id) => {
    renderOffice(key);
    document.getElementById(`cq-${id}`).scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const askCard = () => {
    const open = S.card.open[S.card.open.length - 1];
    if (open) return showQuestion(open);
    found.innerHTML = `<p><b>${STUDENT_CARD.question}</b></p>
      <div class="versus">${Object.entries(STUDENT_CARD.backs).map(([k, b], i) => `<button data-back="${k}" aria-label="第 ${i + 1} 張學生證背面"><img src="${b.img}" alt=""></button>`).join("<em>或</em>")}</div>`;
    found.querySelectorAll("[data-back]").forEach((b) => {
      b.onclick = () => {
        const first = STUDENT_CARD.backs[b.dataset.back].first;
        S.card.open.push(first);
        save();
        showQuestion(first);
      };
    });
  };
  Object.keys(STUDENT_CARD.questions).forEach((id) => {
    if (!document.getElementById(`cq-${id}`) || S.card.answers[id]) return;
    mountClue(`ch-${id}`, STUDENT_CARD.hints, S.card.hints[id] || 0, (shown) => {
      S.card.hints[id] = shown;
      save();
    });
  });
  app.querySelectorAll("[data-yn]").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.q, q = STUDENT_CARD.questions[id];
      S.card.answers[id] = b.dataset.yn;
      const right = b.dataset.yn === q.answer;
      if (!right && q.next && !S.card.open.includes(q.next)) S.card.open.push(q.next);
      save();
      showQuestion(right || !q.next ? id : q.next);
    };
  });
  const cardRestart = document.getElementById("cardrestart");
  if (cardRestart) {
    cardRestart.onclick = () => {
      S.card = newCardState();
      save();
      renderOffice(key);
      document.getElementById("services").scrollIntoView({ behavior: "smooth" });
    };
  }
  const cardForm = document.getElementById("cardform");
  if (cardForm) {
    new Image().src = STUDENT_CARD.meme.background; // so it's ready when the conversation starts
    cardForm.onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(cardForm);
      const app = Object.fromEntries(f.entries());
      delete app.photo;
      const photo = await readPhoto(f.get("photo"));
      if (photo) app.photo = photo;
      S.card.app = app;
      S.card.won = STUDENT_CARD.questions[cardForm.dataset.q].back;
      save();
      location.hash = "studentid";
    };
  }
  // Item text: \n is a line break.
  const itemText = (opt) => opt.text.replace(/\n/g, "<br>");
  const give = (opt, pick) => {
    const label = opt.tool ? TOOLS[opt.tool] : ICONS[opt.icon];
    found.textContent = `找到${opt.tool ? label.icon : label.emoji} ${label.name}！已收進右下角的郵便箱。`;
    if (opt.tool) {
      S.bag.push(opt.tool);
      record("【物品領取】" + label.name, `已於${o.title}領取，並收進郵便箱。`);
    } else {
      collectIcon(opt.icon, o.title);
    }
    if (opt.text) found.innerHTML += `<br><br>${itemText(opt)}`;
    pick.selectedOptions[0].textContent = optionText(opt);
  };
  const askQuestion = (opt, pick) => {
    found.innerHTML = `
      <form id="askform"><div class="q-row"><label for="askans">${opt.ask.question}</label>${clueButton("askhint")}</div><input id="askans" autocomplete="off"><button>送出</button>${clueList("askhint", opt.ask.hints, 0)}</form>
      <p class="err" id="askerr" role="alert"></p>
      ${opt.ask.img ? `<img class="ask-img" src="${opt.ask.img}" alt="${opt.ask.alt}">` : ""}`;
    mountClue("askhint", opt.ask.hints, 0);
    document.getElementById("askform").onsubmit = (e) => {
      e.preventDefault();
      if (isCorrect(opt.ask, document.getElementById("askans").value)) return give(opt, pick);
      document.getElementById("askerr").textContent = "查核未通過，請再試一次。";
    };
  };
  const askPick = (opt, pick) => {
    found.innerHTML = `<div class="q-row"><b>${opt.pick.question}</b>${clueButton("pickhint")}</div>
      <div class="versus">${pickCard(opt.pick.a, "a")}<em>或</em>${pickCard(opt.pick.b, "b")}</div>
      <p class="err" id="askerr" role="alert"></p>`;
    // The names are the clue: the pictures stay nameless until she asks.
    const cards = [...found.querySelectorAll(".versus button")];
    cards.forEach((b, i) => {
      b.querySelector("span").hidden = true;
      b.setAttribute("aria-label", `第 ${i + 1} 張圖`);
    });
    document.getElementById("pickhint").onclick = (e) => {
      e.currentTarget.hidden = true;
      cards.forEach((b) => {
        b.querySelector("span").hidden = false;
        b.removeAttribute("aria-label");
      });
    };
    found.querySelectorAll(".versus button").forEach((b) => {
      b.onclick = () => {
        if (b.dataset.side === opt.pick.correct) give(opt, pick);
        else document.getElementById("askerr").textContent = "查核未通過，請再試一次。";
      };
    });
  };
  app.querySelectorAll("[data-s]").forEach((box) => {
    box.querySelector("button").onclick = () => {
      const pick = box.querySelector("select");
      found.hidden = false;
      if (pick.value === "") {
        found.textContent = "請先選擇查詢項目。";
        return;
      }
      const opt = o.services[+box.dataset.s].options[+pick.value];
      if (!opt.tool && !opt.icon && !opt.card && !opt.dorm) found.innerHTML = itemText(opt);
      else if (taken(opt) && opt.text) found.innerHTML = itemText(opt);
      else if (taken(opt)) found.textContent = opt.dorm ? `這棟宿舍已命名為${o.dormName}。` : "這項物品已被領走了。";
      else if (opt.card) askCard();
      else if (opt.dorm) location.hash = "dormvote";
      else if (opt.ask) askQuestion(opt, pick);
      else if (opt.pick) askPick(opt, pick);
      else give(opt, pick);
    };
  });
}

function renderSitemap() {
  const links = [
    ["", "國際郵件追蹤查詢"], ["ladder", "郵路爬梯抽籤"], ["download", "下載專區"], ["mobile", "行動郵局"],
    ...Object.entries(OFFICES).map(([key, p]) => [key, p.title]),
  ];
  shell("網站導覽", "網站導覽", `<ul class="sitemap">${links.map(([h, t]) => `<li><a href="#${h}">${t}</a></li>`).join("")}</ul>`);
}

function renderTrack() {
  if (!S.tracked) return (location.hash = "");
  const missions = Object.entries(TASKS).map(([key, t]) => `<li><a href="#${key}"><b>${t.title}</b><span>號碼 ${CONFIG.parts[t.n]}</span></a></li>`).join("");
  const cards = CARDS.filter((c) => cardUnlocked(c.key)).length;
  shell("郵務業務", "郵件處理進度", `
    <p class="notice"><b>追蹤號碼：</b>${CONFIG.parts.join(" ")}<br><b>寄件人：</b>${CONFIG.sender}（高雄） <b>收件人：</b>${CONFIG.recipient}（${CONFIG.city}）</p>
    <h3 class="group">已完成任務</h3>
    <ul class="missions">
      ${missions}
      <li><a href="#download"><b>下載專區</b><span>已解鎖 ${cards} / ${CARDS.length} 張卡片</span></a></li>
    </ul>
    <h3 class="group">郵件處理紀錄</h3>
    <ol class="timeline">${TRACKING.map(([date, office, status]) => `<li><span>${date}・${office}</span>${typeof status === "string" ? status : S.card.won && S.dormNamed ? status.all : status.some}</li>`).join("")}</ol>
    <a class="btn" href="#card">開啟包裹</a>`);
}

function renderCard() {
  if (!S.tracked) return (location.hash = "");
  const photos = ENDING.photos.map((p) => `<img src="${p}" alt="">`).join("");
  shell("郵務業務", "生日卡片", `
    <section class="ending">
      <div class="stamp">配達完了</div>
      <h1>生日快樂</h1>
      <div class="letter">${ENDING.letter.map((l) => `<p>${l.replace(/\n/g, "<br>")}</p>`).join("")}</div>
      ${photos ? `<div class="photos">${photos}</div>` : ""}
    </section>`);
  for (let i = 0; i < 60; i++) {
    const c = document.createElement("i");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.animationDelay = Math.random() * 2 + "s";
    c.style.background = ["#d0402b", "#e9b44c", "#038c00"][i % 3];
    app.append(c);
  }
}

function renderLock(msLeft) {
  const s = Math.ceil(msLeft / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  shell("郵務業務", "國際郵件追蹤查詢", `
    <div class="lock">
      <p>您的包裹正在運送中，預計抵達時間（日本時間）：<br><b>11 月 6 日 00:00</b></p>
      <p class="clock">${Math.floor(s / 86400)} 天 ${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}</p>
      <p class="small">請勿提前簽收。寄件人有前科，本局正在審查。</p>
    </div>`);
}

// Phone-style notifications; they live outside #app so page changes don't remove them.
const PUSH_SHOW_MS = 4000, PUSH_MAX = 2;
function showPush(title, body) {
  const box = document.getElementById("pushes");
  const el = document.createElement("div");
  el.className = "push";
  el.innerHTML = `<span class="push-icon">室</span><div><time>現在</time><b>${title}</b><p>${body}</p></div>`;
  box.prepend(el);
  while (box.children.length > PUSH_MAX) box.lastChild.remove();
  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 350);
  }, PUSH_SHOW_MS);
}

const VIEWS = {
  ladder: renderLadder, eat: renderEat, open: renderOpen, match: renderMatch,
  search: renderHome, studentid: renderStudentId, dormvote: renderDormVote, download: renderDownload, mobile: renderMobile, sitemap: renderSitemap,
  dorm: () => renderOffice("dorm"), ntpu: () => renderOffice("ntpu"),
  track: renderTrack, card: renderCard,
};
let timer, legendTimer, cardTimer, cardPeach = null, scrollAfterRender = null;
function render() {
  clearInterval(timer);
  clearInterval(legendTimer);
  clearInterval(cardTimer);
  clearTimeout(memeTimer);
  const msLeft = new Date(CONFIG.unlockAt) - Date.now();
  const locked = msLeft > 0 && !location.search.includes("test");
  renderBag(locked);
  if (locked) {
    renderLock(msLeft);
    timer = setInterval(render, 1000);
    return;
  }
  // The search page always returns to the unfinished task. #search is the way in for the fish.
  if (!VIEWS[location.hash.slice(1)] && S.current) {
    location.replace(`#${S.current}`);
    return;
  }
  (VIEWS[location.hash.slice(1)] || renderHome)();
  window.scrollTo(0, 0);
  if (scrollAfterRender) {
    const target = document.getElementById(scrollAfterRender);
    scrollAfterRender = null;
    if (target) {
      target.scrollIntoView();
      target.classList.add("flash");
    }
  }
}
addEventListener("hashchange", render);
render();
