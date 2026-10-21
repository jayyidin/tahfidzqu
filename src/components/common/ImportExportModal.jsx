import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { dbSave } from '../../services/firebase';
import { esc } from '../../utils/helpers';

export const ImportExportModal = () => {
  const {
    modal, setModal,
    modalData,
    hierSel,
    ustadz, halaqohs, siswas, subs, surahs, segs,
    showAlert
  } = useApp();

  const [importText, setImportText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!modal || (!modal.startsWith('import_') && modal !== 'export_csv')) {
    return null;
  }

  const handleProcessImport = (type) => {
    if (!importText.trim()) {
      showAlert('Teks import tidak boleh kosong!');
      return;
    }

    const lines = importText.trim().split('\n');
    let count = 0;
    const now = Date.now();

    if (type === 'ustadz') {
      lines.forEach((line, idx) => {
        const parts = line.split(/[\t|]/).map(s => s.trim());
        if (parts.length >= 3 && parts[0]) {
          const id = now + idx;
          const newU = {
            id,
            name: parts[0],
            phone: parts[1] || '',
            username: parts[2],
            password: parts[3] || '123456',
            status: 'approved'
          };
          dbSave('ustadz', id, newU);
          count++;
        }
      });
    } else if (type === 'halaqoh') {
      if (!hierSel.u) {
        showAlert('Pilih Ustadz terlebih dahulu di Data Master!');
        return;
      }
      lines.forEach((line, idx) => {
        const name = line.trim();
        if (name) {
          const id = now + idx;
          dbSave('halaqohs', id, { id, ustadzId: hierSel.u, name });
          count++;
        }
      });
    } else if (type === 'siswa') {
      if (!hierSel.h) {
        showAlert('Pilih Halaqoh terlebih dahulu di Data Master!');
        return;
      }
      lines.forEach((line, idx) => {
        const parts = line.split(/[\t|]/).map(s => s.trim());
        if (parts[0]) {
          const id = now + idx;
          dbSave('siswas', id, { id, halaqohId: hierSel.h, name: parts[0], kelas: parts[1] || '-' });
          count++;
        }
      });
    }

    setImportText('');
    setModal(null);
    showAlert(`Berhasil mengimpor ${count} data ${type}!`);
  };

  const handleExportCSV = () => {
    const type = modalData; // 'halaqoh' | 'siswa' | 'subs'
    let dataToExport = [];
    let filename = `export_${type || 'data'}.csv`;
    let headers = [];
    let rows = [];

    if (type === 'halaqoh') {
      headers = ['ID', 'Nama Halaqoh', 'ID Ustadz'];
      dataToExport = halaqohs;
      rows = dataToExport.map(h => [`"${h.id}"`, `"${h.name}"`, `"${h.ustadzId}"`]);
    } else if (type === 'siswa') {
      headers = ['ID', 'Nama Siswa', 'Kelas', 'ID Halaqoh'];
      dataToExport = siswas;
      rows = dataToExport.map(s => [`"${s.id}"`, `"${s.name}"`, `"${s.kelas}"`, `"${s.halaqohId}"`]);
    } else {
      headers = ['ID', 'Siswa', 'Halaqoh', 'Surah', 'Segmen', 'Status', 'Nilai', 'Tanggal'];
      dataToExport = subs;
      if (startDate) {
        const st = new Date(startDate).setHours(0, 0, 0, 0);
        dataToExport = dataToExport.filter(x => x.id >= st);
      }
      if (endDate) {
        const en = new Date(endDate).setHours(23, 59, 59, 999);
        dataToExport = dataToExport.filter(x => x.id <= en);
      }
      rows = dataToExport.map(sb => {
        const stu = siswas.find(s => s.id === sb.siswaId);
        const hal = halaqohs.find(h => h.id === sb.halaqohId);
        const sur = surahs.find(s => s.id === sb.surahId);
        const seg = segs.find(s => s.id === sb.segmentId);
        return [
          `"${sb.id}"`,
          `"${stu ? stu.name : '-'}"`,
          `"${hal ? hal.name : '-'}"`,
          `"${sur ? sur.title : '-'}"`,
          `"${seg ? seg.title : '-'}"`,
          `"${sb.status}"`,
          `"${sb.grade || '-'}"`,
          `"${sb.date}"`
        ];
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setModal(null);
  };

  if (modal.startsWith('import_')) {
    const type = modal.replace('import_', '');
    const title = type === 'ustadz' ? 'Ustadz' : type === 'halaqoh' ? 'Halaqoh' : 'Siswa';
    const placeholder = type === 'ustadz' ? 'Nama\\tPhone\\tUsername\\tPassword' : type === 'halaqoh' ? 'Nama Halaqoh' : 'Nama Siswa\\tKelas';

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-3xl w-full max-w-xl p-6 shadow-2xl animate-in zoom-in-[0.95] duration-300 ease-out">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold dark:text-white">Import Data {title}</h2>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <i className="ph ph-x text-xl"></i>
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Copy data dari Excel/Spreadsheet dan paste di bawah ini. Gunakan Tab atau Pipe (|) sebagai pemisah kolom.<br />
            Format: <b className="text-emerald-600 font-mono">{placeholder}</b>
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="input-std mb-4 !font-mono !text-xs min-h-[160px]"
            rows="8"
            placeholder="Paste di sini..."
          />
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="px-6 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition dark:bg-[#0a120f] dark:text-gray-300"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleProcessImport(type)}
              className="btn-std !w-auto !px-6 !py-2.5 text-xs shadow-lg shadow-emerald-500/20"
            >
              Proses Import
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modal === 'export_csv') {
    const type = modalData;
    const title = type === 'halaqoh' ? 'Halaqoh' : type === 'siswa' ? 'Siswa' : 'Riwayat Setoran';

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-[#15241e] border border-slate-200 dark:border-[#1a2e26] rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-[0.95] duration-300 ease-out">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold dark:text-white">Export Data {title}</h2>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <i className="ph ph-x text-xl"></i>
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Pilih rentang tanggal untuk memfilter data yang akan diekspor ke CSV. Kosongkan jika ingin mengekspor semua data.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Mulai Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-std !px-3 !py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-std !px-3 !py-2 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="px-6 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition dark:bg-[#0a120f] dark:text-gray-300"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-std !w-auto !px-6 !py-2.5 text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <i className="ph-bold ph-download-simple text-base"></i> Download CSV
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
