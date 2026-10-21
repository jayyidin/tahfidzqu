import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getDatabase, ref, onValue, set, remove, get, onChildAdded, onChildChanged, onChildRemoved } from "firebase/database";
import { getStorage, ref as storageRef, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

let fbConf = {
  apiKey: "AIzaSyCdfYQeAiBMfAPsBGuzS7qWIoi_u3CaSvE",
  authDomain: "tahfidzqu-7c937.firebaseapp.com",
  projectId: "tahfidzqu-7c937",
  storageBucket: "tahfidzqu-7c937.firebasestorage.app",
  messagingSenderId: "596320735782",
  appId: "1:596320735782:web:340387094ff61f31fecce7",
  databaseURL: "https://tahfidzqu-7c937-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

try {
  if (typeof window !== 'undefined' && typeof window.__firebase_config !== 'undefined' && window.__firebase_config) {
    fbConf = typeof window.__firebase_config === 'string' ? JSON.parse(window.__firebase_config) : window.__firebase_config;
  }
} catch (e) {
  console.warn("Menggunakan Firebase fallback configuration.");
}

export const safeId = (typeof window !== 'undefined' && typeof window.__app_id !== 'undefined' && window.__app_id ? window.__app_id : 'tahfidzqu-v2').replace(/[.#$\[\]]/g, '_');
export const fApp = initializeApp(fbConf);
export const auth = getAuth(fApp);
export const db = getDatabase(fApp);
export const storage = getStorage(fApp);

let fbUser = null;

export const initFirebaseAuth = (onUserChange, onError) => {
  onAuthStateChanged(auth, u => {
    fbUser = u;
    if (onUserChange) onUserChange(u);
  });

  const doAuth = async () => {
    try {
      if (typeof window !== 'undefined' && typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
        await signInWithCustomToken(auth, window.__initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch (e) {
      console.error("Auth Error", e);
      if (onError) onError("Gagal login ke Cloud: Pastikan 'Anonymous Sign-in' telah DIAKTIFKAN di menu Authentication Firebase.");
    }
  };
  doAuth();
};

export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (e) {
    console.error("Google Sign-in Error:", e);
    throw e;
  }
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
    await signInAnonymously(auth);
  } catch (e) {
    console.error("Google Sign-out Error:", e);
    throw e;
  }
};

export const uploadAudioToFirebase = async (base64Data, prefix) => {
  if (!base64Data || !base64Data.startsWith('data:')) return base64Data;
  try {
    const fileName = prefix + '_' + Date.now() + '.webm';
    const fileRef = storageRef(storage, 'audio/' + fileName);
    await uploadString(fileRef, base64Data, 'data_url');
    return await getDownloadURL(fileRef);
  } catch (e) {
    console.error("Storage Error", e);
    return base64Data;
  }
};

export const dbSave = async (col, id, data, onError) => {
  if (fbUser) {
    try {
      await set(ref(db, `artifacts/${safeId}/public/data/${col}/${id}`), data);
    } catch (e) {
      if (onError) onError("Gagal menyimpan data: Aturan (Rules) Database Firebase menolak akses.");
    }
  } else {
    if (onError) onError("Gagal terhubung ke Cloud: Autentikasi Firebase belum aktif.");
  }
};

export const dbSaveCollection = async (col, dataArray, onError) => {
  if (fbUser) {
    try {
      let dataMap = {};
      if (Array.isArray(dataArray)) {
        dataArray.forEach(item => { dataMap[item.id] = item; });
      } else {
        dataMap = dataArray;
      }
      await set(ref(db, `artifacts/${safeId}/public/data/${col}`), dataMap);
    } catch (e) {
      if (onError) onError("Gagal menyimpan koleksi: Aturan Database Firebase menolak akses.");
    }
  }
};

export const dbDelete = async (col, id, onError) => {
  if (fbUser) {
    try {
      await remove(ref(db, `artifacts/${safeId}/public/data/${col}/${id}`));
    } catch (e) {
      if (onError) onError("Gagal menghapus data: Aturan (Rules) Database Firebase menolak akses.");
    }
  }
};

export const exportFullDatabase = async (stateOrEvent) => {
  try {
    let dbData = {};
    if (stateOrEvent && stateOrEvent.juzs && Array.isArray(stateOrEvent.juzs)) {
      dbData = {
        juzs: stateOrEvent.juzs,
        surahs: stateOrEvent.surahs,
        levels: stateOrEvent.levels,
        segs: stateOrEvent.segs,
        ustadz: stateOrEvent.ustadz,
        halaqohs: stateOrEvent.halaqohs,
        siswas: stateOrEvent.siswas,
        subs: stateOrEvent.subs,
        settings: { logo: stateOrEvent.schLogo || '', subtitle: stateOrEvent.schSub || '' }
      };
    } else {
      const snap = await get(ref(db, `artifacts/${safeId}/public/data`));
      const val = snap.val() || {};
      const cols = ['juzs', 'surahs', 'levels', 'segs', 'ustadz', 'halaqohs', 'siswas', 'subs'];
      cols.forEach(col => {
        if (val[col]) {
          dbData[col] = Object.values(val[col]);
        } else {
          dbData[col] = [];
        }
      });
      dbData.settings = val.settings ? { logo: val.settings.app?.logo || '', subtitle: val.settings.app?.subtitle || '' } : { logo: '', subtitle: '' };
    }

    const dataStr = JSON.stringify(dbData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `TahfidzQu_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    alert("Gagal mengekspor database.");
  }
};

export const importFullDatabase = async (e, onConfirm, showAlert) => {
  const f = e.target && e.target.files ? e.target.files[0] : null;
  if (!f) return;

  const doImport = () => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const cols = ['juzs', 'surahs', 'levels', 'segs', 'ustadz', 'halaqohs', 'siswas', 'subs'];
        for (let col of cols) {
          if (data[col] && Array.isArray(data[col])) {
            await dbSaveCollection(col, data[col]);
          }
        }
        if (data.settings) {
          await dbSaveCollection('settings/app', { logo: data.settings.logo || '', subtitle: data.settings.subtitle || '' });
        }
        if (typeof showAlert === 'function') showAlert("Migrasi/Restore Database berhasil! Halaman akan dimuat ulang.");
        else alert("Migrasi/Restore Database berhasil! Halaman akan dimuat ulang.");
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        if (typeof showAlert === 'function') showAlert("Gagal membaca file backup JSON.");
        else alert("Gagal membaca file backup JSON.");
      }
    };
    reader.readAsText(f);
  };

  if (typeof onConfirm === 'function') {
    onConfirm('Peringatan: Mengimpor database akan MENGGANTI semua data saat ini di Cloud. Apakah Anda yakin?', doImport);
  } else if (window.confirm('Peringatan: Mengimpor database akan MENGGANTI semua data saat ini di Cloud. Apakah Anda yakin?')) {
    doImport();
  }
};
