/**
 * Günlük Saha Kontrolü form state ve serileştirme (sayfa + rapor modal paylaşır).
 * Tek kaynak: dailyFieldCheckQuestionSet.
 */

export type YesNo = "yes" | "no" | "";

export interface FieldCheckAnswer {
  value: YesNo;
  note?: string;
  photoFile?: File | null;
  photoPreview?: string | null;
}

// ---- Question set (denetim formu ile aynı veri modeli: sections + questions) ----

export interface DailyFieldCheckQuestion {
  id: string;
  text: string;
  info?: string;
  type?: "photoRequired";
}

export interface DailyFieldCheckSection {
  title: string;
  requirePhotoOnYes?: boolean;
  questions: DailyFieldCheckQuestion[];
}

export const dailyFieldCheckQuestionSet: DailyFieldCheckSection[] = [
  {
    title: "Bahçe Düzeni & Temizlik",
    questions: [
      { id: "A1", text: "Bahçede ve sulama odasında çöp, naylon atığı veya boş gübre/ilaç ambalajı var mı?", info: "Bitki araları, yürüyüş yolları, köşeler ve sulama odası kontrol edilir. Naylon, plastik ve boş ambalaj sahada bırakılmamalıdır." },
      { id: "A2", text: "Bahçede ve sulama odasında dağınık halde el aleti, kasa veya ekipman var mı?", info: "Daldız, muz bıçağı, makas, ip, kanca, hortum, sprinkler ve kasalar kullanım sonrası düzenli olmalıdır." },
      { id: "A3", text: "Bahçede ve sulama odasında düzensiz veya açık şekilde gübre, ilaç veya kimyasal var mı?", info: "Dolu ürünler ve boş ambalajlar ayrı tutulmalı, tüm ambalajlar kontrollü atık alanında muhafaza edilmelidir." },
    ],
  },
  {
    title: "Sera Yapısal Durum",
    questions: [
      { id: "B1", text: "Naylon örtüde yırtık veya hasar var mı?", info: "Çatı, yanlar ve alınlar kontrol edilir." },
      { id: "B2", text: "Açılmayan veya kapanmayan havalandırma penceresi var mı?", info: "Havalandırma sistemleri sorunsuz çalışmalıdır." },
      { id: "B3", text: "Sera kapıları düzgün kapanıyor mu?", info: "Kapılar tam kapanmalı ve boşluk kalmamalıdır." },
      { id: "B4", text: "Sera içine su sızıntısı var mı?", info: "Çatı, oluklar ve havalandırma birleşimlerinden yoğun su girişi olmamalıdır." },
    ],
  },
  {
    title: "Sulama & Toprak Nem Durumu",
    questions: [
      { id: "C1", text: "Bahçede sulanmayan bölge var mı?", info: "Kuru kalan bitki sırası veya alan olmamalıdır." },
      { id: "C2", text: "Su birikmesi olan alan var mı?", info: "Kök bölgesinde su birikmesi hastalık riskini artırır." },
      { id: "C3", text: "Mevsime göre sulama yeterli mi, toprak nemi uygun mu?", info: "Toprak ne çok kuru ne de fazla ıslak olmalıdır." },
    ],
  },
  {
    title: "Ortam Koşulları",
    questions: [
      { id: "D1", text: "Sera içinde aşırı sıcak var mı?", info: "Serada rahatsız edici düzeyde sıcaklık hissedilmemelidir." },
      { id: "D2", text: "Bitkilerde sıcak stresine bağlı belirtiler veya yaprak yanıklığı var mı?", info: "Yapraklarda yanıklık veya solma görülmemelidir." },
      { id: "D3", text: "Havalandırma ile ilgili bir uygunsuzluk var mı?", info: "Havalandırma yeterli olmalı ve sera içindeki nem korunmalıdır." },
    ],
  },
  {
    title: "Hastalık & Zararlı Kontrolü",
    requirePhotoOnYes: true,
    questions: [
      { id: "E1", text: "Bitkilerde yaprak biti vb. zararlılar gözlendi mi?", info: "Yaprak altları ve genç sürgünlerde yaprak biti, yeşil kurt ve unlu bit kontrol edilmelidir." },
      { id: "E2", text: "Bitkilerde yaprak lekesi (Sigatoka) var mı?", info: "Yapraklarda kahverengi veya siyah lekeler erken tespit edilmelidir." },
      { id: "E3", text: "Kök hastalığı (mantar, nematod) belirtisi var mı?", info: "Ani solma, zayıf gelişim, yaprak yığılması veya kök çürümesi kontrol edilmelidir." },
      { id: "E4", text: "Serada yabani ot yoğunluğu gözlendi mi?", info: "Yabani otlar zararlı ve hastalık riskini artırır." },
    ],
  },
  {
    title: "Bitki Gelişimi",
    questions: [
      { id: "F1", text: "Bitkilerde yaprak yığılması var mı?", info: "Yaprak arası açıklıkları kısa olmamalıdır." },
      { id: "F2", text: "Yapraklarda sararma, dar yaprak ayası veya yaprak uçlarında renk değişimi var mı?", info: "Yaprak rengi ve formu normal gelişimi yansıtmalıdır." },
      { id: "F3", text: "Fidanların gelişiminde sorun var mı?", info: "Fidanlar kalın gövdeli, yaprak araları açık ve kılıç formda olmalıdır." },
      { id: "F_ref", text: "Referans bitki fotoğrafları", type: "photoRequired", info: "10 dönüm başına 1 referans bitki her gün fotoğraflanmalıdır." },
    ],
  },
  {
    title: "Kültürel İşlemler",
    questions: [
      { id: "G1", text: "Yavru alma (daldız) işlemi gerektiren bitkiler var mı?", info: "Fide ayarı ve tekleme bahçenin geleceğidir." },
      { id: "G2", text: "Budama gerektiren bitkiler var mı?", info: "Fidan üstü açılmalı ve hava sirkülasyonu için budama yapılmalıdır." },
      { id: "G3", text: "Bağlama / askıya almayı gerektiren bitki var mı?", info: "Muzda doğum sonrası bitkiler askıya alınmalıdır." },
    ],
  },
  {
    title: "Hasat Kontrolü",
    questions: [
      { id: "H1", text: "Hasada gelmiş muz var mı?", info: "Muz yeterli dolgunluğa ulaştığında sararmadan ve çatlamadan hasat edilmelidir." },
    ],
  },
];

// Tüm cevap anahtarları (questionSet'ten türetilir)
export type DailyFieldCheckAnswerKey = string;
const allAnswerKeys = (): string[] => {
  const keys: string[] = [];
  dailyFieldCheckQuestionSet.forEach((section) => {
    section.questions.forEach((q) => keys.push(q.id));
  });
  return keys;
};

export const DAILY_FIELD_CHECK_ANSWER_KEYS = allAnswerKeys();

export type DailyFieldCheckFormState = Record<string, FieldCheckAnswer>;

export const emptyAnswer = (): FieldCheckAnswer => ({
  value: "",
  note: "",
  photoFile: null,
  photoPreview: null,
});

export const initialFormState = (): DailyFieldCheckFormState => {
  const state: DailyFieldCheckFormState = {};
  DAILY_FIELD_CHECK_ANSWER_KEYS.forEach((k) => {
    state[k] = emptyAnswer();
  });
  return state;
};

export function formToSerializable(form: DailyFieldCheckFormState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  DAILY_FIELD_CHECK_ANSWER_KEYS.forEach((k) => {
    const v = form[k];
    if (v && typeof v === "object" && "value" in v) {
      out[k] = { value: (v as FieldCheckAnswer).value, note: (v as FieldCheckAnswer).note ?? "" };
    }
  });
  return out;
}

export function formFromSerializable(data: Record<string, unknown>): DailyFieldCheckFormState {
  const state = initialFormState();
  DAILY_FIELD_CHECK_ANSWER_KEYS.forEach((k) => {
    const v = data[k];
    if (typeof v === "object" && v !== null && "value" in v) {
      const ans = v as { value: YesNo; note?: string };
      state[k] = {
        ...emptyAnswer(),
        value: ans.value ?? "",
        note: ans.note ?? "",
      };
    }
  });
  return state;
}

export const SECTION_KEYS = dailyFieldCheckQuestionSet.map((_, i) => String.fromCharCode(65 + i)) as readonly string[];

/**
 * Kaydet için: Formda en az 1 soru cevaplandıysa (evet/hayır) veya açıklama/foto eklendiyse true.
 */
export function hasAnyAnswer(form: DailyFieldCheckFormState): boolean {
  for (const section of dailyFieldCheckQuestionSet) {
    for (const q of section.questions) {
      const a = form[q.id];
      if (q.type === "photoRequired") {
        if (a?.photoFile || a?.photoPreview) return true;
      } else {
        if ((a?.value ?? "") !== "") return true;
        if (a?.note?.trim()) return true;
        if (a?.photoFile || a?.photoPreview) return true;
      }
    }
  }
  return false;
}

/**
 * Gönder için: Tüm sorular evet/hayır ile cevaplandı, evet sorularında açıklama (ve gerekiyorsa foto) var, F_ref foto zorunlu.
 */
export function isFormComplete(form: DailyFieldCheckFormState): boolean {
  return Object.keys(getFormValidationErrors(form)).length === 0;
}

/** Gönder validasyonu: Tüm sorular evet/hayır; evet → açıklama zorunlu. Foto opsiyonel (F_ref dahil). */
export function getFormValidationErrors(form: DailyFieldCheckFormState): Record<string, string> {
  const err: Record<string, string> = {};
  const add = (sectionKey: string, msg: string) => {
    if (!err[sectionKey]) err[sectionKey] = msg;
  };
  dailyFieldCheckQuestionSet.forEach((section, sectionIndex) => {
    const sectionKey = SECTION_KEYS[sectionIndex] ?? String(sectionIndex);
    section.questions.forEach((q) => {
      const a = form[q.id];
      if (q.type === "photoRequired") {
        return; // Referans foto opsiyonel - zorunluluk kaldırıldı
      }
      const val = a?.value ?? "";
      if (val === "") {
        add(sectionKey, "Tüm soruları cevaplayın.");
        return;
      }
      if (val === "yes") {
        if (!a.note?.trim()) add(sectionKey, "Açıklama zorunludur.");
      }
    });
  });
  return err;
}
