/* All game content: categories, goal areas, quest templates, bored quests, bosses, levels. */

export const CATS = {
  body:   { label: "Body",   c: "var(--tang)" },
  biz:    { label: "Work",   c: "var(--sun)" },
  money:  { label: "Money",  c: "var(--mint)" },
  home:   { label: "Home",   c: "var(--bubble)" },
  sleep:  { label: "Sleep",  c: "var(--grape)" },
  mind:   { label: "Mind",   c: "var(--sky)" },
  food:   { label: "Food",   c: "var(--lime)" },
  learn:  { label: "Learn",  c: "var(--aqua)" },
  fun:    { label: "Fun",    c: "var(--aqua)" },
  people: { label: "People", c: "var(--red)" }
};

export const AREAS = [
  { k: "fit", label: "Fitness & health", sub: "Move, eat, feel better", cat: "body", q: "Fitness: what matters most?",
    specifics: [["muscle", "Build muscle"], ["weight", "Lose weight"], ["active", "Be more active"]] },
  { k: "mind", label: "Mind & discipline", sub: "Focus, calm, less scrolling", cat: "mind", q: "Discipline: what's the main fight?",
    specifics: [["procrast", "Stop procrastinating"], ["routines", "Build routines"], ["screen", "Less screen time"], ["calm", "Feel calmer"]] },
  { k: "work", label: "Work & career", sub: "Get more done, grow", cat: "biz", q: "Work: what do you want?",
    specifics: [["focus", "Get more done"], ["hustle", "Grow a side hustle"], ["career", "Level up my career"]] },
  { k: "money", label: "Money & budget", sub: "Save, spend less, plan", cat: "money", q: "Money: what's the plan?",
    specifics: [["save", "Save money"], ["spend", "Spend less"], ["budget", "Manage a budget"]] },
  { k: "learn", label: "Learning & skills", sub: "Practice, read, languages", cat: "learn", q: "Learning: what kind?",
    specifics: [["skill", "Practice a skill"], ["read", "Read more"], ["language", "Learn a language"]] },
  { k: "routine", label: "Routines & organizing", sub: "Mornings, sleep, tidy space", cat: "home", q: "Routines: where to start?",
    specifics: [["morning", "Better mornings"], ["sleep", "Better sleep"], ["tidy", "Clean, organized space"]] }
];

export const LEVELS_START = [
  ["0", "Starting from zero", "Haven't really done this yet"],
  ["1", "On and off", "I do some of it, sometimes"],
  ["2", "Already on it", "I want more of a push"]
];
export const BLOCKERS = [
  ["motivation", "Motivation"], ["time", "No time"], ["forget", "I forget"], ["phone", "My phone"]
];
export const DIFFICULTY = [
  ["easy", "Easy", "Tiny wins. Hard to fail.", "var(--mint)"],
  ["normal", "Normal", "Some effort, still chill.", "var(--sun)"],
  ["hard", "Hard", "Push me.", "var(--tang)"]
];
export const MINUTES = [5, 15, 30, 60];
export const TIMES = [["morning", "Morning"], ["after", "Afternoon"], ["evening", "Evening"]];

/*
  Quest templates. Each tier: [name, lazy version, minutes, xp] for easy / normal / hard.
  freq: daily | weekdays | 3x | sat | sun | mon.  flex: slot can follow the user's preferred time.
  unit: "singular|plural" for real-life milestones.  u: universal habit (added only when there's room).
*/
const T = (id, area, serves, freq, slot, flex, cat, unit, tags, tiers, u = 0) =>
  ({ id, area, serves: serves.split(" "), freq, slot, flex: !!flex, cat, unit, tags: tags ? tags.split(" ") : [], tiers, u: !!u });

export const TEMPLATES = [
  // Fitness & health
  T("walk", "fit", "active weight", "daily", "after", 1, "body", "walk|walks", "outside", [
    ["10-min walk", "5 min outside", 10, 15], ["20-min walk", "10 min outside", 20, 25], ["40-min walk", "20-min walk", 40, 40]]),
  T("workout", "fit", "muscle weight active", "3x", "after", 1, "body", "workout|workouts", "", [
    ["5-min bodyweight workout", "10 squats", 5, 15], ["12-min home workout", "10 push-ups + 15 squats", 12, 30], ["30-min strength session", "12-min home workout", 30, 45]]),
  T("pushups", "fit", "muscle", "daily", "any", 0, "body", "push-up day|push-up days", "", [
    ["20 push-ups across the day", "10 push-ups", 3, 10], ["50 push-ups across the day", "20 push-ups", 6, 20], ["100 push-ups across the day", "50 push-ups", 12, 30]]),
  T("protein", "fit", "muscle weight", "daily", "any", 0, "food", "protein day|protein days", "", [
    ["Protein with one meal", "", 2, 10], ["Protein with every meal", "Protein with one meal", 3, 15], ["Hit your protein target", "Protein with every meal", 5, 20]]),
  T("steps", "fit", "active weight", "daily", "any", 0, "body", "step goal hit|step goals hit", "outside", [
    ["Hit 5,000 steps", "3,000 steps", 1, 15], ["Hit 8,000 steps", "5,000 steps", 1, 25], ["Hit 12,000 steps", "8,000 steps", 1, 40]]),
  T("nosugar", "fit", "weight", "daily", "evening", 0, "food", "sugar-free day|sugar-free days", "", [
    ["No sugary drinks today", "", 1, 10], ["No sugary drinks or sweets", "No sugary drinks", 1, 15], ["No added sugar today", "No sweets", 1, 25]]),
  T("stretch", "fit", "active calm", "daily", "evening", 1, "body", "stretch session|stretch sessions", "", [
    ["Stretch for 3 min", "1 min of stretching", 3, 10], ["Stretch for 10 min", "Stretch for 3 min", 10, 15], ["20-min mobility session", "10-min stretch", 20, 25]]),
  T("cook", "fit", "weight spend save", "daily", "evening", 0, "food", "home-cooked meal|home-cooked meals", "cooking", [
    ["Cook one simple meal", "Make a sandwich or wrap", 15, 20], ["Cook a proper meal at home", "Simple meal at home", 30, 25], ["Cook + prep tomorrow's lunch", "Cook one meal", 45, 40]]),
  T("water", "fit", "active weight muscle", "daily", "any", 0, "food", "hydrated day|hydrated days", "", [
    ["Drink 1 litre of water", "3 glasses", 1, 10], ["Drink 2 litres of water", "Drink 1 litre", 1, 15], ["Drink 3 litres of water", "Drink 2 litres", 1, 20]], 1),

  // Mental health & discipline
  T("focus", "mind", "procrast", "weekdays", "after", 1, "mind", "focus session|focus sessions", "", [
    ["10-min focus session", "5-min focus", 10, 15], ["25-min focus session", "10-min focus", 25, 25], ["Two 25-min focus sessions", "One 25-min session", 50, 40]]),
  T("priority", "mind", "procrast routines focus", "weekdays", "morning", 0, "mind", "priority done|priorities done", "", [
    ["Write your 1 priority for today", "", 2, 10], ["Finish your #1 priority task", "Work on it for 5 min", 30, 30], ["Finish your top 3 tasks", "Finish your #1 task", 60, 45]]),
  T("nophone_am", "mind", "screen routines", "daily", "morning", 0, "mind", "phone-free morning|phone-free mornings", "phone", [
    ["No phone for the first 10 min", "No socials for the first 5 min", 1, 10], ["No socials before 10:00", "No socials for the first 30 min", 1, 20], ["No socials before 12:00", "No socials before 10:00", 1, 30]]),
  T("screentime", "mind", "screen", "daily", "evening", 0, "mind", "low-screen day|low-screen days", "phone", [
    ["Phone screen time under 6 h", "Under 7 h", 1, 10], ["Phone screen time under 4 h", "Under 5 h", 1, 20], ["Phone screen time under 3 h", "Under 4 h", 1, 30]]),
  T("breathe", "mind", "calm", "daily", "any", 1, "mind", "calm session|calm sessions", "", [
    ["2 min of slow breathing", "5 deep breaths", 2, 10], ["10 min of quiet: walk or meditate", "3 min of breathing", 10, 15], ["20-min meditation", "10 min", 20, 25]]),
  T("journal", "mind", "calm routines", "daily", "evening", 0, "mind", "journal entry|journal entries", "", [
    ["Write 1 line about today", "", 2, 10], ["Journal 3 lines", "Journal 1 line", 5, 15], ["Journal a full page", "Journal 3 lines", 15, 25]]),
  T("daylight", "mind", "calm sleep", "daily", "any", 1, "mind", "outdoor break|outdoor breaks", "outside", [
    ["5 min in daylight", "Open a window", 5, 10], ["20 min outside", "10 min outside", 20, 20], ["An hour outside, no phone", "30 min outside", 60, 35]]),
  T("review", "mind", "routines budget procrast", "sun", "evening", 0, "mind", "weekly review|weekly reviews", "", [
    ["Sunday check-in: 1 thing that worked", "", 5, 20], ["Sunday review (15 min)", "Write 1 thing that worked", 15, 40], ["Sunday review + plan next week", "Sunday review", 30, 50]], 1),
  T("phonebed", "mind", "screen sleep routines", "daily", "evening", 0, "sleep", "phone-free night|phone-free nights", "phone", [
    ["Phone off the bed by 23:30", "Phone face-down by midnight", 1, 10], ["Phone off the bed by 22:30", "Lights off by 23:30", 1, 20], ["Phone out of the bedroom at 22:00", "Off the bed by 22:30", 1, 25]], 1),

  // Work & career
  T("deepwork", "work", "focus career", "weekdays", "after", 1, "biz", "deep-work block|deep-work blocks", "", [
    ["15 min of deep work", "5 min on it", 15, 15], ["45 min of deep work", "15 min on it", 45, 35], ["90 min of deep work", "45 min", 90, 50]]),
  T("inbox", "work", "focus", "weekdays", "any", 0, "biz", "inbox clear|inbox clears", "", [
    ["Inbox under 20", "Clear 10 emails", 10, 10], ["Inbox zero", "Inbox under 20", 20, 20], ["Inbox zero + plan tomorrow", "Inbox zero", 30, 25]]),
  T("outreach", "work", "hustle", "weekdays", "after", 1, "biz", "outreach day|outreach days", "", [
    ["Message 1 potential client", "Draft one message", 10, 15], ["Message 5 potential clients", "Send 1 message", 30, 35], ["Message 10 potential clients", "Send 5", 60, 50]]),
  T("project", "work", "hustle", "weekdays", "evening", 1, "biz", "project session|project sessions", "", [
    ["15 min on your side project", "5 min on it", 15, 15], ["45 min on your side project", "15 min on it", 45, 35], ["2 h on your side project", "45 min on it", 120, 50]]),
  T("post", "work", "hustle career", "3x", "any", 1, "biz", "post|posts", "", [
    ["Draft a post about your work", "Write one line", 10, 15], ["Post something about your work", "Draft the post", 20, 25], ["Post + reply to 5 people", "Post it", 40, 35]]),
  T("worklearn", "work", "career", "3x", "evening", 1, "biz", "learning session|learning sessions", "", [
    ["Learn a work skill for 10 min", "5 min", 10, 15], ["Learn a work skill for 30 min", "10 min", 30, 25], ["1 h course or practice project", "30 min", 60, 40]]),
  T("network", "work", "career hustle", "mon", "any", 1, "biz", "networking move|networking moves", "", [
    ["Message one person in your field", "Comment on one post", 5, 15], ["Reach out to 3 people in your field", "Reach out to 1", 20, 25], ["Book a coffee chat or call", "Reach out to 3 people", 30, 40]]),

  // Money & budgeting
  T("logspend", "money", "budget spend", "daily", "evening", 0, "money", "money check-in|money check-ins", "", [
    ["Check your bank app", "", 2, 10], ["Log today's spending", "Check your bank app", 5, 15], ["Log spending + check budget left", "Log today's spending", 10, 20]]),
  T("budget", "money", "budget spend save", "daily", "evening", 0, "money", "on-budget day|on-budget days", "", [
    ["Stayed inside today's budget", "", 1, 15], ["Stayed inside the weekly budget", "", 1, 20], ["Nothing spent outside essentials", "Stayed inside budget", 1, 30]]),
  T("noimpulse", "money", "spend save", "daily", "evening", 0, "money", "impulse-free day|impulse-free days", "", [
    ["No impulse buys today", "", 1, 10], ["No impulse buys or food orders", "No impulse buys", 1, 20], ["No-spend day", "No impulse buys", 1, 30]]),
  T("foodorders", "money", "spend save", "daily", "evening", 0, "food", "no-delivery day|no-delivery days", "", [
    ["No food delivery today", "", 1, 15], ["No impulse food orders", "", 1, 20], ["Ate home-made food all day", "No impulse food orders", 1, 25]]),
  T("savings", "money", "save budget", "mon", "any", 0, "money", "savings move|savings moves", "", [
    ["Move 2 € to savings", "Move 1 €", 2, 10], ["Move money to savings", "Move 5 €", 5, 25], ["Move 10% of income to savings", "Move what you planned", 5, 40]]),
  T("sell", "money", "save", "sat", "any", 0, "money", "listing|listings", "", [
    ["Photograph one thing to sell", "", 5, 10], ["List one thing you don't use", "Take photos of it", 20, 25], ["List 3 things you don't use", "List one", 45, 40]]),
  T("moneyweek", "money", "budget save", "sun", "any", 0, "money", "money review|money reviews", "", [
    ["Weekly money check-in (5 min)", "Look at last week's total", 5, 15], ["Weekly budget review", "Look at last week's total", 15, 30], ["Weekly review + next week's budget", "Weekly budget review", 30, 40]]),

  // Learning & skills
  T("practice", "learn", "skill", "weekdays", "evening", 1, "learn", "practice session|practice sessions", "", [
    ["Practice your skill for 10 min", "5 min", 10, 15], ["Practice your skill for 30 min", "10 min", 30, 25], ["Practice for 1 hour", "30 min", 60, 40]]),
  T("read", "learn", "read skill", "daily", "evening", 1, "learn", "reading session|reading sessions", "", [
    ["Read 5 pages", "Read 1 page", 5, 10], ["Read 10 pages", "Read 2 pages", 15, 15], ["Read 30 pages", "Read 10 pages", 40, 30]]),
  T("language", "learn", "language", "daily", "any", 1, "learn", "language session|language sessions", "", [
    ["5 min of language practice", "1 quick lesson", 5, 15], ["15 min of language practice", "5 min", 15, 20], ["30 min + 10 new words", "15 min", 30, 35]]),
  T("lesson", "learn", "skill language career", "3x", "any", 1, "learn", "lesson|lessons", "", [
    ["Watch one lesson or tutorial", "Save one to watch later", 10, 15], ["Do one lesson and take notes", "Watch one lesson", 25, 25], ["Finish a lesson + build something with it", "Do one lesson", 60, 40]]),
  T("teach", "learn", "skill read", "3x", "evening", 0, "learn", "learning note|learning notes", "", [
    ["Write down 1 thing you learned", "", 2, 10], ["Explain what you learned in 5 lines", "1 thing you learned", 10, 15], ["Share what you learned publicly", "Explain it in 5 lines", 20, 25]]),

  // Daily routines & organization
  T("bed", "routine", "morning tidy", "daily", "morning", 0, "home", "made bed|made beds", "", [
    ["Make your bed", "", 1, 10], ["Make your bed + open the window", "Make your bed", 3, 15], ["Bed, window, water before phone", "Make your bed", 5, 20]]),
  T("reset", "routine", "tidy", "daily", "evening", 0, "home", "room reset|room resets", "", [
    ["5-min desk reset", "Clear one spot", 5, 10], ["Desk + room reset", "Just make the bed", 10, 20], ["15-min clean of one room", "Desk + room reset", 15, 30]]),
  T("dishes", "routine", "tidy", "daily", "evening", 0, "home", "clean-kitchen night|clean-kitchen nights", "", [
    ["Rinse what you used", "", 3, 10], ["Dishes done before bed", "Rinse what you used", 10, 15], ["Kitchen clean before bed", "Dishes done", 20, 25]]),
  T("laundry", "routine", "tidy", "sat", "any", 0, "home", "laundry day|laundry days", "", [
    ["Sort the laundry", "", 5, 10], ["One load of laundry", "Sort it", 15, 20], ["Laundry washed, folded, put away", "One load", 45, 35]]),
  T("wake", "routine", "morning sleep", "daily", "morning", 0, "sleep", "on-time morning|on-time mornings", "", [
    ["Up within 30 min of your alarm", "Up within an hour", 1, 10], ["Wake up at the same time", "Within 30 min of it", 1, 20], ["Same wake time, no snooze", "Same wake time", 1, 25]]),
  T("amroutine", "routine", "morning routines", "daily", "morning", 0, "home", "morning routine|morning routines", "", [
    ["2-min morning routine: water + plan", "Glass of water", 2, 10], ["10-min morning routine", "2-min version", 10, 20], ["20-min morning routine with movement", "10-min version", 20, 30]]),
  T("bedtime", "routine", "sleep", "daily", "evening", 0, "sleep", "early night|early nights", "", [
    ["In bed by midnight", "", 1, 10], ["In bed by 23:00", "In bed by midnight", 1, 20], ["In bed by 22:30", "In bed by 23:00", 1, 25]]),
  T("winddown", "routine", "sleep calm", "daily", "evening", 0, "sleep", "wind-down|wind-downs", "phone", [
    ["Screens off 10 min before bed", "", 10, 10], ["Screens off 30 min before bed", "10 min before", 30, 20], ["1 h screen-free wind-down", "30 min", 60, 30]]),
  T("caffeine", "routine", "sleep", "daily", "after", 0, "sleep", "caffeine cut-off|caffeine cut-offs", "", [
    ["No caffeine after 17:00", "", 1, 10], ["No caffeine after 15:00", "After 17:00", 1, 15], ["No caffeine after 12:00", "After 15:00", 1, 20]])
];
export const TPL = Object.fromEntries(TEMPLATES.map(t => [t.id, t]));

/* I'm Bored quests: [text, minutes, energy (low|any|high), area, tags] */
export const BORED = [
  ["10 push-ups. Right now.", 2, "high", "fit", ""], ["Drink a full glass of water", 2, "low", "fit", ""],
  ["Roll your neck and shoulders for 2 min", 2, "low", "fit", ""], ["Plank for 45 seconds", 2, "high", "fit", ""],
  ["Wall sit for 45 seconds", 2, "high", "fit", ""], ["Open a window, take 10 slow breaths", 2, "low", "mind", ""],
  ["Delete 20 screenshots", 2, "low", "mind", ""], ["Unsubscribe from 3 newsletters", 2, "low", "mind", ""],
  ["Write tomorrow's #1 priority", 2, "low", "work", ""], ["Reply to one message you've been ignoring", 2, "low", "people", ""],
  ["Text someone something nice", 2, "low", "people", ""], ["Send a meme to a friend you miss", 2, "low", "people", ""],
  ["Check your bank balance", 2, "low", "money", ""], ["Put 5 things back where they belong", 2, "any", "routine", ""],
  ["Make your bed properly", 2, "any", "routine", ""], ["Wipe your phone screen", 2, "low", "routine", ""],
  ["Learn one new keyboard shortcut", 2, "low", "learn", ""], ["Look up one word you didn't know", 2, "low", "learn", ""],

  ["Walk around the block", 5, "any", "fit", "outside"], ["20 slow squats", 5, "high", "fit", ""],
  ["Stretch for 5 minutes", 5, "low", "fit", ""], ["Dance to one full song", 5, "high", "fun", ""],
  ["Clear your desk completely", 5, "any", "routine", ""], ["Fold the clothes on the chair", 5, "any", "routine", ""],
  ["Wash 5 dishes", 5, "any", "routine", ""], ["Throw out 5 things you don't need", 5, "any", "routine", ""],
  ["Clear out one drawer", 5, "any", "routine", ""], ["Take the trash out", 5, "any", "routine", ""],
  ["Lay out tomorrow's clothes", 5, "low", "routine", ""], ["Clear 20 emails", 5, "low", "work", ""],
  ["Close every browser tab you don't need", 5, "low", "work", ""], ["Draft one outreach message", 5, "any", "work", ""],
  ["Update one line on your portfolio or CV", 5, "any", "work", ""], ["Cancel or check one subscription", 5, "low", "money", ""],
  ["Plan tomorrow's meals, no delivery", 5, "low", "money", ""], ["Photograph one thing you could sell", 5, "any", "money", ""],
  ["Read 5 pages of anything", 5, "low", "learn", ""], ["Watch a 5-min tutorial on anything", 5, "low", "learn", ""],
  ["Doodle something for 5 minutes", 5, "low", "fun", ""], ["Make a short playlist for your next walk", 5, "low", "fun", ""],
  ["Call a family member for 5 min", 5, "any", "people", "call"], ["5 minutes in daylight, no phone", 5, "low", "mind", "outside"],
  ["Write 3 things that went OK today", 5, "low", "mind", ""], ["Delete 3 apps you never open", 5, "low", "mind", ""],

  ["15-min walk, phone stays home", 15, "any", "fit", "outside"], ["3 rounds: 10 squats, 10 push-ups, 20 s plank", 15, "high", "fit", ""],
  ["Make a snack instead of ordering", 15, "any", "money", ""], ["Deep-clean one small zone", 15, "high", "routine", ""],
  ["Tidy your desk and cables properly", 15, "any", "routine", ""], ["15-min sprint on your hardest task", 15, "high", "work", ""],
  ["Ask an old client or boss for a review", 15, "any", "work", ""], ["Write down this week's spending", 15, "low", "money", ""],
  ["List one thing for sale", 15, "any", "money", ""], ["Practice your skill for 15 min", 15, "any", "learn", ""],
  ["Do one language lesson", 15, "low", "learn", ""], ["Read one chapter", 15, "low", "learn", ""],
  ["Plan one thing to look forward to this week", 15, "low", "fun", ""], ["Call a friend you haven't talked to in a while", 15, "any", "people", "call"],
  ["Go somewhere in town you've never been", 15, "high", "fun", "outside"], ["Journal for 15 minutes", 15, "low", "mind", ""],
  ["Rearrange one thing in your room", 15, "any", "routine", ""], ["Write down 3 things you want to try", 15, "low", "fun", ""]
].map(([text, min, energy, area, tags]) => ({ text, min, energy, area, tags: tags ? tags.split(" ") : [] }));
export const BORED_XP = { 2: 8, 5: 15, 15: 30 };

export const LEVELS = ["Couch Potato", "Snack Goblin", "Nap Specialist", "Side Quest Enjoyer", "Lowkey Locked In", "Certified Grinder",
  "Habit Machine", "Main Character", "Menace to Laziness", "Final Boss", "Legend", "Mythic"];

export const BOSSES = [
  { n: "The Couch", c: "var(--bubble)", t: ["Just one more episode…", "Sit. Stay. Forever.", "You're comfy. Why move?"], low: "Wait, you're actually doing it?" },
  { n: "Doomscroll Dragon", c: "var(--mint)", t: ["One more scroll won't hurt.", "Ooh, a new notification!", "Did you see that reel?"], low: "My feed… it's fading…" },
  { n: "Snooze Lord", c: "var(--grape)", t: ["Five more minutes.", "Alarms are a suggestion.", "Bed is life."], low: "Who set this alarm?!" },
  { n: "Mount Laundry", c: "var(--sky)", t: ["I grow every day.", "Chair? You mean my throne.", "Fold me. I dare you."], low: "I'm… shrinking…" },
  { n: "Captain Later", c: "var(--tang)", t: ["Tomorrow is a great day for that.", "Later. Always later.", "Why now when you can never?"], low: "Fine. NOW then." },
  { n: "The Takeout Troll", c: "var(--sun)", t: ["Just order it. You deserve it.", "Delivery fee? Pocket change.", "Cooking is so much effort."], low: "You… cooked?" }
];

export const HYPE = ["W.", "Ate.", "Easy.", "Locked in.", "Lazy who?", "Too easy.", "Cooking.", "Another one.", "Clean."];
export const MINI_HYPE = ["Mini still counts.", "Small W.", "Beats zero.", "Counts. Next."];
