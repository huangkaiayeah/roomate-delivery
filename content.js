// All game content lives here. Search for 【 to find what still needs filling in.
const CONFIG = {
  recipient: "阿如",
  sender: "KU",
  city: "日本橫濱",
  parts: ["0719", "2829", "1106"], // tracking number pieces, in the same order as TASKS
  unlockAt: "2026-11-06T00:00:00+09:00", // midnight Japan time
  version: "1.18.2", // shown in the footer; raise it with each upload
};

// Search page wording
const HOME = {
  notice: `${CONFIG.recipient} 君：您有一件代領取之國際包裹。包裹號碼因寄件人失誤暫且遺失，須由收件人協助完成運輸追蹤，以覓得包裹之完整號碼。`,
  ladder: "爬梯子抽路線",
  ladderStart: "將透過爬梯子方式，隨機解鎖一段包裹運送路線。",
};

// The three tasks at the bottom of the ladder. Each one gives one tracking number piece and one card.
const TASKS = {
  eat: { n: 0, title: "8包煎餃拼到底", desc: "30 秒內，用筷子夾到並吃完 8 顆煎餃" },
  open: { n: 1, title: "急件開箱任務", desc: "報稅期間來了一箱客戶急件，請立即處理" },
  match: { n: 2, title: "三牲連連看", desc: "收集散落各處的雞、豬、魚，放回正確的位置" },
};

// Eat task: each chef cooks random food in their own pan. Times are seconds since the food went in:
// ready = can be eaten, burnt = turns black, gone = disappears.
const FRY = {
  goal: 8,
  seconds: 30,
  panSize: 3,
  chefDelay: [0.5, 1.5], // seconds a chef waits before cooking again, when the pan has room
  foods: {
    gyoza: { name: "煎餃", ready: 2.5, burnt: 5, gone: 5.5 },
    xlb: { name: "小籠包", ready: 4, burnt: 6, gone: 6.5 },
    bun: { name: "水煎包", ready: 5, burnt: 7, gone: 7.5 },
  },
  intro: "三位廚師會隨機下鍋煎餃、小籠包和水煎包。煎熟後點一下，用筷子夾起來吃掉。30 秒內吃完 8 顆煎餃就過關，燒焦的不算數。",
  // The animated legend above 開始: each food cycles through these three looks.
  states: { raw: "還沒熟", ready: "熟了", burnt: "臭火搭" },
  start: "開始",
  retry: "再來一次",
  raw: "還沒熟！",
  got: "好吃！",
  notGyoza: "這不是煎餃，不算喔。",
  burnt: "燒焦了，不算數！",
  timeUp: "時間到！",
};

// Box task: a sealed box of "customer documents" hides the peach bun tower, like the real prank.
const PEACH = {
  boxIntro: "報稅期間，您的辦公桌上多了一箱客戶急件。請沿著膠帶割開。可切換角度，兩側也有膠帶。",
  needTool: "徒手拆不開。打開右下角的郵便箱拿工具；還沒有工具的話，去宿舍郵局或北大郵局的「失物招領」找找。",
  boxOpened: "箱子打開了。裡面不是客戶文件……",
  towerIntro: "實為壽桃塔。用工具沿紅色虛線割開透明膜，或用手指按住蝴蝶結來回拉開。開封超過一半，壽桃就會掉出來。",
  bowPull: "繼續拉，蝴蝶結快鬆開了。",
  dropping: "壽桃掉出來了！",
  after: "祝您福壽雙全，報稅順利。",
  label: "客戶發票・憑證",
  sublabel: "急件　報稅期間請立即處理",
  img: "assets/peach-tower-real.jpg",
  emblem: "assets/shou-gold.png",
  caption: "福如東海🍑壽比南山",
  alt: "當年送到辦公桌的壽桃塔：透明玻璃紙包著一層層壽桃，正面是金色壽字，頂端有橘紅色蝴蝶結，底座是紅色圓桶",
};

// Tools she collects from 失物招領 on the post office pages. Either one can do the cutting.
const TOOLS = {
  scissors: { name: "剪刀", icon: "✂️" },
  knife: { name: "美工刀", icon: "🔪" },
};
const BAG = {
  empty: "【提醒】郵便箱目前是空的。如需拆封工具，可至宿舍郵局或北大郵局的「失物招領」查詢。",
  filled: "【提醒】請選擇要取出的工具。使用完畢可放回郵便箱，以維護個人及包裹安全。",
  more: "前往宿舍郵局",
  noLog: "尚無處理紀錄。領取物品或完成任務後，會顯示在這裡。",
};
// 學生證補辦RPG in 北大郵局: the back she picks decides which question opens first.
// talk / said / after are the cats' lines in the meme: question, her answer, then the tabby's reaction.
// Each question takes one answer. Right: fill in the form and get the card with that question's back. Wrong: next opens.
const STUDENT_CARD = {
  question: "依據直覺選一個學生證背面",
  backs: {
    old: { img: "assets/student-card-back-old.jpg", first: "sameDay", name: "舊版背面" },
    new: { img: "assets/student-card-back-new.jpg", first: "refund", name: "現行背面" },
  },
  front: "assets/student-card-front.jpg",
  formImg: "assets/student-card-form.jpg",
  hints: [
    "可以上國立臺北大學教務處查查",
    `<a href="assets/student-card-form.pdf" download="國立臺北大學學生證掛失補換發申請單.pdf">下載學生證掛失／補（換）發申請單 PDF</a>`,
  ],
  questions: {
    sameDay: { text: "補辦學生證可以當天拿到嗎？", answer: "yes", next: "noPhoto", back: "old",
      talk: "當天拿得到\n你補辦的學生證嗎？",
      said: { yes: ["必須行"], no: ["咦咦不行吧\n(緩緩打出一個問號)"] },
    },
    noPhoto: { text: "補辦學生證可以不放照片嗎？", answer: "yes", next: "unnamed", back: "old",
      talk: "補辦學生證\n有一定要照片嗎？",
      said: { yes: ["免"], no: ["可以不用放喔(?)"] },
      after: { no: "😄(和善的笑)" },
    },
    refund: { text: "補辦學生證後，卡裡餘額也可以當天退回嗎？", answer: "no", next: "unnamed", back: "new",
      talk: "拿到補辦的學生證那天\n$就回來了嗎？",
      said: {
        yes: ["應該...可能...也許有機會吧(?)"],
        no: ["(看向窗外貌)\n寒葉飄逸 灑滿我的臉", "吾兒叛逆 傷痛我的心\n你講的話像是......"],
      },
      after: { no: "偷業配 警告1次" },
    },
    unnamed: { text: "遺失學生證沒記名，還能拿回卡裡餘額嗎？", answer: "no", next: null, back: "new",
      talk: "學生證沒記名\n餘額拿得回來嗎？",
      said: { yes: ["可以ㄅ"], no: ["喔不!!!!!!!!!", "我的學生證!\n50塊!!!(詳見我ㄉ豆花meme)"] },
      // Empty second line (\u200b) keeps the first from jumping when the second appears.
      fight: { no: ["叫你不記名\n\u200b", "叫你不記名\n叫你不記名"] },
    },
  },
  wrong: "答錯了，這題不能重答。",
  failed: "申請遭到退回。請按下方按鈕重新申請。",
  restart: "重新申請",
  right: "答對了！請填寫申請單。",
  privacy: "資料只留在你的手機，不會傳到任何地方。",
  reasons: ["掛失（補辦新卡）", "損毀（補辦新卡）", "轉系", "更名"],
  stamp: ["室友", "郵政"],
  // White boxes on the front image, in its pixels: x, y, width, height. Photo size is what uploads get cropped to.
  frontBoxes: { photo: [79, 52, 104, 145], name: [79, 231, 104, 33], id: [79, 279, 104, 33], dept: [79, 340, 254, 38] },
  photoLabel: "學生證照片（可不放）",
  meme: {
    // The opening question appears in two beats; each beat adds one card.
    opening: [
      { text: "你掉的學生證\n有貼紙？", cards: ["old"] },
      { text: "你掉的學生證\n有貼紙？還沒貼紙？", cards: ["old", "new"] },
    ],
    answers: { old: "有貼紙", new: "沒貼紙" },
    // Between her answer above and the first real question. ms sets how long a line stays up.
    intro: [
      { text: "誠實的好孩子" },
      { text: "但問題要回答正確\n才能給你學生證" },
      { text: "Ready?\n\u200b", ms: 900 }, // the empty second line keeps Ready? from jumping when Go!!!! appears
      { text: "Ready?\nGo!!!!", ms: 1100 },
    ],
    // By how many questions she answered; at most 3 are possible. Wrong answers can only be the 1st and 2nd.
    wrong: ["蛤？", "大蛤特蛤"],
    praise: ["很棒麻~~~\n一題成功", "唉呦不錯喔👍\n(周杰倫語氣)", "恭喜通關\n(說了一些讚美的話)"],
    right: "assets/meme-right.mp4",
    what: "assets/meme-right-what.mp4",
    fight: "assets/meme-right-fight.mp4",
    left: "assets/meme-left.mp4",
    background: "assets/meme-background.png", // behind the cats' conversation only
    ending: "assets/meme-end.jpg",
    claim: "收下學生證",
    skip: "略過",
    sound: "聲音", // the 🔊 / 🔇 button; browsers that block sound until a tap start muted
    endText: "人類拿去玩",
    replay: "再看一次動畫",
  },
};

// 不具名的宿舍 in 北大郵局: both logins must be right, then the news blank fills itself.
const DORM_VOTE = {
  site: "數位學苑 2.0",
  title: "國立臺北大學 二期宿舍命名活動",
  heading: "宿舍名投票結果",
  nameLabel: "提議宿舍名：",
  votesLabel: "最終票數：",
  denied: "票數皆為0！請先輸入數字",
  hints: [
    "可以Google「是在哈樓 臺北大學」找到相關內容",
    `新聞底家：<a href="https://news.ltn.com.tw/news/life/breakingnews/3042904" target="_blank" rel="noopener">https://news.ltn.com.tw/news/life/breakingnews/3042904</a>`,
  ],
  wrong: "權限不足!",
  ok: "登入成功",
  submit: "確定",
  logins: [
    { key: "hall", label: "是在哈樓", votes: 715 },
    { key: "dorm", label: "辰曦樓", votes: 371 },
  ],
  table: [
    ["社群名稱", "國立臺北大學 二期宿舍命名活動"],
    ["閱讀權限", "限登入者"],
    ["精華區權限", "不開放"],
    ["版主", "KU"],
    ["副版主", "系統管理者"],
  ],
  description: [
    "緣起……",
    "親愛的師長同仁、同學們～",
    "冬陽朗朗、光陽普照，所謂「萬丈高樓平地起」，經過心湖宿舍區，可曾留意本校二期宿舍已由基地粗胚、日復一日逐漸成形？",
    "為加深本校同學對學生宿舍之認識及認同感，並因應新建二期宿舍預計於民國109學年度正式啟用，特舉辦「命名投稿及票選活動」，以期發揮群體創意，集思廣益，共同賦予原一期宿舍（皓月樓、繁星樓、曉日樓）之外，與新建二期宿舍別具內涵且賦獨特韻味之名稱。",
    "因此，誠摯邀請所有「北大人」運用靈活巧思、集體發想一個可以為宿舍訴說源遠流長故事意涵之名字。臺北大學的歷史腳步，正一步步往前行……邀請您共同參與、共同創造！！",
  ],
};

// The two local post offices. Each service tile is a dropdown; one option in 失物招領 holds a tool.
const OFFICES = {
  dorm: {
    title: "宿舍郵局",
    en: "Dorm Post Office",
    hero: "assets/dorm-hero.jpg",
    caption: "噹~噹~噹~噹~~每天配著北大高中的鐘聲起床，又是美好的一天。",
    branches: ["北大愛悅支局", "客廳支局", "廚房支局"],
    news: [
      ["115/11/06", "本日有貴客蒞臨，請各部門密切注意生日應援の響應時間！"],
      ["108/12/28", `【${CONFIG.recipient}特別提醒】赴韓參加12/31 EXO演唱會之航班為凌晨5點，請${CONFIG.sender}出門前再次默念：手機錢包護照鑰匙！`],
    ],
    services: [
      { icon: "✉", name: "郵件", options: [{ label: "待領信件", text: "查無信件。這年頭只有寄件人會寄奇怪的東西給您。" }, { label: "晚間投遞", text: "本局晚間只投遞宵夜。" }] },
      { icon: "?", name: "失物招領", options: [{ label: "一疊宵夜收據", text: "收據已褪色，但熱量仍在。" }, { label: "一把剪刀", tool: "scissors" }, { label: "一雙不成對的拖鞋", text: "另一隻下落不明。" }] },
      { icon: "▣", name: "集郵", options: [{ label: "紀念戳章", text: "今日戳章：生日快樂。" }, { label: "限量郵票", text: "已售完，寄件人買走了全部。" },
        {
          label: "抓豬",
          icon: "pork2",
          pick: {
            question: "今年仁川機場有一場針對NCT成員的抓豬行動，請問是哪位公費戀愛的男idol被抓？",
            a: { label: "NCT 李楷燦", img: "assets/lee-haechan.jpg" },
            b: { label: "NCT 文泰一", img: "assets/moon-taeil.jpg" },
            correct: "a",
          },
        }] },
      { icon: "$", name: "計價", options: [{ label: "室友欠款查詢", text: `比起${CONFIG.recipient}，寄件人比較常因為忘帶錢包欠款(汗💦)
一天又平安的過去了，感謝室友錢包的努力！` }, { label: "存款利率", text: "本局利率依友情浮動。" },
        {
          label: "燒餅價目查詢",
          icon: "pork1",
          ask: {
            question: "請問東區圍爐酸菜白肉鍋的燒餅多少摳？",
            img: "assets/shaobing.jpg", // shown under the question
            alt: "一盤兩個撒滿芝麻的燒餅，後面是酸菜白肉鍋",
            answer: ["70", "seventy", "七十", "柒拾"],
            hints: ["兩位數，比 60 多、比 80 少。"],
          },
        }] },
    ],
    faq: [
      ["晚歸需要先報備嗎？", "室友已經睡了，請放輕腳步。"],
      ["BoA最新發行的日專(2026/11/25)的專輯名稱是？", "歩幅"],
    ],
    charity: [
      ["【在地情】收留忘記帶鑰匙的室友", "開門服務，全年無休。"],
      ["【微公益】宵夜分享計畫", "您吃一口，我吃一口。"],
    ],
  },
  ntpu: {
    title: "北大郵局",
    en: "NTPU Post Office",
    hero: "assets/meme-background.png",
    dormName: "辰曦樓", // fills the ___ in the news once she solves 不具名的宿舍
    caption: "露營、遛狗好去處，歡迎闔家光臨的北大公園！",
    branches: [`<button class="inline-link" data-go="newsdorm">是在哈樓</button>支局`, "圖書館支局", "學餐支局"],
    news: [
      // 4th field: "card" = only after 學生證補辦RPG, "!card" = only before it, "dorm" = only after the dorm is named
      ["115/11/06", "【重要！！】近期查獲多起冒用本局學生身分之宵小，近期將嚴格控管學生證發放", "", "!card"],
      ["115/11/06", `蒙校友${CONFIG.recipient}特返本局賀其誕辰，蓬蓽生輝，不勝榮幸`, "", "card"],
      ["109/01/16", "狂賀！本局新宿舍樓建成，並以___為宿舍名", "newsdorm"],
      ["109/01/16", "恭喜 辰曦樓 以371票力壓715票的 是在哈樓成為本局二期宿舍名稱", "newsvote", "dorm"],
    ],
    services: [
      { icon: "✉", name: "郵件", options: [{ label: "成績單", text: "作為本校榮譽校友，當然是87分不能更高了。" }, { label: "校友通知", text: "您已畢業。真的。" }, { label: "中超沙其馬", icon: "chicken1" }] },
      { icon: "?", name: "失物招領", options: [{
          label: "不具名的宿舍",
          dorm: true,
        }, { label: "一支沒水的原子筆", text: "期末考時發現的，太遲了。" }, { label: "一把美工刀", tool: "knife" }] },
      { icon: "▣", name: "集郵", options: [{ label: "校園風景戳", text: "今日戳章：三峽，晴時多雨。" }, { label: "學生證補辦RPG", card: true }, { label: "畢業紀念郵票", text: "畢業當然要快樂啊！" }, { label: "魚類紀念郵票", icon: "fish1" }] },
      { icon: "$", name: "計價", options: [{ label: "學費繳納", text: "您已繳清。如有疑問，會建議等求償時效過後，再行詢問。" }, { label: "打工薪資", text: "已全數換成宵夜。" }, {
          label: "雞排捐款",
          icon: "chicken2",
          text: `50摳小額捐款。\n某次ubereat外送員車禍，${CONFIG.recipient}載我去跟外送員拿雞排時，經過一番極限推拉後，獲贈的一枚銅板。\n最終，我們把50摳樂捐到飲料店的捐款箱。`,
        }] },
    ],
    faq: [
      ["校友可以回來寄信嗎？", "可以，但本局認得您的筆跡。"],
      { cardQ: "sameDay" },
      { cardQ: "noPhoto" },
    ],
    charity: [
      ["【在地情】代買學餐", "排隊服務，限室友。"],
      ["【心服務】考前叫醒", "叫了三次，您都說「再五分鐘」。"],
      { cardQ: "refund" },
      { cardQ: "unnamed" },
    ],
  },
};

// Match task: six icons are scattered around the site; each goes on a product of the same kind.
const ICONS = {
  chicken1: { type: "chicken", emoji: "🐔", name: "雞" },
  chicken2: { type: "chicken", emoji: "🐔", name: "雞" },
  pork1: { type: "pork", emoji: "🐷", name: "豬" },
  pork2: { type: "pork", emoji: "🐷", name: "豬" },
  fish1: { type: "fish", emoji: "🐟", name: "魚" },
  fish2: { type: "fish", emoji: "🐟", name: "魚" },
};
const MATCH = {
  intro: "這是當年寄到英國宿舍的六樣三牲。請把郵便箱裡的雞、豬、魚放到你認為正確的位置：點一下圖示再點格子，或直接拖過去。放錯可以再移動，放好後按送出。",
  missing: "郵便箱裡的三牲還不夠。到北大郵局、宿舍郵局和查詢專區找找。",
  notSubmitted: "六樣都放好並送出一次之後，才能查看提示。",
  wrong: "還不完全正確，再想想。",
  slots: [
    { type: "chicken", img: "assets/match-1.jpg", alt: "雞蛋沙琪瑪" },
    { type: "pork", img: "assets/match-2.jpg", alt: "香脆豬肉鬆" },
    { type: "fish", img: "assets/match-3.jpg", alt: "魚乾" },
    { type: "chicken", img: "assets/match-4.jpg", alt: "素雞罐頭" },
    { type: "pork", img: "assets/match-5.jpg", alt: "美味脆豬皮" },
    { type: "fish", img: "assets/match-6.jpg", alt: "魚罐頭與紅色金紙" },
  ],
};

// Hidden on the search page: a small fish that opens this fill-in-the-blank.
const FISH_BLANK = {
  icon: "fish2",
  before: "人有洋節",
  after: "，吾等普渡平安 double win",
  answer: ["helloween"],
  hints: ["可以從我的精選限動找找", "精選限動【福如東海🍑壽比南山】"],
};

// Shown once she finishes the match task, so it can't spoil the answers. Also the picture on her card.
const UK_EVIDENCE = {
  img: "assets/uk-offering.jpg",
  alt: "寄件人當年的訊息截圖：普渡供桌配上「人有洋節 helloween，吾等普渡平安 double win」，下方是華人超市買的雞、豬、魚兩組：沙琪瑪、豬肉鬆、魚乾，以及素雞罐頭、豬皮、魚罐頭。",
  caption: "證物：外國月亮沒有比較圓，常懷臺灣初心不改，與之共勉。",
};

// eight 來eight 棒 card: character A throws 8 煎餃 and the 8 sign eats them; each one eaten joins a ring around its head.
// ring: % of the picture (r is % of the width). bg / a / eight: the background and the two drawn characters as layers.
const GYOZA_CARD = {
  ring: { x: 64.9, y: 61.5, r: 23.0 }, // r is % of the width
  tall: 1.3333, // picture height / width
  bg: "assets/gyoza-bg.jpg",
  a: "assets/gyoza-a.png",
  eight: "assets/gyoza-8.png",
};

// 中超style 三牲 card: two lines appear on the 普渡 scene, then the six products pop in. [picture, left %, top %, width %]
const SANSHENG_CARD = {
  bg: "assets/sansheng-bg.jpg",
  lines: ["人有洋節helloween", "吾等普渡平安double win"], // typed out one character at a time
  // [picture, x %, y %, width %, which MATCH.slots it is]. They pop in in the order she placed them in 三牲連連看.
  items: [
    ["assets/sansheng-sachima.jpg", 2.41, 51.54, 25.07, 0],
    ["assets/sansheng-fish.jpg", 30.16, 20.8, 15.01, 2],
    ["assets/sansheng-gluten.jpg", 34.85, 63.36, 11.93, 3],
    ["assets/sansheng-porkrind.jpg", 53.35, 42.08, 10.72, 4],
    ["assets/sansheng-floss.jpg", 69.97, 32.39, 14.08, 1],
    ["assets/sansheng-dace.jpg", 65.42, 78.01, 23.32, 5],
  ],
  // incense sticks the smoke rises from: [x %, y % of the picture, how high it rises in % of the height, puffs]
  smoke: [[91.5, 14, 32, 16], [81.2, 47, 45, 14]],
};

// Download buttons on animated cards. 影片 on 炫炮學生證 is the full animation; GIF and boomerang use its ending.
const DOWNLOAD = {
  kinds: { png: "卡片", gif: "GIF", boom: "boomerang", video: "影片" },
  busy: "製作中，請留在此頁",
  fail: "這台裝置無法製作這個檔案。",
};

// Download page. Locked cards show a black silhouette: shadow is a transparent PNG, emoji is blacked out. Three cards come from the tasks; chat unlocks by asking the robot for a hint; meme unlocks by finishing 學生證補辦RPG.
const CARDS = [
  { key: "eat", emoji: "🥟", title: "eight 來eight 棒", text: "", img: "assets/gyoza-card.jpg", anim: "gyoza", unlock: "完成8包煎餃拼到底" },
  { key: "open", shadow: "assets/shadow-open.png", title: "壽桃塔卡", text: "福氣大禮包", img: "", anim: "peach", unlock: "完成急件開箱任務" },
  { key: "match", shadow: "assets/shadow-match.png", title: "中超style 三牲", text: "", img: "assets/sansheng-card.jpg", anim: "sansheng", unlock: "完成三牲連連看" },
  { key: "chat", shadow: "assets/shadow-chat.png", title: "線上客服卡", text: "", img: "", unlock: "在行動郵局向廢話客服要一次提示" },
  { key: "meme", shadow: "assets/shadow-meme.png", title: "炫炮學生證", text: "恭喜找到最酷炫的隱藏卡牌\n雖然完全刷不了，也不會被當成北大在學生\n但蚵仔煎洋芋片的貓咪很可愛❤️", unlock: "完成學生證補辦RPG" },
];

// Mobile post: the hint robot. Scripted replies only, so it works with no server.
const CHAT = {
  name: "廢話客服",
  connecting: "正在為您轉接客服", // shown with moving dots on her first visit, or while the chat has no history
  connected: "已為您接通廢話客服",
  // Her first visit to 行動郵局, at any hour: the queue moves up until it's her turn, then she's put through.
  queueMoving: "排隊中，請稍候",
  queueAhead: "前方還有 {n} 位",
  queueTurn: "輪到您了！",
  avatar: "assets/chat-avatar.png", // the bearded face beside its replies on the 線上客服卡
  sound: "聲音", // the 🔊 / 🔇 button for the card's message sounds
  onlineHours: [8, 24], // Taiwan time, 24-hour clock. Outside these hours the page shows the queue instead. Use [0, 24] for always on.
  greeting: "您好，我是室友郵政の廢話客服💁‍♀️。卡關時建議點選[?]，或是輸入「提示」。", // [?] becomes the clickable hint icon
  chips: ["我要提示", "你到底寄了什麼？", "今年還有惡作劇嗎？"],
  hintWords: ["提示", "卡關", "hint", "幫"],
  noTask: "查無進行中的任務。請先到郵路爬梯抽籤。",
  allDone: "所有任務皆已完成。請到查詢專區輸入完整追蹤號碼。",
  taskHints: {
    eat: "只要在規定時間內成功夾到+吃完8顆煎餃就算過關了喔！",
    match: "北大郵局有：雞🐓*2、魚🐟*1\n宿舍郵局有：豬🐷*2\n查詢專區有：魚🐟*1\n收集完所有emoji，就可以回查詢專區進行連連看。",
    open: "從宿舍郵局or北大郵局的「失物招領」，可以找到開箱工具。\n郵便箱能取用收集到的工具。\n割膠帶時，要記得切換角度。",
  },
  replies: [
    { words: ["寄了什麼", "內容物", "包裹"], text: "經查，內容物重量 0 公克，海關無法開箱。" },
    { words: ["惡作劇", "壽桃", "三牲"], text: "經本客服同寄件人詢問後\n寄件人轉知：「下次高機率再犯」\n以上言論不代表本客服立場，請二位私下解決👍" },
    { words: ["謝謝", "感謝"], text: "ㄅ客氣！寄件人表示下次不一定有🤣" },
    { words: ["生日", "快樂"], text: "本機器人已代為祝您生日快樂。" },
  ],
  fallback: "無法辨識您的訊息。本機器人只會給提示，請輸入「提示」。",
};

// Joke notifications. Not shown anywhere at the moment: page links no longer trigger them.
const NOTICES = [
  ["【帳戶入帳通知】", "您的存簿帳號末五碼 11060 於 115/11/06 00:00:00 入帳 0 元，詳細內容請至交易明細查詢。"],
  ["生日祝福", "親愛的收件人您好：在這最特別的日子裡，獻上我們最誠摯的祝福，祝您生日快樂，室友郵政關心您。"],
  ["【包裹招領通知】", "您有一件來自高雄的包裹待領取，重量 0 公克，海關表示無法開箱。"],
  ["【前科通報】", "寄件人近期動向異常，請留意您的辦公桌。"],
  ["【宿舍通知】", "本局查獲當年的音量紀錄，請於期限內說明。"],
];

// Shown when the correct tracking number is entered: [date, office, status, 備註 (shown on its own line; "" for none)].
// The 北大郵局 備註 has two versions: everything there done, or only items collected.
const TRACKING = [
  ["11/03", "高雄郵局", "收寄。", "寄件人備註：此為特急件，務必於日本時間11/06前送抵，煩請各局密切留意。寄件人有前科，請小心輕放。"],
  ["11/03", "北大郵局", "抵達三峽分檢中心。", {
    all: `北大郵局備註：特此感謝校友${CONFIG.recipient}蒞臨本局，協助完善缺失紀錄。`,
    some: `北大郵局備註：特邀校友${CONFIG.recipient}至本局，參與新宿舍落成典禮。`,
  }],
  ["11/04", "宿舍郵局", "由北大愛悅轉往會計事務所。", "宿舍郵局備註：經查無相關學籍紀錄，惟查獲生日應援紀錄一份，已隨件附上，請收件人於期限內說明。"],
  ["11/04", "會計事務所", "由會計事務所送至桃園機場海關。", "會計事務所備註：誤列為報稅期間客戶急件，已由收件人拆封查驗：內容物為壽桃塔，非發票憑證。"],
  ["11/05", "桃園機場海關", "暫扣。", "桃園機場海關備註：疑含禁運之肉類製品：雞、豬、魚各二。"],
  ["11/05", "桃園機場海關", "放行，包裹運送航班為 CI 1106。", "桃園機場海關備註：經查核為非生鮮三牲，合乎「人有洋節helloween，吾等普渡平安double win」，現已放行。"],
  ["11/05", "日本税関", "放行。", "日本税関備註：內容物重量 0 公克，無從課稅。敬祝收件人生日快樂🎂"],
  ["11/06", `${CONFIG.city}`, "配達完了。", `${CONFIG.city}備註：收件人已簽收。寄件人轉知：下次高機率再犯。`],
];

const ENDING = {
  // The letter on the 生日卡片 page. Shown as edited: the time below it opens the earlier versions.
  letter: [
    "阿如：",
    "嘿嘿嘿嘿嘿大致完成了~~~\n各個區塊都可以點來點去亂玩一通了\n不過還有個大動畫完善中🤣\n20代的尾巴 剛好碰上選舉\n造勢就是要熱熱鬧鬧+持續擾民 才對味(?)\n(說了一些對臺灣未來充滿信心的話)\n(感覺臺灣南波萬 臺灣讚讚讚)\n以上 20代快樂🎉",
    "KU，高雄",
  ],
  edited: "115/11/07 11:06",
  edits: [
    { at: "115/11/06 23:58", text: "可惡！！太高估自己\n還有動畫+結尾在產製中🫠\n請稍後 等我完善體驗\n趕在日本時間11/6結束前祝妳生日快樂啦啦啦啦❤️" },
  ], // older versions of the middle part, newest first
  editLabel: "已編輯",
  editsTitle: "編輯紀錄",
  editsNow: "目前版本",
  photos: [], // e.g. ["assets/dorm.jpg", "assets/peach-tower.jpg"]
};
