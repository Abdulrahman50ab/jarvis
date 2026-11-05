const URDU_WORDS: Record<string, string> = {
  "میں": "main",
  "آپ": "aap",
  "اپ": "aap",
  "ہم": "hum",
  "تم": "tum",
  "مجھ": "mujh",
  "مجھے": "mujhe",
  "میرا": "mera",
  "میری": "meri",
  "میرے": "mere",
  "ہمارا": "hamara",
  "تمہارا": "tumhara",
  "یہ": "yeh",
  "وہ": "woh",
  "اس": "is",
  "اسے": "usay",
  "ان": "in",
  "جو": "jo",
  "کون": "kaun",
  "کیا": "kya",
  "کیوں": "kyun",
  "کیسے": "kaise",
  "کہاں": "kahan",
  "کب": "kab",
  "کس": "kis",
  "سے": "se",
  "کا": "ka",
  "کی": "ki",
  "کے": "ke",
  "کو": "ko",
  "پر": "par",
  "تک": "tak",
  "ساتھ": "saath",
  "لئے": "liye",
  "لیے": "liye",
  "اور": "aur",
  "لیکن": "lekin",
  "اگر": "agar",
  "تو": "to",
  "بھی": "bhi",
  "ہی": "hi",
  "نہیں": "nahi",
  "نہ": "na",
  "نا": "na",
  "ہاں": "haan",
  "جی": "ji",
  "ہے": "hai",
  "ہیں": "hain",
  "ہوں": "hoon",
  "ہو": "ho",
  "رہا": "raha",
  "رہی": "rahi",
  "رہے": "rahe",
  "کر": "kar",
  "کرو": "karo",
  "کریں": "karein",
  "کرنا": "karna",
  "کرنی": "karni",
  "کرنے": "karne",
  "ہونا": "hona",
  "ہوا": "hua",
  "ہوئی": "hui",
  "ہوئے": "huay",
  "بات": "baat",
  "بتا": "bata",
  "بتائیں": "batayein",
  "لکھ": "likh",
  "لکھا": "likha",
  "لکھی": "likhi",
  "بول": "bol",
  "بولے": "bolay",
  "دیکھ": "dekh",
  "دیکھو": "dekho",
  "آتا": "aata",
  "آتی": "aati",
  "آتے": "aate",
  "آئے": "aaye",
  "جائے": "jaye",
  "جاتا": "jata",
  "جاتی": "jati",
  "جاتے": "jate",
  "چاہتا": "chahta",
  "چاہتی": "chahti",
  "چاہتے": "chahte",
  "چاہیے": "chahiye",
  "سکتا": "sakta",
  "سکتی": "sakti",
  "سکتے": "sakte",
  "ایک": "aik",
  "دو": "do",
  "تین": "teen",
  "اب": "ab",
  "ابھی": "abhi",
  "آج": "aaj",
  "کل": "kal",
  "پھر": "phir",
  "بس": "bas",
  "کچھ": "kuch",
  "سب": "sab",
  "کوئی": "koi",
  "اچھا": "acha",
  "ٹھیک": "theek",
  "بہت": "bohat",
  "زیادہ": "zyada",
  "کم": "kam",
  "طرح": "tarah",
  "جیسے": "jaisay",
  "ایسے": "aisay",
  "مدد": "madad",
  "اردو": "urdu",
  "رومن": "roman",
  "انگریزی": "angrezi",
  "انگلش": "english",
  "لفظ": "lafz",
  "الفاظ": "alfaaz",
  "ورڈ": "word",
  "ورڈز": "words",
  "زبان": "zaban",
  "آواز": "awaaz",
  "صارف": "user",
  "چیٹ": "chat",
  "میسج": "message",
  "ٹیکسٹ": "text",
  "نظر": "nazar",
  "والا": "wala",
  "والی": "wali",
  "والے": "walay",
};

const URDU_CHARACTERS: Record<string, string> = {
  "ا": "a", "آ": "aa", "أ": "a", "إ": "a", "ب": "b", "پ": "p",
  "ت": "t", "ٹ": "t", "ث": "s", "ج": "j", "چ": "ch", "ح": "h",
  "خ": "kh", "د": "d", "ڈ": "d", "ذ": "z", "ر": "r", "ڑ": "r",
  "ز": "z", "ژ": "zh", "س": "s", "ش": "sh", "ص": "s", "ض": "z",
  "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q",
  "ک": "k", "ك": "k", "گ": "g", "ل": "l", "م": "m", "ن": "n",
  "ں": "n", "و": "o", "ؤ": "o", "ہ": "h", "ھ": "h", "ة": "h",
  "ء": "", "ی": "i", "ي": "i", "ى": "i", "ے": "e", "ئ": "y",
};

const URDU_SCRIPT = /[\u0600-\u06ff]/;
const URDU_WORD = /[\u0621-\u063a\u0641-\u064a\u066e-\u066f\u0671-\u06d3\u06fa-\u06fc]+/g;

function normalizeUrduWord(word: string) {
  return word
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/ك/g, "ک")
    .replace(/[يى]/g, "ی");
}

function transliterateWord(word: string) {
  const normalized = normalizeUrduWord(word);
  const known = URDU_WORDS[normalized];
  if (known) return known;
  return Array.from(normalized, (character) => URDU_CHARACTERS[character] ?? character).join("");
}

export function romanizeUrduText(text: string) {
  if (!URDU_SCRIPT.test(text)) return text.trim();

  return text
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(URDU_WORD, transliterateWord)
    .replace(/،/g, ",")
    .replace(/۔/g, ".")
    .replace(/؟/g, "?")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
