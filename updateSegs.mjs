import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getDatabase, ref, get, set } from "firebase/database";

const fbConf = {
  apiKey: "AIzaSyCdfYQeAiBMfAPsBGuzS7qWIoi_u3CaSvE",
  authDomain: "tahfidzqu-7c937.firebaseapp.com",
  projectId: "tahfidzqu-7c937",
  storageBucket: "tahfidzqu-7c937.firebasestorage.app",
  messagingSenderId: "596320735782",
  appId: "1:596320735782:web:340387094ff61f31fecce7",
  databaseURL: "https://tahfidzqu-7c937-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(fbConf);
const auth = getAuth(app);
const db = getDatabase(app);

const safeId = 'tahfidzqu-v2';

const Q_SURAHS = [
  { no: 1, name: "Al-Fatihah" }, { no: 2, name: "Al-Baqarah" }, { no: 3, name: "Ali 'Imran" },
  { no: 4, name: "An-Nisa'" }, { no: 5, name: "Al-Ma'idah" }, { no: 6, name: "Al-An'am" },
  { no: 7, name: "Al-A'raf" }, { no: 8, name: "Al-Anfal" }, { no: 9, name: "At-Taubah" },
  { no: 10, name: "Yunus" }, { no: 11, name: "Hud" }, { no: 12, name: "Yusuf" },
  { no: 13, name: "Ar-Ra'd" }, { no: 14, name: "Ibrahim" }, { no: 15, name: "Al-Hijr" },
  { no: 16, name: "An-Nahl" }, { no: 17, name: "Al-Isra'" }, { no: 18, name: "Al-Kahf" },
  { no: 19, name: "Maryam" }, { no: 20, name: "Taha" }, { no: 21, name: "Al-Anbiya'" },
  { no: 22, name: "Al-Hajj" }, { no: 23, name: "Al-Mu'minun" }, { no: 24, name: "An-Nur" },
  { no: 25, name: "Al-Furqan" }, { no: 26, name: "Asy-Syu'ara'" }, { no: 27, name: "An-Naml" },
  { no: 28, name: "Al-Qasas" }, { no: 29, name: "Al-'Ankabut" }, { no: 30, name: "Ar-Rum" },
  { no: 31, name: "Luqman" }, { no: 32, name: "As-Sajdah" }, { no: 33, name: "Al-Ahzab" },
  { no: 34, name: "Saba'" }, { no: 35, name: "Fatir" }, { no: 36, name: "Ya Sin" },
  { no: 37, name: "As-Saffat" }, { no: 38, name: "Sad" }, { no: 39, name: "Az-Zumar" },
  { no: 40, name: "Gafir" }, { no: 41, name: "Fussilat" }, { no: 42, name: "Asy-Syura" },
  { no: 43, name: "Az-Zukhruf" }, { no: 44, name: "Ad-Dukhan" }, { no: 45, name: "Al-Jasiyah" },
  { no: 46, name: "Al-Ahqaf" }, { no: 47, name: "Muhammad" }, { no: 48, name: "Al-Fath" },
  { no: 49, name: "Al-Hujurat" }, { no: 50, name: "Qaf" }, { no: 51, name: "Az-Zariyat" },
  { no: 52, name: "At-Tur" }, { no: 53, name: "An-Najm" }, { no: 54, name: "Al-Qamar" },
  { no: 55, name: "Ar-Rahman" }, { no: 56, name: "Al-Waqi'ah" }, { no: 57, name: "Al-Hadid" },
  { no: 58, name: "Al-Mujadalah" }, { no: 59, name: "Al-Hasyr" }, { no: 60, name: "Al-Mumtahanah" },
  { no: 61, name: "As-Saff" }, { no: 62, name: "Al-Jumu'ah" }, { no: 63, name: "Al-Munafiqun" },
  { no: 64, name: "At-Tagabun" }, { no: 65, name: "At-Talaq" }, { no: 66, name: "At-Tahrim" },
  { no: 67, name: "Al-Mulk" }, { no: 68, name: "Al-Qalam" }, { no: 69, name: "Al-Haqqah" },
  { no: 70, name: "Al-Ma'arij" }, { no: 71, name: "Nuh" }, { no: 72, name: "Al-Jinn" },
  { no: 73, name: "Al-Muzzammil" }, { no: 74, name: "Al-Muddassir" }, { no: 75, name: "Al-Qiyamah" },
  { no: 76, name: "Al-Insan" }, { no: 77, name: "Al-Mursalat" }, { no: 78, name: "An-Naba'" },
  { no: 79, name: "An-Nazi'at" }, { no: 80, name: "'Abasa" }, { no: 81, name: "At-Takwir" },
  { no: 82, name: "Al-Infitar" }, { no: 83, name: "Al-Mutaffifin" }, { no: 84, name: "Al-Insyiqaq" },
  { no: 85, name: "Al-Buruj" }, { no: 86, name: "At-Tariq" }, { no: 87, name: "Al-A'la" },
  { no: 88, name: "Al-Gasyiyah" }, { no: 89, name: "Al-Fajr" }, { no: 90, name: "Al-Balad" },
  { no: 91, name: "Asy-Syams" }, { no: 92, name: "Al-Lail" }, { no: 93, name: "Ad-Duha" },
  { no: 94, name: "Asy-Syarh" }, { no: 95, name: "At-Tin" }, { no: 96, name: "Al-'Alaq" },
  { no: 97, name: "Al-Qadr" }, { no: 98, name: "Al-Bayyinah" }, { no: 99, name: "Az-Zalzalah" },
  { no: 100, name: "Al-'Adiyat" }, { no: 101, name: "Al-Qari'ah" }, { no: 102, name: "At-Takasur" },
  { no: 103, name: "Al-'Asr" }, { no: 104, name: "Al-Humazah" }, { no: 105, name: "Al-Fil" },
  { no: 106, name: "Quraisy" }, { no: 107, name: "Al-Ma'un" }, { no: 108, name: "Al-Kausar" },
  { no: 109, name: "Al-Kafirun" }, { no: 110, name: "An-Nasr" }, { no: 111, name: "Al-Lahab" },
  { no: 112, name: "Al-Ikhlas" }, { no: 113, name: "Al-Falaq" }, { no: 114, name: "An-Nas" }
];

async function run() {
  console.log("Signing in...");
  await signInAnonymously(auth);
  
  console.log("Fetching surahs...");
  const surahsSnap = await get(ref(db, `artifacts/${safeId}/public/data/surahs`));
  const surahsObj = surahsSnap.val() || {};
  const surahs = Object.values(surahsObj);
  
  console.log("Fetching segments...");
  const segsSnap = await get(ref(db, `artifacts/${safeId}/public/data/segs`));
  const segsObj = segsSnap.val() || {};
  const segs = Object.values(segsObj);
  
  console.log(`Found ${segs.length} segments.`);
  
  let updatedCount = 0;
  
  for (const sg of segs) {
    if (!sg.surahId) continue;
    const sur = surahs.find(s => s.id === sg.surahId);
    if (!sur) continue;
    
    let surahNo = sur.no;
    if (!surahNo) {
      const matched = Q_SURAHS.find(q => sur.title && sur.title.toLowerCase().includes(q.name.toLowerCase()));
      if (matched) surahNo = matched.no;
    }
    if (!surahNo) continue;
    
    // Determine start and end ayah from title
    let sStart = 1, sEnd = 1;
    if (sg.title) {
      const match = sg.title.match(/\d+/g);
      if (match) {
        sStart = parseInt(match[0]) || 1;
        sEnd = match.length > 1 ? parseInt(match[1]) || sStart : sStart;
      }
    }
    
    if (sStart > sEnd) continue;
    
    // Fetch from equran.id
    const requestedAyahs = new Set();
    for (let i = sStart; i <= sEnd; i++) {
      requestedAyahs.add(i);
    }
    
    try {
      const res = await fetch(`https://equran.id/api/v2/surat/${surahNo}`);
      const data = await res.json();
      
      if (data && data.code === 200 && data.data && data.data.ayat) {
        const ayahs = data.data.ayat.filter(a => requestedAyahs.has(a.nomorAyat));
        if (ayahs.length > 0) {
          const toArabicNumber = (num) => {
            const digits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
            return num.toString().split('').map(d => digits[d]).join('');
          };
          const combinedArabic = ayahs.map(a => `${a.teksArab} ۝${toArabicNumber(a.nomorAyat)}`).join(' ');
          const combinedTranslation = ayahs.map(a => `(${a.nomorAyat}) ${a.teksIndonesia}`).join('\n');
          
          if (sg.arabic !== combinedArabic || sg.translation !== combinedTranslation) {
            console.log(`Updating segment ${sg.title} in surah ${sur.title}...`);
            await set(ref(db, `artifacts/${safeId}/public/data/segs/${sg.id}/arabic`), combinedArabic);
            await set(ref(db, `artifacts/${safeId}/public/data/segs/${sg.id}/translation`), combinedTranslation);
            updatedCount++;
          }
        }
      }
    } catch (e) {
      console.error(`Failed to fetch equran for surahNo ${surahNo}:`, e);
    }
    
    // sleep to prevent rate limiting
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`Done! Updated ${updatedCount} segments.`);
  process.exit(0);
}

run().catch(console.error);
