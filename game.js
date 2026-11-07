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

const GZ_FILL = {
  dough: 'fill="#fbf2df" stroke="#7a5a3a" stroke-width="1.5"', crust: 'fill="#c46d22"', pleat: 'fill="none" stroke="#7a5a3a" stroke-width="1.4"',
  green: 'fill="#63b33a"', shine: 'fill="#fff" opacity=".75"',
};
const foodSvg = (type) => FRY_ART[type].replace(/class="([a-z]+)[^"]*"/g, (_, c) => GZ_FILL[c]);

// eight 來eight 棒: A bends over and throws, the 8 opens at its waist and eats; each 煎餃 eaten joins the ring.
function playGyozaCard(card) {
  const $ = (id) => document.getElementById(id), gc = GYOZA_CARD;
  const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const bump = (t, a, b, c, d) => ease((t - a) / (b - a)) * (1 - ease((t - c) / (d - c)));
  const at = (el) => { const r = el.getBoundingClientRect(), w = card.getBoundingClientRect(); return [r.left + r.width / 2 - w.left, r.top + r.height / 2 - w.top]; };
  const svg = (type) => `<svg viewBox="0 0 64 46">${foodSvg(type)}</svg>`;
  // 8 煎餃 for the ring, then the 小籠包 and 水煎包 she picked up in the game
  const got = S.fry || {}, order = [...Array(8).fill("gyoza"), ...Array(got.xlb || 0).fill("xlb"), ...Array(got.bun || 0).fill("bun")];
  const THROW = 1300, COUNT = order.length, PAUSE = 2200;
  const size = Math.max(7, 14 * Math.sqrt(8 / COUNT)); // everything eaten shares the ring, so pieces shrink when there are many
  const start = performance.now();
  let thrown = -1, eaten = 0;
  const frame = (now) => {
    if (!card.isConnected) return;
    const t = (now - start) % (THROW * COUNT + PAUSE), n = Math.floor(t / THROW), k = t - n * THROW, active = n < COUNT;
    if (t < THROW && eaten === COUNT) {                       // a new round: clear the ring
      card.querySelectorAll(".gz-ring").forEach((e) => e.remove());
      eaten = 0;
    }
    const bend = active ? bump(k, 0, 330, 700, 1150) : 0, flick = active ? bump(k, 220, 330, 360, 520) : 0;
    const open = active ? bump(k, 560, 720, 860, 1020) : 0, empty = active && k > 340 && k < 1000;
    $("gzA").style.rotate = `${16 * bend}deg`;
    $("gzA").style.translate = `${4 * bend}% 0`;
    $("gzchop").style.rotate = `${-18 * flick}deg`;
    $("gzstickB").setAttribute("transform", `rotate(${empty ? 26 : 0} 4 16)`);
    $("gzheld").style.opacity = empty ? 0 : 1;
    const next = order[active ? (k > 340 ? n + 1 : n) : 0] || "gyoza";   // what is on the chopsticks now
    if ($("gzheld").dataset.type !== next) {
      $("gzheld").dataset.type = next;
      $("gzheld").innerHTML = foodSvg(next);
    }
    $("gz8").style.rotate = `${-6 * open}deg`;
    $("gzstamp").hidden = t < THROW * COUNT + 250;            // the seal, once everything is eaten
    $("gztop").setAttribute("transform", `translate(0 ${-22 * open})`);
    $("gzbot").setAttribute("transform", `translate(0 ${22 * open})`);
    if (active && k >= 340 && thrown !== n) {
      thrown = n;
      const [x0, y0] = at($("gztip")), [x1, y1] = at($("gzmouth")), W = card.clientWidth;
      const fly = document.createElement("span");
      fly.className = "gz-fly";
      fly.innerHTML = svg(order[n]);
      card.append(fly);
      fly.animate(Array.from({ length: 11 }, (_, i) => { const s = i / 10; return { left: `${x0 + (x1 - x0) * s}px`, top: `${y0 + (y1 - y0) * s - W * 0.07 * Math.sin(Math.PI * s)}px`, rotate: `${s * 200}deg`, scale: i === 10 ? 0.25 : 1 - s * 0.3 }; }),
        { duration: 380, fill: "forwards" }).onfinish = () => fly.remove();
      setTimeout(() => {                                     // swallowed: it joins the ring around the head
        if (!card.isConnected) return;
        const a = (n / COUNT) * Math.PI * 2 - Math.PI / 2, dot = document.createElement("span");
        dot.className = "gz-ring";
        dot.innerHTML = svg(order[n]);
        dot.style.width = `${size}%`;
        dot.style.left = `${gc.ring.x + gc.ring.r * Math.cos(a)}%`;
        dot.style.top = `${gc.ring.y + (gc.ring.r * Math.sin(a)) / gc.tall}%`;
        card.append(dot);
        eaten = n + 1;
      }, 640);
    }
    if (!active) thrown = -1;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

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
  const picked = { gyoza: 0, xlb: 0, bun: 0 }; // cooked food she picked up this round, kept if she wins
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
    picked[item.type]++;
    if (item.type !== "gyoza") return say(FRY.notGyoza);
    eaten++;
    say(FRY.got);
    document.getElementById("frycount").textContent = `🥟 ${eaten} / ${FRY.goal}`;
    if (eaten >= FRY.goal) {
      over = true;
      S.fry = picked;
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
      record: (event) => {
        const now = performance.now(), log = (S.peachRec ||= []);
        if (log.length >= 4000 || (event.k === "p" && now - peachRecAt < 40)) return;
        log.push({ ...event, d: Math.round(Math.min(now - peachRecAt, 400)) });
        peachRecAt = now;
      },
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
    delete (S.matchAt ||= {})[slotOf(id)];
    delete S.matched[slotOf(id)];
    matchPick = null;
    redraw();
  };
  // A slot holds one icon: whatever was there goes back to the tray.
  const place = (id, i) => {
    S.matchAt ||= {};
    if (slotOf(id) !== undefined) {
      delete S.matchAt[slotOf(id)];
      delete S.matched[slotOf(id)];
    }
    S.matched[i] = id;
    S.matchAt[i] = Date.now();
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
// ---------- Card downloads: still card, GIF, boomerang, video ----------
// Each animated card is redrawn frame by frame on a canvas, so all four formats come from one drawing.

// A small GIF89a writer: fixed 252-colour palette with ordered dithering, LZW, loops forever.
// Pixels that match the previous frame are left transparent, so a still background costs almost nothing.
function GifWriter(w, h, fps) {
  const out = [], byte = (x) => out.push(x & 255), word = (x) => { byte(x); byte(x >> 8); };
  [..."GIF89a"].forEach((ch) => byte(ch.charCodeAt(0)));
  word(w); word(h); byte(0xf7); byte(0); byte(0);
  for (let i = 0; i < 256; i++) {                       // 6 reds x 7 greens x 6 blues, then 4 unused
    const r = Math.floor(i / 42), g = Math.floor((i % 42) / 6), b = i % 6;
    if (i < 252) { byte(r * 51); byte(Math.round(g * 42.5)); byte(b * 51); } else { byte(0); byte(0); byte(0); }
  }
  [0x21, 0xff, 0x0b, ..."NETSCAPE2.0".split("").map((c) => c.charCodeAt(0)), 0x03, 0x01, 0, 0, 0].forEach(byte);
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const delay = Math.round(100 / fps);
  let shown = null;
  this.addFrame = (rgba) => {
    const px = new Uint8Array(w * h);
    for (let y = 0, p = 0; y < h; y++) {
      for (let x = 0; x < w; x++, p++) {
        const d = BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47, q = p * 4;
        const r = Math.min(5, Math.max(0, Math.round(rgba[q] / 51 + d)));
        const g = Math.min(6, Math.max(0, Math.round(rgba[q + 1] / 42.5 + d)));
        const b = Math.min(5, Math.max(0, Math.round(rgba[q + 2] / 51 + d)));
        px[p] = r * 42 + g * 6 + b;
      }
    }
    const enc = px.map((v, p) => (shown && shown[p] === v ? 255 : v));
    shown = px;
    [0x21, 0xf9, 0x04, 0x05].forEach(byte); word(delay); byte(255); byte(0);
    byte(0x2c); word(0); word(0); word(w); word(h); byte(0);
    byte(8);
    const data = [], CLEAR = 256, END = 257, dict = new Map();
    let size = 9, next = 258, acc = 0, bits = 0;
    const emit = (code) => {
      acc |= code << bits;
      bits += size;
      while (bits >= 8) { data.push(acc & 255); acc >>>= 8; bits -= 8; }
      if (code === CLEAR) size = 9;
      else if (next > (1 << size) - 1 && size < 12) size++;
    };
    emit(CLEAR);
    let prefix = enc[0];
    for (let i = 1; i < enc.length; i++) {
      const k = enc[i], key = prefix * 256 + k, hit = dict.get(key);
      if (hit !== undefined) { prefix = hit; continue; }
      emit(prefix);
      if (next < 4096) dict.set(key, next++);
      else { next = 258; emit(CLEAR); dict.clear(); }
      prefix = k;
    }
    emit(prefix);
    emit(END);
    if (bits > 0) data.push(acc & 255);
    for (let i = 0; i < data.length; i += 255) {
      const n = Math.min(255, data.length - i);
      byte(n);
      for (let j = 0; j < n; j++) out.push(data[i + j]);
    }
    byte(0);
  };
  this.finish = () => { byte(0x3b); return new Uint8Array(out); };
}

const pickMime = (audio = false) => [...(audio ? ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus"] : []), "video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"]
  .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));

// Message sounds, made with Web Audio so there are no sound files: a pop when she sends,
// a two-note ding when the 客服 answers, a soft thump when the seal lands.
function cardSound(ac, out, kind) {
  const at = ac.currentTime;
  const tone = (freq, start, len, vol, to = 0) => {
    const o = ac.createOscillator(), v = ac.createGain();
    o.frequency.setValueAtTime(freq, at + start);
    if (to) o.frequency.exponentialRampToValueAtTime(to, at + start + len);
    v.gain.setValueAtTime(0.0001, at + start);
    v.gain.exponentialRampToValueAtTime(vol, at + start + 0.012);
    v.gain.exponentialRampToValueAtTime(0.0001, at + start + len);
    o.connect(v).connect(out);
    o.start(at + start);
    o.stop(at + start + len + 0.02);
  };
  if (kind === "send") tone(520, 0, 0.1, 0.25, 980);
  else if (kind === "reply") {
    tone(880, 0, 0.2, 0.22);
    tone(1320, 0.1, 0.3, 0.2);
  } else if (kind === "stamp") tone(150, 0, 0.22, 0.6, 55);
}
// The sounds due between two moments of a card's timeline, in order.
const soundsBetween = (src, a, b) => (src.sounds || []).filter(([at]) => at > a && at <= b).map(([, kind]) => kind);
const easeInOut = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const bumpAt = (t, a, b, c, d) => easeInOut((t - a) / (b - a)) * (1 - easeInOut((t - c) / (d - c)));
const backOut = (t) => { const c = 2.2; return t >= 1 ? 1 : 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const svgImage = (svg) => loadImage("data:image/svg+xml," + encodeURIComponent(svg));
const newCanvas = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });

// eight 來eight 棒: the same throw, chomp and ring as on the page, drawn for time t.
async function gyozaSource() {
  const gc = GYOZA_CARD, W = 450, H = Math.round(W * gc.tall), canvas = newCanvas(W, H), g = canvas.getContext("2d");
  const [bg, A, E] = await Promise.all([gc.bg, gc.a, gc.eight].map(loadImage));
  const food = {};
  for (const t of ["gyoza", "xlb", "bun"]) food[t] = await svgImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 46" width="128" height="92">${foodSvg(t)}</svg>`);
  const got = S.fry || {}, order = [...Array(8).fill("gyoza"), ...Array(got.xlb || 0).fill("xlb"), ...Array(got.bun || 0).fill("bun")];
  const THROW = 1300, COUNT = order.length, D = THROW * COUNT + 2200, size = Math.max(7, 14 * Math.sqrt(8 / COUNT));
  const aw = 0.315 * W, ah = (aw * A.height) / A.width, ax = 0.0235 * W, ay = 0.527 * H;
  const ew = 0.353 * W, eh = (ew * E.height) / E.width, ex = 0.464 * W, ey = 0.476 * H;
  const cw = 0.95 * aw, ch = cw * 0.6, sw = 0.963 * ew;
  const matA = (bend) => new DOMMatrix().translate(ax + 0.04 * aw * bend, ay).translate(aw / 2, ah).rotate(16 * bend).translate(-aw / 2, -ah);
  const matChop = (bend, flick) => matA(bend).translate(-0.02 * aw, -0.04 * ah).translate(0.06 * cw, 0.18 * ch).rotate(-18 * flick).translate(-0.06 * cw, -0.18 * ch).scale(cw / 100);
  const mat8 = (open) => new DOMMatrix().translate(ex, ey).translate(ew / 2, eh).rotate(-6 * open).translate(-ew / 2, -eh);
  const matSign = (open) => mat8(open).translate(0.0208 * ew, 0.0176 * eh).scale(sw / 208).translate(4, 4);
  const tip0 = matChop(1, 1).transformPoint({ x: 88, y: 38 }), mouth0 = matSign(0).transformPoint({ x: 100, y: 101 });
  const stick = (x1, y1, x2, y2) => {
    for (const [c, wd] of [["#3a2a1a", 6], ["#f3c98b", 4]]) { g.strokeStyle = c; g.lineWidth = wd; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  };
  const render = (time) => {
    const t = time % D, n = Math.floor(t / THROW), k = t - n * THROW, active = n < COUNT;
    const bend = active ? bumpAt(k, 0, 330, 700, 1150) : 0, flick = active ? bumpAt(k, 220, 330, 360, 520) : 0;
    const open = active ? bumpAt(k, 560, 720, 860, 1020) : 0, empty = active && k > 340 && k < 1000;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(bg, 0, 0, W, H);
    g.setTransform(matA(bend)); g.drawImage(A, 0, 0, aw, ah);
    g.setTransform(matChop(bend, flick)); g.lineCap = "round";
    stick(6, 6, 86, 34);
    g.save(); g.translate(4, 16); g.rotate(((empty ? 26 : 0) * Math.PI) / 180); g.translate(-4, -16); stick(4, 16, 84, 42); g.restore();
    if (!empty) {
      g.setTransform(matChop(bend, flick).translate(88, 38).rotate(18).scale(0.5).translate(-32, -26));
      g.drawImage(food[order[active ? (k > 340 ? n + 1 : n) : 0] || "gyoza"], 0, 0, 64, 46);
    }
    g.setTransform(mat8(open)); g.drawImage(E, 0, 0, ew, eh);
    g.setTransform(matSign(open));
    g.fillStyle = "#fff"; g.strokeStyle = "#111"; g.lineWidth = 4; g.beginPath(); g.arc(100, 100, 99, 0, Math.PI * 2); g.fill(); g.stroke();
    g.strokeStyle = "#d33a3a"; g.lineWidth = 7; g.beginPath(); g.arc(100, 100, 84, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#d33a3a"; g.font = '900 118px "Arial Black", Arial, sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
    for (const [y0, hh, dy] of [[0, 101, -22], [101, 99, 22]]) { g.save(); g.beginPath(); g.rect(0, y0, 200, hh); g.clip(); g.fillText("8", 100, 104 + dy * open); g.restore(); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    const fw = 0.125 * W;
    if (active && k >= 340 && k < 720) {                 // the throw in flight
      const s = (k - 340) / 380, x = tip0.x + (mouth0.x - tip0.x) * s, y = tip0.y + (mouth0.y - tip0.y) * s - W * 0.07 * Math.sin(Math.PI * s);
      const sc = s < 0.9 ? 1 - s * 0.3 : 0.73 - ((s - 0.9) / 0.1) * 0.48;
      g.save(); g.translate(x, y); g.rotate((s * 200 * Math.PI) / 180); g.scale(sc, sc); g.drawImage(food[order[n]], -fw / 2, (-fw * 46) / 64 / 2, fw, (fw * 46) / 64); g.restore();
    }
    drawPostStamp(g, 0, 0, W, H, (t - (THROW * COUNT + 250)) / 400);
    for (let j = 0; j < COUNT; j++) {                    // everything eaten so far, ringed around the head
      const p = (t - (j * THROW + 980)) / 500;
      if (p < 0) continue;
      const a = (j / COUNT) * Math.PI * 2 - Math.PI / 2, rw = (size / 100) * W;
      const x = (W * (gc.ring.x + gc.ring.r * Math.cos(a))) / 100, y = (H * (gc.ring.y + (gc.ring.r * Math.sin(a)) / gc.tall)) / 100;
      const sc = p >= 1 ? 1 : p < 0.6 ? 0.2 + (p / 0.6) * 1.05 : 1.25 - ((p - 0.6) / 0.4) * 0.25;
      g.save(); g.globalAlpha = Math.min(1, p / 0.6); g.translate(x, y); g.scale(sc, sc); g.drawImage(food[order[j]], -rw / 2, (-rw * 46) / 64 / 2, rw, (rw * 46) / 64); g.restore();
    }
  };
  return { canvas, duration: D, segment: [0, THROW], render };
}

// The 室友郵政 seal that ends every card, as on the student card application: it slams down over 0.4 s
// in the bottom right corner. stampHtml is the page version; drawPostStamp draws it into a recording.
const stampHtml = (attrs = "") => `<i class="card-stamp" ${attrs}>${STUDENT_CARD.stamp.join("<br>")}</i>`;
function drawPostStamp(g, x, y, w, h, p, alpha = 1) {
  if (p <= 0) return;
  const d = 0.17 * w, fs = 0.23 * d, k = p >= 1 ? 1 : 3 - 2 * p;
  g.save();
  g.globalAlpha = 0.85 * Math.min(p, 1) * alpha;
  g.translate(x + w - 0.03 * w - d / 2, y + h - 0.03 * h - d / 2);
  g.rotate((-10 * Math.PI) / 180);
  g.scale(k, k);
  g.strokeStyle = g.fillStyle = "#d0402b";
  g.lineWidth = 0.05 * d;
  g.beginPath();
  g.arc(0, 0, d / 2 - g.lineWidth / 2, 0, Math.PI * 2);
  g.stroke();
  g.font = `900 ${fs}px "Noto Sans TC", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  STUDENT_CARD.stamp.forEach((line, n) => g.fillText(line, 0, (n - 0.5) * 1.15 * fs));
  g.restore();
}

// Incense smoke over the 普渡 table: soft puffs rise from each stick and drift up-left, repeating every 4 s.
function drawSmoke(g, W, H, time) {
  for (const [sx, sy, rise, n] of SANSHENG_CARD.smoke) {
    for (let i = 0; i < n; i++) {
      const p = ((time / 4000) + i / n) % 1, sway = Math.sin(p * 7 + i * 2.3);
      const x = (sx / 100) * W - p * 0.16 * W + sway * 0.012 * W, y = (sy / 100) * H - p * (rise / 100) * H;
      const r = (0.008 + p * 0.05) * W, a = 0.62 * Math.min(1, p * 6) * (1 - p) ** 1.3;
      const puff = g.createRadialGradient(x, y, 0, x, y, r);
      puff.addColorStop(0, `rgba(250,250,247,${a})`);
      puff.addColorStop(1, "rgba(250,250,247,0)");
      g.fillStyle = puff;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
}

// 中超style 三牲: the two lines type out one character at a time, then the six products pop in
// in the order she placed them in 三牲連連看. The lines are drawn last, so no product ever covers them.
async function sanshengSource(width = 540) {
  const sc = SANSHENG_CARD, bg = await loadImage(sc.bg), items = await Promise.all(sc.items.map(([src]) => loadImage(src)));
  const W = Math.round(width), H = Math.round((W * bg.height) / bg.width), canvas = newCanvas(W, H), g = canvas.getContext("2d");
  const TYPE = 90, LOOP = 10000, chars = sc.lines.map((line) => [...line]);
  const lineAt = [300, 300 + chars[0].length * TYPE + 350];
  const popAt = lineAt[1] + chars[1].length * TYPE + 400, GAP = 350;
  const placedAt = S.matchAt || {}, order = sc.items.map((_, n) => n).sort((a, b) => (placedAt[sc.items[a][4]] ?? 1e15 + a) - (placedAt[sc.items[b][4]] ?? 1e15 + b));
  const render = (time) => {
    const t = time % LOOP, fade = 1 - easeInOut((t - 8700) / 600);
    g.globalAlpha = 1; g.drawImage(bg, 0, 0, W, H);
    drawSmoke(g, W, H, t);
    order.forEach((n, step) => {
      const [, x, y, w] = sc.items[n], p = (t - (popAt + step * GAP)) / 1000;
      if (p < 0) return;
      const iw = (w / 100) * W, ih = (iw * items[n].height) / items[n].width, s = p < 0.32 ? 0.2 + (p / 0.32) * 1.05 : p < 0.56 ? 1.25 - ((p - 0.32) / 0.24) * 0.25 : 1;
      g.save(); g.globalAlpha = Math.min(1, p / 0.32) * fade; g.translate((x / 100) * W + iw / 2, (y / 100) * H + ih / 2); g.scale(s, s);
      g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 4; g.shadowOffsetY = 1; g.drawImage(items[n], -iw / 2, -ih / 2, iw, ih); g.restore();
    });
    drawPostStamp(g, 0, 0, W, H, (t - (popAt + 5 * GAP + 900)) / 400, fade);
    const fs = 0.046 * W;
    g.font = `700 ${fs}px "Noto Sans TC", sans-serif`; g.textBaseline = "middle";
    chars.forEach((line, n) => {
      const shown = line.slice(0, Math.floor((t - lineAt[n]) / TYPE) + 1).join("");
      if (t < lineAt[n] || !shown) return;
      const bw = g.measureText(shown).width + 0.032 * W, bh = fs * 1.35 + 0.008 * W, x = 0.03 * W, y = (0.11 + n * 0.16) * H;
      g.globalAlpha = fade; g.fillStyle = "#111"; g.fillRect(x, y, bw, bh); g.fillStyle = "#fff"; g.fillText(shown, x + 0.016 * W, y + bh / 2);
    });
    g.globalAlpha = 1;
  };
  return { canvas, duration: LOOP, segment: [popAt - 200, popAt + 5 * GAP + 700], still: 8000, render };
}

// 線上客服卡: replays her chat with the 廢話客服 up to the 提示 she asked for, then the seal.
// The greeting and her latest lines, so the card grows as she keeps chatting. Lines come in pairs: hers, then the reply.
function chatLog() {
  if (!S.chat.length) {                                     // nothing saved, e.g. a loaded progress file
    const hint = !openTasks().length ? CHAT.allDone : S.current ? CHAT.taskHints[S.current] : CHAT.noTask;
    return [{ text: CHAT.greeting }, { me: true, text: CHAT.chips[0] }, { text: hint }];
  }
  return [{ text: CHAT.greeting }, ...S.chat.slice(-10)];
}

async function chatSource(width = 540) {
  const W = Math.round(width), H = Math.round(W * 1.3), canvas = newCanvas(W, H), g = canvas.getContext("2d");
  const face = await loadImage(CHAT.avatar);
  const drawFace = (cx, cy, d) => {                          // the bearded 客服 in a white circle
    g.fillStyle = "#fff"; g.beginPath(); g.arc(cx, cy, d / 2, 0, Math.PI * 2); g.fill();
    if (face) { const h = d * 0.88, w = (h * face.width) / face.height; g.drawImage(face, cx - w / 2, cy - h / 2, w, h); }
  };
  const head = 0.11 * W, pad = 0.035 * W, fs = 0.036 * W, lh = fs * 1.45, bp = 0.022 * W, maxW = 0.66 * W, av = 0.075 * W, gap = 0.024 * W;
  const font = (weight, size) => `${weight} ${size}px "Noto Sans TC", sans-serif`;
  g.font = font(400, fs);
  const wrap = (text) => text.split("\n").flatMap((para) => {
    const lines = [""];
    for (const ch of para) {
      // closing punctuation stays on the line it closes
      if (g.measureText(lines[lines.length - 1] + ch).width > maxW - 2 * bp && lines[lines.length - 1] && !"」』）)。，、！？：；…".includes(ch)) lines.push("");
      lines[lines.length - 1] += ch;
    }
    return lines;
  });
  // First the 客服 is connected, as on the 行動郵局 page; it stays as a line at the top.
  const CONNECT = 1700, sysH = lh + 0.6 * bp;
  // Lay out every bubble, then give each one its moment: the 客服 types for a moment before each reply.
  let y = sysH + gap, t = CONNECT;
  const items = chatLog().map((m) => {
    const lines = wrap(m.text.replace("[?]", "❔")), bw = Math.max(...lines.map((l) => g.measureText(l).width)) + 2 * bp, bh = lines.length * lh + 2 * bp;
    const item = { me: !!m.me, lines, bw, bh, y };
    if (m.me) item.at = t += 700;
    else item.typing = t, item.at = t += 900;
    t += m.me ? 300 : 500 + Math.min(2400, m.text.length * 45);
    y += bh + gap;
    return item;
  });
  const END = t, area = H - head - 2 * pad;
  const bottom = (it, typing) => it.y + (typing ? 2 * bp + lh : it.bh);
  // The log scrolls up as it fills, like the chat on the 行動郵局 page.
  const moves = items.flatMap((it) => [...(it.me ? [] : [[it.typing, bottom(it, true)]]), [it.at, bottom(it)]]).map(([at, b]) => [at, Math.max(0, b - area)]);
  const scrollAt = (time) => {
    let from = 0, to = 0, at = 0;
    for (const [when, s] of moves) if (when <= time) [from, to, at] = [to, s, when];
    return from + (to - from) * easeInOut((time - at) / 350);
  };
  const bubble = (it, x, top, p) => {
    g.save();
    g.globalAlpha = Math.min(1, p * 2);
    const s = 0.85 + 0.15 * easeInOut(p);
    g.translate(it.me ? x + it.bw : x, top);
    g.scale(s, s);
    g.translate(it.me ? -it.bw : 0, 0);
    g.fillStyle = it.me ? "#dff3df" : "#fff";
    g.strokeStyle = it.me ? "#b8dfb8" : "#dddddd";
    g.lineWidth = Math.max(1, W / 540);
    g.beginPath(); g.roundRect(0, 0, it.bw, it.bh, 0.016 * W); g.fill(); g.stroke();
    g.fillStyle = "#434343"; g.font = font(400, fs); g.textBaseline = "middle"; g.textAlign = "left";
    it.lines.forEach((line, n) => g.fillText(line, bp, bp + lh * (n + 0.5)));
    g.restore();
  };
  const chatAt = (time) => {
    g.fillStyle = "#f7f7f7"; g.fillRect(0, 0, W, H);
    const scroll = scrollAt(time);
    g.save();
    g.beginPath(); g.rect(0, head, W, H - head); g.clip();
    const sys = time < CONNECT ? CHAT.connecting + "．".repeat(Math.floor(Math.max(0, time) / 350) % 4) : CHAT.connected;
    g.font = font(400, fs * 0.82); g.textAlign = "center"; g.textBaseline = "middle";
    const sw = g.measureText(CHAT.connecting + "．．．").width + 0.06 * W, sy = head + pad - scroll;
    g.fillStyle = "#e9e9e9"; g.beginPath(); g.roundRect(W / 2 - sw / 2, sy, sw, sysH, sysH / 2); g.fill();
    g.fillStyle = "#707070"; g.fillText(sys, W / 2, sy + sysH / 2);
    items.forEach((it) => {
      const top = head + pad + it.y - scroll;
      if (!it.me && time >= it.typing) drawFace(pad + av / 2, top + av / 2, av); // its face beside each of its lines
      const x = it.me ? W - pad - it.bw : pad + av + 0.015 * W;
      if (time >= it.at) bubble(it, x, top, Math.min(1, (time - it.at) / 220));
      else if (!it.me && time >= it.typing) {                  // typing…
        const dw = 0.13 * W, dh = 2 * bp + lh;
        g.fillStyle = "#fff"; g.strokeStyle = "#dddddd"; g.lineWidth = Math.max(1, W / 540);
        g.beginPath(); g.roundRect(x, top, dw, dh, 0.016 * W); g.fill(); g.stroke();
        for (let d = 0; d < 3; d++) {
          const bob = Math.sin((time - it.typing) / 140 - d * 0.9) * 0.008 * W;
          g.fillStyle = "#9a9a9a"; g.beginPath(); g.arc(x + dw * (0.3 + d * 0.2), top + dh / 2 + bob, 0.009 * W, 0, Math.PI * 2); g.fill();
        }
      }
    });
    g.restore();
    const grad = g.createLinearGradient(0, 0, 0, head);
    grad.addColorStop(0, "#038c00"); grad.addColorStop(1, "#026b00");
    g.fillStyle = grad; g.fillRect(0, 0, W, head);
    g.fillStyle = "#fff"; g.font = font(700, 0.042 * W); g.textAlign = "left"; g.textBaseline = "middle";
    drawFace(pad + head * 0.36, head / 2, head * 0.72);
    g.fillText(CHAT.name, pad + head * 0.82, head / 2);
    drawPostStamp(g, 0, 0, W, H, (time - END - 200) / 400);
  };

  // Before the chat: the queue she waited in on her first visit to 行動郵局, moving up until it's her turn.
  const Q_STEPS = [400, 1700, 3000, 4300], QUEUE = 5400, FADE = 350;
  const drawQueue = (time) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#038c00"; g.fillRect(0, 0, W, 0.012 * W);
    g.textBaseline = "middle"; g.textAlign = "center";
    const lr = 0.05 * W, ly = 0.1 * W;                         // the 室 logo and name
    g.font = font(900, 0.06 * W);
    const nw = g.measureText("室友郵政").width, lx = W / 2 - (nw + 2 * lr + 0.02 * W) / 2 + lr;
    g.fillStyle = "#fff"; g.strokeStyle = "#1d4f9c"; g.lineWidth = lr * 0.2;
    g.beginPath(); g.arc(lx, ly, lr - g.lineWidth / 2, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = "#d0402b"; g.font = font(900, lr * 1.1); g.fillText("室", lx, ly + lr * 0.05);
    g.fillStyle = "#038c00"; g.font = font(900, 0.06 * W); g.textAlign = "left"; g.fillText("室友郵政", lx + lr + 0.02 * W, ly);
    g.fillStyle = "#555d66"; g.font = font(900, 0.06 * W); g.fillText("當前您正在排隊等候中", pad, 0.24 * W);
    g.font = font(700, 0.032 * W);
    ["您正在 廢話客服 排隊等候。當輪到您時，您有 10 分鐘", "進入對話，若超過時效未進入須重新排隊取號。"].forEach((l, n) => g.fillText(l, pad, 0.32 * W + n * 0.05 * W));
    const step = Q_STEPS.filter((at) => time >= at).length - 1;   // 0..3: three ahead, two, one, her turn
    const from = step <= 0 ? 0.3 : 0.3 + (0.7 * (step - 1)) / 3, to = 0.3 + (0.7 * Math.max(0, step)) / 3;
    const share = from + (to - from) * easeInOut((time - (Q_STEPS[Math.max(0, step)] || 0)) / 1000);
    const tx = pad, ty = 0.44 * W, tw = W - 2 * pad, th = 0.15 * W;   // the green track with the striped bar
    g.fillStyle = "#e8f3ea"; g.beginPath(); g.roundRect(tx, ty, tw, th, 0.012 * W); g.fill();
    const px = tx + 0.03 * W, ph = 0.075 * W, py = ty + (th - ph) / 2, pw = tw - 0.06 * W, bw = Math.max(ph, pw * share);
    g.save(); g.beginPath(); g.roundRect(px, py, pw, ph, ph / 2); g.clip();
    g.fillStyle = "#fff"; g.fillRect(px, py, pw, ph);
    g.beginPath(); g.rect(px, py, bw, ph); g.clip();
    const stripe = 0.035 * W, shift = ((time / 2000) * 2 * stripe) % (2 * stripe);
    g.fillStyle = "#2e8b45"; g.fillRect(px, py, bw, ph); g.fillStyle = "#6db483";
    for (let x = px - ph - 2 * stripe + shift; x < px + bw; x += 2 * stripe) { g.beginPath(); g.moveTo(x, py + ph); g.lineTo(x + stripe, py + ph); g.lineTo(x + stripe + ph, py); g.lineTo(x + ph, py); g.fill(); }
    g.fillStyle = "#fff"; g.beginPath(); g.roundRect(px + bw - 0.03 * W, py + 0.012 * W, 0.016 * W, ph - 0.024 * W, 0.006 * W); g.fill();   // the little person
    g.beginPath(); g.arc(px + bw - 0.022 * W, py + 0.014 * W, 0.009 * W, 0, Math.PI * 2); g.fill();
    g.restore();
    g.strokeStyle = "#038c00"; g.lineWidth = 0.008 * W; g.beginPath(); g.roundRect(px, py, pw, ph, ph / 2); g.stroke();
    const sy = 0.63 * W, sh = 0.3 * W;                            // the status box
    g.fillStyle = "#e8f3ea"; g.beginPath(); g.roundRect(tx, sy, tw, sh, 0.012 * W); g.fill();
    g.textAlign = "center"; g.fillStyle = "#434343";
    if (step < 3) {
      g.font = font(400, 0.042 * W); g.fillText(CHAT.queueMoving, W / 2, sy + 0.07 * W);
      g.fillStyle = "#026b00"; g.font = font(900, 0.045 * W); g.fillText(CHAT.queueAhead.replace("{n}", 3 - Math.max(0, step)), W / 2, sy + 0.14 * W);
    } else {
      g.fillStyle = "#026b00"; g.font = font(900, 0.05 * W); g.fillText(CHAT.queueTurn, W / 2, sy + 0.1 * W);
    }
    g.fillStyle = "#8a9a1c"; g.beginPath(); g.arc(W / 2 - 0.2 * W, sy + 0.23 * W, 0.013 * W, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#555d66"; g.font = font(400, 0.032 * W); g.textAlign = "left"; g.fillText("最近更新狀態：上午11:06:00", W / 2 - 0.175 * W, sy + 0.23 * W);
    g.textAlign = "center"; g.font = font(400, 0.028 * W); g.fillText(`隊列 ID：${S.queueId}`, W / 2, sy + sh + 0.05 * W);
    const ny = sy + sh + 0.1 * W, nh = 0.16 * W;                // the 公告 notice, as on the page
    g.fillStyle = "#fff"; g.shadowColor = "rgba(0,0,0,.15)"; g.shadowBlur = 0.01 * W;
    g.beginPath(); g.roundRect(tx, ny, tw, nh, 0.018 * W); g.fill(); g.shadowBlur = 0;
    g.fillStyle = "#d32f2f"; g.fillRect(tx, ny, 0.01 * W, nh);
    g.beginPath(); g.roundRect(tx + 0.03 * W, ny + 0.025 * W, 0.08 * W, 0.045 * W, 0.006 * W); g.fill();
    g.fillStyle = "#fff"; g.font = font(700, 0.03 * W); g.fillText("公告", tx + 0.07 * W, ny + 0.048 * W);
    g.textAlign = "left"; g.fillStyle = "#434343"; g.font = font(400, 0.03 * W);
    ["客服下班期間進入之用戶，系統將依隨機取號方式", "分配號碼，並依號碼順序安排對話。請保持此頁面", "開啟，無須重新整理。"].forEach((l, n) => g.fillText(l, tx + 0.13 * W, ny + 0.048 * W + n * 0.045 * W));
  };
  // The whole card: the queue, a quick fade, then the chat as before.
  const render = (time) => {
    if (time < QUEUE) return drawQueue(time);
    chatAt(time - QUEUE);
    if (time < QUEUE + FADE) {
      g.save(); g.globalAlpha = 1 - (time - QUEUE) / FADE; drawQueue(QUEUE); g.restore();
    }
  };
  const last = QUEUE + items[items.length - 1].at;
  const sounds = [[Q_STEPS[3], "reply"], ...items.map((it) => [QUEUE + it.at, it.me ? "send" : "reply"]), [QUEUE + END + 230, "stamp"]];
  return { canvas, duration: QUEUE + END + 2800, segment: [last - 1100, last + 700], still: QUEUE + END + 1000, sounds, render };
}

// A card on the page is the same drawing as its downloads, sized for the screen.
async function playCanvasCard(holder, makeSource) {
  const src = await makeSource(Math.min(1400, holder.clientWidth * devicePixelRatio));
  src.canvas.setAttribute("role", "img");
  src.canvas.setAttribute("aria-label", holder.dataset.label);
  holder.replaceChildren(src.canvas);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return src.render(src.still);
  const sound = src.sounds && window.AudioContext ? cardSoundSwitch(holder) : null;
  const start = performance.now();
  let last = 0;
  const frame = (now) => {
    if (!src.canvas.isConnected) {
      if (sound) sound.ac.close();
      return;
    }
    const t = now - start, a = last % src.duration, b = t % src.duration;
    if (sound && sound.on()) (b >= a ? soundsBetween(src, a, b) : [...soundsBetween(src, a, src.duration), ...soundsBetween(src, -1, b)]).forEach((kind) => cardSound(sound.ac, sound.ac.destination, kind));
    last = t;
    src.render(t);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// The 🔊 button on a card with sounds. Sounds play only while the card is on screen. A browser that keeps
// sound off until a tap shows the button red; tapping it turns the sound on.
function cardSoundSwitch(holder) {
  const ac = new AudioContext();
  holder.insertAdjacentHTML("beforeend", `<button type="button" class="card-sound" aria-pressed="true">🔊 ${CHAT.sound}</button>`);
  const btn = holder.lastElementChild;
  let wanted = true, seen = true;
  const show = () => {
    const on = wanted && ac.state === "running";
    btn.textContent = `${on ? "🔊" : "🔇"} ${CHAT.sound}`;
    btn.setAttribute("aria-pressed", String(on));
  };
  ac.resume().catch(() => {}).finally(show);
  ac.onstatechange = show;
  btn.onclick = () => {
    wanted = btn.getAttribute("aria-pressed") !== "true";
    if (wanted) ac.resume().catch(() => {});
    show();
  };
  new IntersectionObserver(([e]) => (seen = e.isIntersecting)).observe(holder);
  return { ac, on: () => wanted && seen && ac.state === "running" };
}

// 壽桃塔卡: a fresh 3D view that replays how she opened the box, from the first cut to the peach mountain.
const PEACH_QUIET = { snapshot: true, saved: {}, tool: () => null, say() {}, pct() {}, saveCut() {}, onStage() {}, onOpened() {} };
// The replay shows how far the opening is, like the task page does, and ends with the seal.
function peachReplay(el, onReplayDone) {
  el.insertAdjacentHTML("beforeend", `<b class="replay-pct"></b>`);
  const pct = el.lastElementChild;
  return startPeach3D(el, {
    ...PEACH_QUIET, stage: "box", replay: S.peachRec || [], onReplayDone,
    pct: (text) => (pct.textContent = text),
    onEnding: () => el.insertAdjacentHTML("beforeend", stampHtml()),
  });
}

// A 3D view drawn off screen, for pictures and recordings.
function offscreenPeach(width) {
  const holder = document.createElement("div");
  holder.className = "stage3d";
  holder.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px`;
  document.body.append(holder);
  return holder;
}

// The finished mountain with its caption box, for the 卡片 picture.
async function peachStill() {
  await loadThree();
  const holder = offscreenPeach(600), view = startPeach3D(holder, { ...PEACH_QUIET, stage: "done" });
  for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
  const url = view.snapshot();
  holder.remove();
  return url;
}

// The replay is real-time 3D, so its frames are captured as it plays, with the tool and caption drawn on top.
async function peachSource() {
  await loadThree();
  const W = 360, holder = offscreenPeach(W);
  let done = false;
  const view = peachReplay(holder, () => (done = true));
  const gl = holder.querySelector("canvas"), H = Math.round((W * gl.height) / gl.width), frames = [];
  const t0 = performance.now();
  let capAt = null, popAt = null, stampAt = null;
  try {
    while (!done && performance.now() - t0 < 60000) {
      await new Promise((r) => requestAnimationFrame(r));
      const t = performance.now() - t0, f = newCanvas(W, H), g = f.getContext("2d");
      g.drawImage(gl, 0, 0, W, H);
      const mark = view.mark();
      if (mark) {
        g.font = "26px sans-serif"; g.textBaseline = "top";
        g.fillText(mark[2], mark[0] * W - 6, mark[1] * H - 34);
      }
      if (popAt === null && view.stage() === "mountain") popAt = t;
      const pct = holder.querySelector(".replay-pct").textContent;
      if (pct) {
        const fs = 0.042 * W, pw = (g.font = `700 ${fs}px "Noto Sans TC", sans-serif`, g.measureText(pct).width + 0.048 * W), ph = fs * 1.5;
        g.fillStyle = "rgba(0,0,0,.55)";
        g.beginPath(); g.roundRect(0.03 * W, 0.03 * W, pw, ph, ph / 2); g.fill();
        g.fillStyle = "#fff"; g.textBaseline = "middle"; g.textAlign = "left"; g.fillText(pct, 0.03 * W + 0.024 * W, 0.03 * W + ph / 2);
      }
      if (holder.querySelector(".peach-cap")) {
        capAt ??= t;
        const s = 0.42 + 0.58 * backOut(Math.min(1, (t - capAt) / 1000)), fs = 0.096 * W;
        g.save(); g.translate(W / 2, H * 0.45); g.scale(s, s);
        g.font = `900 ${fs}px "Noto Sans TC", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
        const tw = g.measureText(PEACH.caption).width;
        g.fillStyle = "#fff"; g.fillRect(-tw / 2 - 0.02 * W, -fs * 0.6 - 0.004 * W, tw + 0.04 * W, fs * 1.2 + 0.008 * W);
        g.fillStyle = "#111"; g.fillText(PEACH.caption, 0, 0); g.restore();
      }
      if (holder.querySelector(".card-stamp")) {
        stampAt ??= t;
        drawPostStamp(g, 0, 0, W, H, (t - stampAt) / 400);
      }
      frames.push([t, new Promise((r) => f.toBlob(r, "image/jpeg", 0.85))]);
    }
  } finally {
    holder.remove();
  }
  const canvas = newCanvas(W, H), g = canvas.getContext("2d");
  const render = async (time) => {
    const k = frames.findIndex(([t]) => t >= time), bmp = await createImageBitmap(await frames[k < 0 ? frames.length - 1 : k][1]);
    g.drawImage(bmp, 0, 0);
    bmp.close();
  };
  const end = frames[frames.length - 1][0], pop = popAt ?? end - 3500;
  return { canvas, duration: end, segment: [pop, pop + 2000], render }; // boomerang: the mountain popping up and the caption growing
}

async function cardSource(card) {
  if (card.anim === "gyoza") return gyozaSource();
  if (card.anim === "sansheng") return sanshengSource();
  if (card.anim === "peach") return peachSource();
  if (card.key === "meme") return recordMeme(false, null, true);
  if (card.key === "chat") return chatSource();
  throw new Error("not animated");
}

async function makeGif(src, onProgress) {
  const fps = 10, w = 320, h = Math.round((w * src.canvas.height) / src.canvas.width), out = newCanvas(w, h), g = out.getContext("2d", { willReadFrequently: true });
  const gif = new GifWriter(w, h, fps), n = Math.round((src.duration / 1000) * fps);
  for (let i = 0; i < n; i++) {
    await src.render((i * 1000) / fps);
    g.drawImage(src.canvas, 0, 0, w, h);
    gif.addFrame(g.getImageData(0, 0, w, h).data);
    onProgress(i / n);
    await new Promise((r) => setTimeout(r));
  }
  return { blob: new Blob([gif.finish()], { type: "image/gif" }), ext: "gif" };
}

// Plays the given times onto a canvas in real time while recording it.
async function makeVideo(src, times, onProgress) {
  const mime = pickMime(!!src.sounds), fps = 12;
  const w = Math.min(540, src.canvas.width), h = Math.round((w * src.canvas.height) / src.canvas.width), out = newCanvas(w, h), g = out.getContext("2d");
  if (!mime || !out.captureStream) throw new Error("no recorder");
  await src.render(times[0]); g.drawImage(src.canvas, 0, 0, w, h);
  const stream = out.captureStream(fps);
  // A card with sounds records them too, played into the video rather than out loud. Played forward only.
  const ac = src.sounds && window.AudioContext ? new AudioContext() : null, ear = ac && ac.createMediaStreamDestination();
  if (ac) {
    await ac.resume().catch(() => {});
    if (ac.state === "running") ear.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    // An inaudible hum keeps the sound track running between the sounds, so they stay in time with the picture.
    const hum = ac.createConstantSource();
    hum.offset.value = 0.0001;
    hum.connect(ear);
    hum.start();
  }
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000, audioBitsPerSecond: 96000 }), chunks = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start();
  for (let i = 0; i < times.length; i++) {
    await src.render(times[i]);
    g.drawImage(src.canvas, 0, 0, w, h);
    if (ac && i > 0) soundsBetween(src, times[i - 1], times[i]).forEach((kind) => cardSound(ac, ear, kind));
    onProgress(i / times.length);
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }
  if (ac) await new Promise((r) => setTimeout(r, 400)); // let the last sound ring out
  await new Promise((r) => { rec.onstop = r; rec.stop(); });
  if (ac) ac.close();
  return { blob: new Blob(chunks, { type: mime }), ext: mime.includes("mp4") ? "mp4" : "webm" };
}
const fullTimes = (src) => Array.from({ length: Math.round((src.duration / 1000) * 12) }, (_, i) => (i * 1000) / 12);
// Boomerang: the best moment forward, then backward, three times.
const boomTimes = ([a, b]) => {
  const fwd = Array.from({ length: Math.round(((b - a) / 1000) * 12) + 1 }, (_, i) => a + (i * 1000) / 12);
  const once = [...fwd, ...fwd.slice(1, -1).reverse()];
  return [...once, ...once, ...once];
};

function saveBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

const dlButtons = (i) => `<div class="dl-row">${Object.entries(DOWNLOAD.kinds).map(([k, label]) => `<button data-dl="${k}" data-i="${i}">${label}</button>`).join("")}</div>
  <p class="err dlmsg" role="status"></p>`;

async function runDownload(btn) {
  const card = CARDS[+btn.dataset.i], kind = btn.dataset.dl, row = btn.closest(".pcard"), msg = row.querySelector(".dlmsg");
  const buttons = [...row.querySelectorAll("[data-dl]")], say = (done) => (msg.textContent = `${DOWNLOAD.busy} ${Math.round(done * 100)}%`);
  buttons.forEach((b) => (b.disabled = true));
  msg.textContent = DOWNLOAD.busy;
  try {
    if (kind === "png") {
      let still = null;
      if (card.key === "meme") { const src = await cardSource(card); await src.render(2500); still = src.canvas.toDataURL("image/png"); }
      if (card.anim === "peach") still = await peachStill();
      if (card.key === "chat") { const src = await chatSource(); src.render(src.still); still = src.canvas.toDataURL("image/png"); }
      await downloadCard(card, still);
    } else if (kind === "video" && card.key === "meme") {
      const { blob, ext } = await recordMeme(true, say);
      saveBlob(blob, `${card.title}-${DOWNLOAD.kinds.video}.${ext}`);
    } else {
      const src = await cardSource(card);
      const { blob, ext } = kind === "gif" ? await makeGif(src, say) : await makeVideo(src, kind === "boom" ? boomTimes(src.segment) : fullTimes(src), say);
      saveBlob(blob, `${card.title}-${DOWNLOAD.kinds[kind]}.${ext}`);
    }
    msg.textContent = "";
  } catch {
    msg.textContent = DOWNLOAD.fail;
  }
  buttons.forEach((b) => (b.disabled = false));
}

async function downloadCard(card, still = null) {
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
  const src = still || card.img;
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
        ${dlButtons(i)}</li>`;
    }
    if (c.anim === "sansheng") {
      const sc = SANSHENG_CARD;
      return `<li class="pcard wide"><div class="ss-card" id="sscard" data-label="普渡供桌，香煙裊裊，打出「${sc.lines.join("，")}」，六樣三牲依序出現">
          <img src="${sc.bg}" alt="">
        </div><b>${c.title}</b><small>${c.text}</small>
        ${dlButtons(i)}</li>`;
    }
    if (c.anim === "gyoza") {
      const gc = GYOZA_CARD, stick = (d) => `<path d="${d}" stroke="#3a2a1a" stroke-width="6"/><path d="${d}" stroke="#f3c98b" stroke-width="4"/>`;
      return `<li class="pcard wide"><div class="gz-card" id="gzcard">
          <img src="${gc.bg}" alt="8包煎餃拼到底看板前，兩個手繪人物：一個用筷子丟煎餃，另一個舉著8號牌接住吃掉">
          <div class="gz-fig gz-a" id="gzA"><img src="${gc.a}" alt="">
            <svg class="gz-chop" id="gzchop" viewBox="0 0 100 60" overflow="visible" aria-hidden="true">
              <g stroke-linecap="round">${stick("M6 6 L86 34")}<g id="gzstickB">${stick("M4 16 L84 42")}</g></g>
              <g id="gzheld" transform="translate(88 38) rotate(18) scale(.5) translate(-32 -26)">${foodSvg("gyoza")}</g>
              <circle id="gztip" cx="88" cy="38" r=".1" fill="none"/>
            </svg></div>
          <div class="gz-fig gz-8" id="gz8"><img src="${gc.eight}" alt="">
            <svg class="gz-sign" viewBox="-4 -4 208 208" aria-hidden="true">
              <defs><clipPath id="gztop"><rect width="200" height="101"/></clipPath><clipPath id="gzbot"><rect y="101" width="200" height="99"/></clipPath></defs>
              <circle cx="100" cy="100" r="99" fill="#fff" stroke="#111" stroke-width="4"/>
              <circle cx="100" cy="100" r="84" fill="none" stroke="#d33a3a" stroke-width="7"/>
              ${["top", "bot"].map((h) => `<g id="gz${h}"><text clip-path="url(#gz${h})" x="100" y="104" text-anchor="middle" dominant-baseline="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="118" fill="#d33a3a">8</text></g>`).join("")}
              <circle id="gzmouth" cx="100" cy="101" r=".1" fill="none"/>
            </svg></div>
          ${stampHtml('id="gzstamp" hidden')}
        </div><b>${c.title}</b><small>${c.text}</small>
        ${dlButtons(i)}</li>`;
    }
    if (c.anim === "peach") {
      return `<li class="pcard wide"><div class="stage3d card-stage" id="cardpeach"><span class="card-fallback">🍑</span></div><b>${c.title}</b><small>${c.text}</small>
        ${dlButtons(i)}</li>`;
    }
    if (c.key === "chat") {
      return `<li class="pcard wide"><div class="ss-card" id="chatcard" data-label="和${CHAT.name}的對話重播，最後問了提示"></div><b>${c.title}</b><small>${c.text}</small>
        ${dlButtons(i)}</li>`;
    }
    const pic = c.img ? `<img src="${c.img}" alt="">` : "";
    return `<li class="pcard"><div class="face">${pic || c.emoji || "✉"}</div><b>${c.title}</b><small>${c.text}</small>
      <button class="btn" data-i="${i}">下載卡片</button></li>`;
  }).join("");
  shell("支線任務", "下載專區", `
    <p class="notice">已解鎖 ${count} / ${CARDS.length} 張。完成任務就能解鎖新卡片。</p>
    <ul class="pcards">${items}</ul>`);
  app.querySelectorAll("[data-i]:not([data-dl])").forEach((b) => {
    b.onclick = () => downloadCard(CARDS[+b.dataset.i]);
  });
  if (document.getElementById("dlfront")) paintCardFront(document.getElementById("dlfront"));
  if (document.getElementById("gzcard")) playGyozaCard(document.getElementById("gzcard"));
  if (document.getElementById("sscard")) playCanvasCard(document.getElementById("sscard"), sanshengSource).catch(() => {});
  if (document.getElementById("chatcard")) playCanvasCard(document.getElementById("chatcard"), chatSource).catch(() => {});
  const peachEl = document.getElementById("cardpeach");
  if (peachEl) {
    loadThree().then(() => {
      if (!peachEl.isConnected) return;
      // Plays her opening from the start, then again on a fresh view.
      const loop = () => {
        if (!peachEl.isConnected) return;
        peachEl.replaceChildren();
        peachReplay(peachEl, () => setTimeout(loop));
      };
      loop();
    }).catch(() => {});
  }
  app.querySelectorAll("[data-dl]").forEach((b) => {
    b.onclick = () => runDownload(b);
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

const chatBubble = (m) => `<p class="${m.me ? "me" : "them"}">${esc(m.text).replace("[?]", `<button type="button" class="clue-q chat-q" data-chatq aria-label="我要提示">?</button>`)}</p>`;
// waiting: the 客服 is still being connected, then types its greeting (see renderMobile).
function chatPanel(waiting) {
  const log = waiting ? `<p class="sys" id="chatsys">${CHAT.connecting}<i class="dots"></i></p>` : [{ text: CHAT.greeting }, ...S.chat].map(chatBubble).join("");
  return `
    <div class="chat">
      <div class="chathead">${CHAT.name}</div>
      <div class="log" id="log" role="log">${log}</div>
      <div class="chips">${CHAT.chips.map((c) => `<button type="button">${c}</button>`).join("")}</div>
      <form id="say"><label for="msg">訊息</label><input id="msg" autocomplete="off"><button>傳送</button></form>
    </div>`;
}

// moving: her first visit, where the queue moves up instead of being paused (see renderMobile).
function queuePanel(moving = false) {
  const [from, to] = CHAT.onlineHours;
  const waited = ((senderHour() - to + 24) % 24) / (24 - (to - from));
  const pct = moving ? 30 : Math.round(Math.min(Math.max(waited, 0.1), 0.95) * 100);
  const hhmm = (h) => `${String(h).padStart(2, "0")}:00`;
  return `
    <div class="queue">
      <div class="q-notice"><span>公告</span><p>客服下班期間進入之用戶，系統將依<b>隨機取號</b>方式分配號碼，並依號碼順序安排對話。請保持此頁面開啟，無須重新整理。</p></div>
      <div class="q-card">
        <div class="q-logo"><span class="emblem">室</span><b>室友郵政</b></div>
        <h3>當前您正在排隊等候中</h3>
        <p class="q-why">您正在 ${CHAT.name} 排隊等候。當輪到您時，您有 10 分鐘進入對話，若超過時效未進入須重新排隊取號。</p>
        <details><summary>這是什麼？</summary><p>${CHAT.name}下班了。服務時間為每天 ${hhmm(from)}–${hhmm(to)}（台灣時間）。</p></details>
        <div class="q-track"><div class="q-pill"><div class="q-bar" id="qbar" style="width:${pct}%"><i class="q-person"></i></div></div></div>
        <div class="q-status">
          <p id="qstate">${moving ? `${CHAT.queueMoving}<br><b id="qahead">${CHAT.queueAhead.replace("{n}", 3)}</b>` : "隊列已暫停"}</p>
          <p class="q-time"><i class="q-dot"></i>最近更新狀態：<span id="qclock">${new Date().toLocaleTimeString("zh-TW")}</span></p>
        </div>
        <p class="q-id"><b>隊列 ID：</b>${S.queueId}</p>
      </div>
    </div>`;
}

// afterQueue: her first visit's queue has just reached her, so the chat opens whatever the hour,
// and stays open until the page is reloaded (putThrough), even if she's outside the 客服's hours.
let putThrough = false;
function renderMobile(afterQueue = false) {
  clearInterval(timer);
  if (afterQueue) putThrough = true;
  const first = !S.chatSeen && !afterQueue;
  const online = putThrough || (!first && senderOnline());
  // Just put through, or a chat with no history yet: the 客服 is connected first, then types its greeting.
  const waiting = online && (afterQueue || !S.chat.length);
  shell("支線任務", "行動郵局", `
    ${online ? chatPanel(waiting) : queuePanel(first)}
    <h3 class="group">儲存進度</h3>
    <p class="small">把目前進度存成一個檔案。手機上可從分享選單選擇 Google 雲端硬碟；換裝置時再讀取這個檔案。</p>
    <button class="btn" id="saveit">儲存進度檔</button>
    <label class="btn alt upload">讀取進度檔<input id="loadit" type="file" accept=".txt,text/plain" hidden></label>
    <p class="err" id="err" role="alert"></p>
    <button class="reset" id="reset">清除紀錄，從頭開始</button>`);
  if (first) {
    // The queue moves up one by one, then she's put through to the 客服.
    const bar = document.getElementById("qbar");
    [3, 2, 1, 0].forEach((n, i) => setTimeout(() => {
      if (!bar.isConnected) return;
      bar.style.width = `${30 + (70 * i) / 3}%`;
      document.getElementById("qstate").innerHTML = n ? `${CHAT.queueMoving}<br><b>${CHAT.queueAhead.replace("{n}", n)}</b>` : `<b>${CHAT.queueTurn}</b>`;
      if (!n) setTimeout(() => {
        if (!bar.isConnected) return;
        S.chatSeen = true;
        save();
        renderMobile(true);
      }, 1100);
    }, 400 + i * 1300));
  }
  // The queue opens by itself when the online hours start, as the notice promises.
  timer = setInterval(() => {
    if (!first && !putThrough && senderOnline() !== online) return render();
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
    logEl.onclick = (e) => {
      if (e.target.closest("[data-chatq]")) send(CHAT.chips[0]);
    };
    if (waiting) {
      setTimeout(() => {
        if (!logEl.isConnected) return;
        document.getElementById("chatsys").textContent = CHAT.connected;
        logEl.insertAdjacentHTML("beforeend", `<p class="them typing" aria-label="輸入中"><i></i><i></i><i></i></p>`);
        setTimeout(() => {
          if (!logEl.isConnected) return;
          logEl.querySelector(".typing").outerHTML = chatBubble({ text: CHAT.greeting });
        }, 900);
      }, 1600);
    }
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

// RPG questions fold like the other FAQ entries. One she unfolds, or the game takes her to, stays open across redraws.
const cardQOpen = new Set();
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
    <details class="card-q" id="cq-${id}" data-cq="${id}" ${cardQOpen.has(id) ? "open" : ""}>
      <summary>${q.text}</summary>
      ${ans ? "" : `<div class="q-row q-tools">${clueButton(`ch-${id}`, shown >= STUDENT_CARD.hints.length)}</div>`}
      ${ans ? `<p class="small">你的回答：${ans === "yes" ? "是" : "否"}</p>` : `
        <div class="yn"><button data-yn="yes" data-q="${id}">是</button><button data-yn="no" data-q="${id}">否</button></div>
        ${clueList(`ch-${id}`, STUDENT_CARD.hints, shown)}`}
      ${ans && !right ? `<p class="err">${STUDENT_CARD.wrong}</p>` : ""}
      ${ans && !right && !q.next ? `<p>${STUDENT_CARD.failed}</p><button class="btn alt" id="cardrestart">${STUDENT_CARD.restart}</button>` : ""}
      ${right && !c.won ? form : ""}
    </details>`;
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
      ${stampHtml('style="animation-delay:1.2s"')}
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
  // She only reaches this sequence by getting the last question right. After 叫你不記名 the cats have said enough.
  if (answered[answered.length - 1] !== "unnamed") steps.push({ who: "right", text: m.praise[answered.length - 1], cards: [] });
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
    <button class="meme-sound" id="memesound" aria-pressed="true">🔊 ${m.sound}</button>
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

  // The cats talk with sound. A browser that blocks sound until a tap gets the cat muted, so it still moves,
  // and the button turns red; tapping it turns the sound on for every cat.
  let active = null;
  const soundBtn = document.getElementById("memesound");
  const showSound = (on) => {
    soundBtn.textContent = `${on ? "🔊" : "🔇"} ${m.sound}`;
    soundBtn.setAttribute("aria-pressed", String(on));
  };
  const play = (v) => v.play().catch(() => {
    v.muted = true;
    showSound(false);
    return v.play().catch(() => {});
  });
  soundBtn.onclick = () => {
    const on = soundBtn.getAttribute("aria-pressed") !== "true";
    showSound(on);
    Object.entries(cats).forEach(([who, cat]) => {
      cat.v.muted = !on;
      if (!on) return;
      if (who === active) cat.v.play().catch(() => {});
      else cat.v.play().then(() => who !== active && cat.v.pause(), () => {}); // played once from a tap, the browser allows its sound later
    });
  };

  const finish = () => {
    clearTimeout(memeTimer);
    Object.values(cats).forEach((cat) => cat.v.pause());
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
    soundBtn.hidden = true;
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
    active = step.clip || step.who;
    Object.entries(cats).forEach(([who, cat]) => {
      if (who === active) {
        if (cat.v.paused && step.clip) cat.v.currentTime = 0; // starts from the top, stays running across its lines
        play(cat.v);
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
async function recordMeme(full, onProgress, asSource = false) {
  const c = S.card, sc = STUDENT_CARD, m = sc.meme, W = 566, H = 800;
  // The full video carries the cats' sound, so it asks for a format with audio first.
  const mime = [...(full ? ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus"] : []), "video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"]
    .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  // The cats' sound is routed into the recording through Web Audio, not out of the speakers.
  const audio = full && !asSource && window.AudioContext ? new AudioContext() : null;
  const sound = audio && audio.createMediaStreamDestination();
  const playCat = (v) => v.play().catch(() => {
    v.muted = true; // blocked with sound: the cat still moves, the video is just quieter
    return v.play().catch(() => {});
  });
  const canvas = document.createElement("canvas");
  if (!asSource && (!mime || !canvas.captureStream)) throw new Error("no recorder");
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
      v.muted = !sound;
      v.loop = true;
      v.playsInline = true;
      v.src = m[who];
      if (sound) audio.createMediaElementSource(v).connect(sound);
      const layer = document.createElement("canvas");
      layer.width = cw;
      layer.height = 360;
      cats[who] = { v, layer };
      // A video that hasn't played has no picture to copy yet, so run each one briefly.
      const ready = async () => {
        await playCat(v);
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
    drawPostStamp(g, -w / 2, -h / 2, w, h, (ms - 1200) / 400);
    g.translate(w * -0.01, h * 0.06);
    g.rotate((-14 * Math.PI) / 180);
    const cw = w * 0.56, ch = (cw * 409) / 657, turn = Math.cos((ms / MEME_END_MS) * Math.PI * 2), wide = (cw * Math.abs(turn)) / 2;
    g.fillStyle = "#9a9a9a";
    g.fillRect(-wide - 2, -ch / 2, wide * 2 + 4, ch);
    g.drawImage(turn > 0 ? front : backs[c.won], -wide, -ch / 2, wide * 2, ch);
    g.restore();
  };

  if (asSource) return { canvas, duration: MEME_END_MS, segment: [0, 1500], render: drawEnding };
  const talkMs = steps.reduce((sum, step) => sum + memeStepMs(step), 0);
  const appMs = full ? MEME_APP_MS : 0, total = talkMs + appMs + MEME_END_MS;
  if (full) drawTalk(steps[0]);
  else drawEnding(0);
  const stream = canvas.captureStream(24);
  if (sound) {
    await audio.resume().catch(() => {});
    if (audio.state === "running") sound.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  }
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000, audioBitsPerSecond: 96000 });
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
        if (audio) audio.close();
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
              playCat(cat.v);
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
    cardQOpen.add(id);
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
  app.querySelectorAll("[data-cq]").forEach((d) => {
    d.ontoggle = () => (d.open ? cardQOpen.add(d.dataset.cq) : cardQOpen.delete(d.dataset.cq));
  });
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
    <ol class="timeline">${TRACKING.map(([date, office, status, note]) => {
      const n = typeof note === "string" ? note : S.card.won && S.dormNamed ? note.all : note.some;
      const [who, text] = n.includes("：") ? [n.slice(0, n.indexOf("：")), n.slice(n.indexOf("：") + 1)] : ["", n];
      return `<li><span>${date}・${office}</span><b>${status}</b>${n ? `<p class="note">${who ? `<em>${who}</em>` : ""}${text}</p>` : ""}</li>`;
    }).join("")}</ol>
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
      <details class="edits">
        <summary>${ENDING.edited}・<u>${ENDING.editLabel}</u></summary>
        <h3>${ENDING.editsTitle}</h3>
        <ol>${[{ at: `${ENDING.edited}（${ENDING.editsNow}）`, text: ENDING.letter[1] }, ...ENDING.edits].map((v) => `<li><time>${v.at}</time><p>${v.text.replace(/\n/g, "<br>")}</p></li>`).join("")}</ol>
      </details>
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
let timer, legendTimer, peachRecAt = -1e9, scrollAfterRender = null;
function render() {
  clearInterval(timer);
  clearInterval(legendTimer);
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
