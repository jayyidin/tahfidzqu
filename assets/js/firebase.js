﻿import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getDatabase, ref, onValue, set, remove, get, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
    import { getStorage, ref as storageRef, uploadString, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

    let fbConf = {
        apiKey: "AIzaSyCdfYQeAiBMfAPsBGuzS7qWIoi_u3CaSvE", authDomain: "tahfidzqu-7c937.firebaseapp.com",
        projectId: "tahfidzqu-7c937", storageBucket: "tahfidzqu-7c937.firebasestorage.app",
        messagingSenderId: "596320735782", appId: "1:596320735782:web:340387094ff61f31fecce7",
        databaseURL: "https://tahfidzqu-7c937-default-rtdb.asia-southeast1.firebasedatabase.app/" 
    };

    try {
        if (typeof __firebase_config !== 'undefined' && __firebase_config) {
            fbConf = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
        }
    } catch(e) {
        console.warn("Menggunakan Firebase fallback ustadz.");
    }

    const safeId = (typeof __app_id !== 'undefined' && __app_id ? __app_id : 'tahfidzqu-v2').replace(/[.#$\[\]]/g, '_');
    const fApp = initializeApp(fbConf);
    const auth = getAuth(fApp);
    const db = getDatabase(fApp);
    const storage = getStorage(fApp);
    let fbUser = null;

    window.uploadAudioToFirebase = async (base64Data, prefix) => {
        if (!base64Data || !base64Data.startsWith('data:')) return base64Data;
        try {
            const fileName = prefix + '_' + Date.now() + '.webm';
            const fileRef = storageRef(storage, 'audio/' + fileName);
            await uploadString(fileRef, base64Data, 'data_url');
            return await getDownloadURL(fileRef);
        } catch (e) {
            console.error("Storage Error", e);
            return base64Data; // fallback ke base64 jika storage gagal
        }
    };

    window.cleanupOldAudio = async (defaultDays = 30) => {
        let inputDays = prompt("Masukkan batas usia rekaman (dalam hari) yang ingin dihapus:\nContoh: 7 untuk 1 minggu, 30 untuk 1 bulan.", defaultDays);
        if (inputDays === null) return;
        let days = parseInt(inputDays);
        if (isNaN(days) || days < 0) { window.showAlert("Masukkan jumlah hari yang valid!"); return; }
        
        window.showConfirm(`Yakin ingin menghapus permanen semua file audio rekaman yang usianya lebih dari ${days} hari? Data teks dan nilai akan tetap aman.`, async function() {
            window.App.isLoading = true; window.App.loadingProgress = 0; window.App.loadingMessage = 'Mencari rekaman lama...'; window.render(true);
            
            let threshold = Date.now() - (days * 24 * 60 * 60 * 1000);
            let oldSubs = window.App.subs.filter(s => s.id < threshold && (s.audioUrl || s.voiceNote));
            
            if (oldSubs.length === 0) {
                window.App.isLoading = false; window.showAlert(`Tidak ada rekaman audio yang usianya lebih dari ${days} hari.`); window.render(true); return;
            }

            let total = oldSubs.length; let processed = 0;
            for (let sub of oldSubs) {
                let updated = false;
                if (sub.audioUrl) {
                    if (sub.audioUrl.startsWith('http')) { try { await deleteObject(storageRef(storage, sub.audioUrl)); } catch(e) {} }
                    sub.audioUrl = null; updated = true;
                }
                if (sub.voiceNote) {
                    if (sub.voiceNote.startsWith('http')) { try { await deleteObject(storageRef(storage, sub.voiceNote)); } catch(e) {} }
                    sub.voiceNote = null; updated = true;
                }
                if (updated && window.dbSave) await window.dbSave('subs', sub.id, sub);
                processed++; window.App.loadingProgress = Math.round((processed / total) * 100); window.App.loadingMessage = `Menghapus rekaman (${processed}/${total})...`; window.render(true);
            }
            window.App.isLoading = false; window.showAlert(`Berhasil membersihkan ${processed} data rekaman lama.`); window.render(true);
        });
    };

    window.dbSave = async (col, id, data) => { 
        if(fbUser) {
            try {
                await set(ref(db, `artifacts/${safeId}/public/data/${col}/${id}`), data);
            } catch(e) {
                window.App.firebaseError = "Gagal menyimpan data: Aturan (Rules) Database Firebase menolak akses.";
                window.render();
            }
        } else {
            window.App.firebaseError = "Gagal terhubung ke Cloud: Autentikasi Firebase belum aktif.";
            window.render();
        }
    };
    
    window.dbSaveCollection = async (col, dataArray) => {
        if(fbUser) {
            try {
                let dataMap = {};
                if (Array.isArray(dataArray)) { dataArray.forEach(item => { dataMap[item.id] = item; }); } else { dataMap = dataArray; }
                await set(ref(db, `artifacts/${safeId}/public/data/${col}`), dataMap);
            } catch(e) {
                window.App.firebaseError = "Gagal menyimpan koleksi: Aturan Database Firebase menolak akses.";
                window.render();
            }
        }
    };

    window.dbDelete = async (col, id) => { 
        if(fbUser) {
            try {
                await remove(ref(db, `artifacts/${safeId}/public/data/${col}/${id}`));
            } catch(e) {
                window.App.firebaseError = "Gagal menghapus data: Aturan (Rules) Database Firebase menolak akses.";
                window.render();
            }
        }
    };

    window.render(true);

    const initAuth = async () => {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        } catch (e) { 
            console.error("Auth Error", e);
            window.App.firebaseError = "Gagal login ke Cloud: Pastikan 'Anonymous Sign-in' telah DIAKTIFKAN di menu Authentication Firebase.";
                window.App.isFetchingSubs = false;
            window.render();
        }
    };
    initAuth();

    onAuthStateChanged(auth, u => {
       fbUser = u; if(!u) return;

       window.syncFirebaseData = async () => {
          if (!fbUser) return;
          const collections = ['juzs','surahs','levels','segs','ustadz','halaqohs','siswas','subs'];
          const promises = collections.map(c => get(ref(db, `artifacts/${safeId}/public/data/${c}`)));
          promises.push(get(ref(db, `artifacts/${safeId}/public/data/settings/app`)));
          
          const snapshots = await Promise.all(promises);
          snapshots.forEach((snap, i) => {
             const obj = snap.val();
             if (i < collections.length) {
                const c = collections[i];
                window.App[c] = obj ? Object.keys(obj).map(k => ({id: isNaN(k) ? k : Number(k), ...obj[k]})) : [];
                    if (c === 'subs') window.App.isFetchingSubs = false;
                if (c === 'juzs' && window.App.juzs.length > 0) {
                    if (!window.App.juzs.some(j => j.id == window.App.actJuzId)) {
                        let defaultJuz = window.App.juzs.find(j => j.id == 30 || String(j.name).includes("30"));
                        window.App.actJuzId = defaultJuz ? defaultJuz.id : window.App.juzs[0].id;
                    }
                }
             } else if (obj) {
                window.App.schLogo = obj.logo || '';
                window.App.schSub = obj.subtitle || '';
             }
          });
       };

       onValue(ref(db, `artifacts/${safeId}/public/data/settings/app`), snap => {
           const obj = snap.val();
           if(obj) {
               window.App.schLogo = obj.logo || '';
               window.App.schSub = obj.subtitle || '';
               try {
                   localStorage.setItem('tahfidzqu_logo', window.App.schLogo);
                   localStorage.setItem('tahfidzqu_subtitle', window.App.schSub);
               } catch(e) {}
               window.render();
           }
       });

       ['juzs','surahs','levels','segs','ustadz','halaqohs','siswas','subs'].forEach(c => {
          const colRef = ref(db, `artifacts/${safeId}/public/data/${c}`);
          window.App[c] = [];
          
          let initialSyncDone = false;

          onChildAdded(colRef, snap => {
              if (!initialSyncDone) return;
              const val = snap.val();
              const id = isNaN(snap.key) ? snap.key : Number(snap.key);
              if (!window.App[c].some(x => x.id === id)) {
                  window.App[c].push({id, ...val});
                  window.render();
              }
          });
          
          onChildChanged(colRef, snap => {
              if (!initialSyncDone) return;
              const val = snap.val();
              const id = isNaN(snap.key) ? snap.key : Number(snap.key);
              const idx = window.App[c].findIndex(x => x.id === id);
              if (idx !== -1) {
                  window.App[c][idx] = {id, ...val};
                  window.render();
              }
          });
          
          onChildRemoved(colRef, snap => {
              if (!initialSyncDone) return;
              const id = isNaN(snap.key) ? snap.key : Number(snap.key);
              window.App[c] = window.App[c].filter(x => x.id !== id);
              window.render();
          });

          onValue(colRef, snap => {
             const obj = snap.val();
             window.App[c] = obj ? Object.keys(obj).map(k => ({id: isNaN(k) ? k : Number(k), ...obj[k]})) : [];
             initialSyncDone = true;

             if (c === 'subs') {
                 window.App.isFetchingSubs = false;
             }
             if (c === 'juzs' && window.App.juzs.length > 0) {
                 if (!window.App.juzs.some(j => j.id == window.App.actJuzId)) {
                     let defaultJuz = window.App.juzs.find(j => j.id == 30 || String(j.name).includes("30"));
                     window.App.actJuzId = defaultJuz ? defaultJuz.id : window.App.juzs[0].id;
                 }
             }
             window.render();
          }, error => {
             console.error(error);
             if (error.message && (error.message.includes('permission_denied') || error.code === 'PERMISSION_DENIED')) {
                 window.App.firebaseError = "Akses Cloud Ditolak! Ubah Aturan (Rules) Realtime Database Anda menjadi '.read': true dan '.write': true";
                 window.App.isFetchingSubs = false;
                 window.render();
             }
          }, { onlyOnce: true });
       });
       
       setInterval(() => {
          if (window.App.view === 'player' && window.App.isPlay && window.App.yt && typeof window.App.yt.getCurrentTime === 'function' && window.App.actSurahId) {
             var t = window.App.yt.getCurrentTime(); var sg = window.getActSeg(); if(!sg) return;
             if(window.getEl('time-display')) window.getEl('time-display').innerText = `${window.fmtT(t)} / ${window.fmtT(sg.end)}`;
             var td = window.getSgs().slice(-1)[0]?.end || 200;
             if(window.getEl('current-time-indicator')) window.getEl('current-time-indicator').style.left = `${Math.min(100, (t/td)*100)}%`;
             if (t >= sg.end) {
                if (window.App.curRep + 1 < window.App.repTarget) { window.App.yt.seekTo(sg.start); window.App.curRep++; if(window.getEl('rep-text')) window.getEl('rep-text').innerText = `(Ke-${window.App.curRep+1})`; }
                else { window.App.yt.pauseVideo(); window.App.isPlay = false; window.App.curRep = 0; if(window.getEl('rep-text')) window.getEl('rep-text').innerText = ''; }
             }
          }
       }, 200);
    });