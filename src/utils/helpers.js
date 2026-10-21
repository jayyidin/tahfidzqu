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
  {"no":1,"name":"Al-Fatihah","arti":"Pembukaan","ayat":7,"juz":[1]},{"no":2,"name":"Al-Baqarah","arti":"Sapi Betina","ayat":286,"juz":[1,2,3]},{"no":3,"name":"Ali 'Imran","arti":"Keluarga Imran","ayat":200,"juz":[3,4]},
  {"no":4,"name":"An-Nisa'","arti":"Wanita","ayat":176,"juz":[4,5,6]},{"no":5,"name":"Al-Ma'idah","arti":"Jamuan","ayat":120,"juz":[6,7]},{"no":6,"name":"Al-An'am","arti":"Hewan Ternak","ayat":165,"juz":[7,8]},
  {"no":7,"name":"Al-A'raf","arti":"Tempat Tertinggi","ayat":206,"juz":[8,9]},{"no":8,"name":"Al-Anfal","arti":"Rampasan Perang","ayat":75,"juz":[9,10]},{"no":9,"name":"At-Taubah","arti":"Pengampunan","ayat":129,"juz":[10,11]},
  {"no":10,"name":"Yunus","arti":"Nabi Yunus","ayat":109,"juz":[11]},{"no":11,"name":"Hud","arti":"Nabi Hud","ayat":123,"juz":[11,12]},{"no":12,"name":"Yusuf","arti":"Nabi Yusuf","ayat":111,"juz":[12,13]},
  {"no":13,"name":"Ar-Ra'd","arti":"Guruh","ayat":43,"juz":[13]},{"no":14,"name":"Ibrahim","arti":"Nabi Ibrahim","ayat":52,"juz":[13]},{"no":15,"name":"Al-Hijr","arti":"Lembah Hijr","ayat":99,"juz":[14]},
  {"no":16,"name":"An-Nahl","arti":"Lebah","ayat":128,"juz":[14]},{"no":17,"name":"Al-Isra'","arti":"Memperjalankan Malam Hari","ayat":111,"juz":[15]},{"no":18,"name":"Al-Kahf","arti":"Gua","ayat":110,"juz":[15,16]},
  {"no":19,"name":"Maryam","arti":"Maryam","ayat":98,"juz":[16]},{"no":20,"name":"Taha","arti":"Taha","ayat":135,"juz":[16]},{"no":21,"name":"Al-Anbiya'","arti":"Nabi-Nabi","ayat":112,"juz":[17]},
  {"no":22,"name":"Al-Hajj","arti":"Haji","ayat":78,"juz":[17]},{"no":23,"name":"Al-Mu'minun","arti":"Orang-Orang Mukmin","ayat":118,"juz":[18]},{"no":24,"name":"An-Nur","arti":"Cahaya","ayat":64,"juz":[18]},
  {"no":25,"name":"Al-Furqan","arti":"Pembeda","ayat":77,"juz":[18,19]},{"no":26,"name":"Asy-Syu'ara'","arti":"Penyair","ayat":227,"juz":[19]},{"no":27,"name":"An-Naml","arti":"Semut","ayat":93,"juz":[19,20]},
  {"no":28,"name":"Al-Qasas","arti":"Kisah-Kisah","ayat":88,"juz":[20]},{"no":29,"name":"Al-'Ankabut","arti":"Laba-Laba","ayat":69,"juz":[20,21]},{"no":30,"name":"Ar-Rum","arti":"Bangsa Romawi","ayat":60,"juz":[21]},
  {"no":31,"name":"Luqman","arti":"Keluarga Luqman","ayat":34,"juz":[21]},{"no":32,"name":"As-Sajdah","arti":"Sujud","ayat":30,"juz":[21]},{"no":33,"name":"Al-Ahzab","arti":"Golongan Bersekutu","ayat":73,"juz":[21,22]},
  {"no":34,"name":"Saba'","arti":"Kaum Saba'","ayat":54,"juz":[22]},{"no":35,"name":"Fatir","arti":"Pencipta","ayat":45,"juz":[22]},{"no":36,"name":"Yasin","arti":"Yasin","ayat":83,"juz":[22,23]},
  {"no":37,"name":"As-Saffat","arti":"Barisan-Barisan","ayat":182,"juz":[23]},{"no":38,"name":"Sad","arti":"Sad","ayat":88,"juz":[23]},{"no":39,"name":"Az-Zumar","arti":"Rombongan","ayat":75,"juz":[23,24]},
  {"no":40,"name":"Ghafir","arti":"Maha Pengampun","ayat":85,"juz":[24]},{"no":41,"name":"Fussilat","arti":"Yang Dijelaskan","ayat":54,"juz":[24,25]},{"no":42,"name":"Asy-Syura","arti":"Musyawarah","ayat":53,"juz":[25]},
  {"no":43,"name":"Az-Zukhruf","arti":"Perhiasan","ayat":89,"juz":[25]},{"no":44,"name":"Ad-Dukhan","arti":"Kabut","ayat":59,"juz":[25]},{"no":45,"name":"Al-Jasiyah","arti":"Yang Berlutut","ayat":37,"juz":[25]},
  {"no":46,"name":"Al-Ahqaf","arti":"Bukit Pasir","ayat":35,"juz":[26]},{"no":47,"name":"Muhammad","arti":"Nabi Muhammad","ayat":38,"juz":[26]},{"no":48,"name":"Al-Fath","arti":"Kemenangan","ayat":29,"juz":[26]},
  {"no":49,"name":"Al-Hujurat","arti":"Kamar-Kamar","ayat":18,"juz":[26]},{"no":50,"name":"Qaf","arti":"Qaf","ayat":45,"juz":[26]},{"no":51,"name":"Az-Zariyat","arti":"Angin yang Menerbangkan","ayat":60,"juz":[26,27]},
  {"no":52,"name":"At-Tur","arti":"Bukit","ayat":49,"juz":[27]},{"no":53,"name":"An-Najm","arti":"Bintang","ayat":62,"juz":[27]},{"no":54,"name":"Al-Qamar","arti":"Bulan","ayat":55,"juz":[27]},
  {"no":55,"name":"Ar-Rahman","arti":"Yang Maha Pemurah","ayat":78,"juz":[27]},{"no":56,"name":"Al-Waqi'ah","arti":"Hari Kiamat","ayat":96,"juz":[27]},{"no":57,"name":"Al-Hadid","arti":"Besi","ayat":29,"juz":[27]},
  {"no":58,"name":"Al-Mujadilah","arti":"Gugatan","ayat":22,"juz":[28]},{"no":59,"name":"Al-Hasyr","arti":"Pengusiran","ayat":24,"juz":[28]},{"no":60,"name":"Al-Mumtahanah","arti":"Wanita yang Diuji","ayat":13,"juz":[28]},
  {"no":61,"name":"As-Saff","arti":"Barisan","ayat":14,"juz":[28]},{"no":62,"name":"Al-Jumu'ah","arti":"Hari Jumat","ayat":11,"juz":[28]},{"no":63,"name":"Al-Munafiqun","arti":"Orang-Orang Munafik","ayat":11,"juz":[28]},
  {"no":64,"name":"At-Tagabun","arti":"Hari Ditampakkan Kesalahan","ayat":18,"juz":[28]},{"no":65,"name":"At-Talaq","arti":"Perceraian","ayat":12,"juz":[28]},{"no":66,"name":"At-Tahrim","arti":"Mengharamkan","ayat":12,"juz":[28]},
  {"no":67,"name":"Al-Mulk","arti":"Kerajaan","ayat":30,"juz":[29]},{"no":68,"name":"Al-Qalam","arti":"Pena","ayat":52,"juz":[29]},{"no":69,"name":"Al-Haqqah","arti":"Hari Kiamat","ayat":52,"juz":[29]},
  {"no":70,"name":"Al-Ma'arij","arti":"Tempat Naik","ayat":44,"juz":[29]},{"no":71,"name":"Nuh","arti":"Nabi Nuh","ayat":28,"juz":[29]},{"no":72,"name":"Al-Jinn","arti":"Jin","ayat":28,"juz":[29]},
  {"no":73,"name":"Al-Muzzammil","arti":"Orang yang Berselimut","ayat":20,"juz":[29]},{"no":74,"name":"Al-Muddassir","arti":"Orang yang Berkemul","ayat":56,"juz":[29]},
  {"no":75,"name":"Al-Qiyamah","arti":"Hari Berbangkit","ayat":40,"juz":[29]},{"no":76,"name":"Al-Insan","arti":"Manusia","ayat":31,"juz":[29]},{"no":77,"name":"Al-Mursalat","arti":"Malaikat yang Diutus","ayat":50,"juz":[29]},
  {"no":78,"name":"An-Naba'","arti":"Berita Besar","ayat":40,"juz":[30]},{"no":79,"name":"An-Nazi'at","arti":"Malaikat Pencabut","ayat":46,"juz":[30]},{"no":80,"name":"'Abasa","arti":"Bermuka Masam","ayat":42,"juz":[30]},
  {"no":81,"name":"At-Takwir","arti":"Menggulung","ayat":29,"juz":[30]},{"no":82,"name":"Al-Infitar","arti":"Terbelah","ayat":19,"juz":[30]},{"no":83,"name":"Al-Mutaffifin","arti":"Orang-Orang Curang","ayat":36,"juz":[30]},
  {"no":84,"name":"Al-Insyiqaq","arti":"Terbelah","ayat":25,"juz":[30]},{"no":85,"name":"Al-Buruj","arti":"Gugusan Bintang","ayat":22,"juz":[30]},{"no":86,"name":"At-Tariq","arti":"Yang Datang di Malam Hari","ayat":17,"juz":[30]},
  {"no":87,"name":"Al-A'la","arti":"Yang Paling Tinggi","ayat":19,"juz":[30]},{"no":88,"name":"Al-Gasyiyah","arti":"Hari Pembalasan","ayat":26,"juz":[30]},{"no":89,"name":"Al-Fajr","arti":"Fajar","ayat":30,"juz":[30]},
  {"no":90,"name":"Al-Balad","arti":"Negeri","ayat":20,"juz":[30]},{"no":91,"name":"Asy-Syams","arti":"Matahari","ayat":15,"juz":[30]},{"no":92,"name":"Al-Lail","arti":"Malam","ayat":21,"juz":[30]},
  {"no":93,"name":"Ad-Duha","arti":"Waktu Dhuha","ayat":11,"juz":[30]},{"no":94,"name":"Al-Insyirah","arti":"Melapangkan","ayat":8,"juz":[30]},{"no":95,"name":"At-Tin","arti":"Buah Tin","ayat":8,"juz":[30]},
  {"no":96,"name":"Al-'Alaq","arti":"Segumpal Darah","ayat":19,"juz":[30]},{"no":97,"name":"Al-Qadr","arti":"Kemuliaan","ayat":5,"juz":[30]},{"no":98,"name":"Al-Bayyinah","arti":"Bukti Nyata","ayat":8,"juz":[30]},
  {"no":99,"name":"Az-Zalzalah","arti":"Keguncangan","ayat":8,"juz":[30]},{"no":100,"name":"Al-'Adiyat","arti":"Kuda Perang","ayat":11,"juz":[30]},{"no":101,"name":"Al-Qari'ah","arti":"Hari Kiamat","ayat":11,"juz":[30]},
  {"no":102,"name":"At-Takasur","arti":"Bermegah-megahan","ayat":8,"juz":[30]},{"no":103,"name":"Al-'Asr","arti":"Masa","ayat":3,"juz":[30]},{"no":104,"name":"Al-Humazah","arti":"Pengumpat","ayat":9,"juz":[30]},
  {"no":105,"name":"Al-Fil","arti":"Gajah","ayat":5,"juz":[30]},{"no":106,"name":"Quraisy","arti":"Kaum Quraisy","ayat":4,"juz":[30]},{"no":107,"name":"Al-Ma'un","arti":"Barang yang Berguna","ayat":7,"juz":[30]},
  {"no":108,"name":"Al-Kausar","arti":"Nikmat yang Berlimpah","ayat":3,"juz":[30]},{"no":109,"name":"Al-Kafirun","arti":"Orang-Orang Kafir","ayat":6,"juz":[30]},{"no":110,"name":"An-Nasr","arti":"Pertolongan","ayat":3,"juz":[30]},
  {"no":111,"name":"Al-Lahab","arti":"Gejolak Api","ayat":5,"juz":[30]},{"no":112,"name":"Al-Ikhlas","arti":"Keesaan Allah","ayat":4,"juz":[30]},{"no":113,"name":"Al-Falaq","arti":"Waktu Subuh","ayat":5,"juz":[30]},
  {"no":114,"name":"An-Nas","arti":"Manusia","ayat":6,"juz":[30]}
];
