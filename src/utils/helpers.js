export const fmtT = (s) => {
  if (isNaN(s) || s === null || s === undefined) return '00:00';
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
};

export const esc = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
};

export const toArabicNumeral = (en) => {
  return ("" + en).replace(/[0-9]/g, t => String.fromCharCode(t.charCodeAt(0) + 1584));
};

export const extractVideoId = (url) => {
  if (!url) return null;
  const m = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return (m && m[2].length === 11) ? m[2] : null;
};

export const Q_SURAHS = [
  {"no":1,"name":"Al-Fatihah","juz":[1]},{"no":2,"name":"Al-Baqarah","juz":[1,2,3]},{"no":3,"name":"Ali 'Imran","juz":[3,4]},
  {"no":4,"name":"An-Nisa'","juz":[4,5,6]},{"no":5,"name":"Al-Ma'idah","juz":[6,7]},{"no":6,"name":"Al-An'am","juz":[7,8]},
  {"no":7,"name":"Al-A'raf","juz":[8,9]},{"no":8,"name":"Al-Anfal","juz":[9,10]},{"no":9,"name":"At-Taubah","juz":[10,11]},
  {"no":10,"name":"Yunus","juz":[11]},{"no":11,"name":"Hud","juz":[11,12]},{"no":12,"name":"Yusuf","juz":[12,13]},
  {"no":13,"name":"Ar-Ra'd","juz":[13]},{"no":14,"name":"Ibrahim","juz":[13]},{"no":15,"name":"Al-Hijr","juz":[14]},
  {"no":16,"name":"An-Nahl","juz":[14]},{"no":17,"name":"Al-Isra'","juz":[15]},{"no":18,"name":"Al-Kahf","juz":[15,16]},
  {"no":19,"name":"Maryam","juz":[16]},{"no":20,"name":"Taha","juz":[16]},{"no":21,"name":"Al-Anbiya'","juz":[17]},
  {"no":22,"name":"Al-Hajj","juz":[17]},{"no":23,"name":"Al-Mu'minun","juz":[18]},{"no":24,"name":"An-Nur","juz":[18]},
  {"no":25,"name":"Al-Furqan","juz":[18,19]},{"no":26,"name":"Asy-Syu'ara'","juz":[19]},{"no":27,"name":"An-Naml","juz":[19,20]},
  {"no":28,"name":"Al-Qasas","juz":[20]},{"no":29,"name":"Al-'Ankabut","juz":[20,21]},{"no":30,"name":"Ar-Rum","juz":[21]},
  {"no":31,"name":"Luqman","juz":[21]},{"no":32,"name":"As-Sajdah","juz":[21]},{"no":33,"name":"Al-Ahzab","juz":[21,22]},
  {"no":34,"name":"Saba'","juz":[22]},{"no":35,"name":"Fatir","juz":[22]},{"no":36,"name":"Yasin","juz":[22,23]},
  {"no":37,"name":"As-Saffat","juz":[23]},{"no":38,"name":"Sad","juz":[23]},{"no":39,"name":"Az-Zumar","juz":[23,24]},
  {"no":40,"name":"Ghafir","juz":[24]},{"no":41,"name":"Fussilat","juz":[24,25]},{"no":42,"name":"Asy-Syura","juz":[25]},
  {"no":43,"name":"Az-Zukhruf","juz":[25]},{"no":44,"name":"Ad-Dukhan","juz":[25]},{"no":45,"name":"Al-Jasiyah","juz":[25]},
  {"no":46,"name":"Al-Ahqaf","juz":[26]},{"no":47,"name":"Muhammad","juz":[26]},{"no":48,"name":"Al-Fath","juz":[26]},
  {"no":49,"name":"Al-Hujurat","juz":[26]},{"no":50,"name":"Qaf","juz":[26]},{"no":51,"name":"Az-Zariyat","juz":[26,27]},
  {"no":52,"name":"At-Tur","juz":[27]},{"no":53,"name":"An-Najm","juz":[27]},{"no":54,"name":"Al-Qamar","juz":[27]},
  {"no":55,"name":"Ar-Rahman","juz":[27]},{"no":56,"name":"Al-Waqi'ah","juz":[27]},{"no":57,"name":"Al-Hadid","juz":[27]},
  {"no":58,"name":"Al-Mujadilah","juz":[28]},{"no":59,"name":"Al-Hasyr","juz":[28]},{"no":60,"name":"Al-Mumtahanah","juz":[28]},
  {"no":61,"name":"As-Saff","juz":[28]},{"no":62,"name":"Al-Jumu'ah","juz":[28]},{"no":63,"name":"Al-Munafiqun","juz":[28]},
  {"no":64,"name":"At-Tagabun","juz":[28]},{"no":65,"name":"At-Talaq","juz":[28]},{"no":66,"name":"At-Tahrim","juz":[28]},
  {"no":67,"name":"Al-Mulk","juz":[29]},{"no":68,"name":"Al-Qalam","juz":[29]},{"no":69,"name":"Al-Haqqah","juz":[29]},
  {"no":70,"name":"Al-Ma'arij","juz":[29]},{"no":71,"name":"Nuh","juz":[29]},{"no":72,"name":"Al-Jinn","juz":[29]},
  {"no":73,"name":"Al-Muzzammil","juz":[29]},{"no":74,"name":"Al-Muddassir","juz":[29]},{"no":75,"name":"Al-Qiyamah","juz":[29]},
  {"no":76,"name":"Al-Insan","juz":[29]},{"no":77,"name":"Al-Mursalat","juz":[29]},{"no":78,"name":"An-Naba'","juz":[30]},
  {"no":79,"name":"An-Nazi'at","juz":[30]},{"no":80,"name":"'Abasa","juz":[30]},{"no":81,"name":"At-Takwir","juz":[30]},
  {"no":82,"name":"Al-Infitar","juz":[30]},{"no":83,"name":"Al-Mutaffifin","juz":[30]},{"no":84,"name":"Al-Insyiqaq","juz":[30]},
  {"no":85,"name":"Al-Buruj","juz":[30]},{"no":86,"name":"At-Tariq","juz":[30]},{"no":87,"name":"Al-A'la","juz":[30]},
  {"no":88,"name":"Al-Gasyiyah","juz":[30]},{"no":89,"name":"Al-Fajr","juz":[30]},{"no":90,"name":"Al-Balad","juz":[30]},
  {"no":91,"name":"Asy-Syams","juz":[30]},{"no":92,"name":"Al-Lail","juz":[30]},{"no":93,"name":"Ad-Duha","juz":[30]},
  {"no":94,"name":"Al-Insyirah","juz":[30]},{"no":95,"name":"At-Tin","juz":[30]},{"no":96,"name":"Al-'Alaq","juz":[30]},
  {"no":97,"name":"Al-Qadr","juz":[30]},{"no":98,"name":"Al-Bayyinah","juz":[30]},{"no":99,"name":"Az-Zalzalah","juz":[30]},
  {"no":100,"name":"Al-'Adiyat","juz":[30]},{"no":101,"name":"Al-Qari'ah","juz":[30]},{"no":102,"name":"At-Takasur","juz":[30]},
  {"no":103,"name":"Al-'Asr","juz":[30]},{"no":104,"name":"Al-Humazah","juz":[30]},{"no":105,"name":"Al-Fil","juz":[30]},
  {"no":106,"name":"Quraisy","juz":[30]},{"no":107,"name":"Al-Ma'un","juz":[30]},{"no":108,"name":"Al-Kausar","juz":[30]},
  {"no":109,"name":"Al-Kafirun","juz":[30]},{"no":110,"name":"An-Nasr","juz":[30]},{"no":111,"name":"Al-Lahab","juz":[30]},
  {"no":112,"name":"Al-Ikhlas","juz":[30]},{"no":113,"name":"Al-Falaq","juz":[30]},{"no":114,"name":"An-Nas","juz":[30]}
];
