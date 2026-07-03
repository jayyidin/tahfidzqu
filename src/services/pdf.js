import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const exportHalaqohPDF = (hId, { halaqohs, ustadz, siswas, surahs, segs, subs }) => {
  const doc = new jsPDF();
  const h = halaqohs.find(x => x.id == hId);
  if (!h) return;
  const u = ustadz.find(x => x.id == h.ustadzId);

  const semingguLalu = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const weeklySubs = subs.filter(s => s.halaqohId == hId && s.id >= semingguLalu && s.status === 'graded');

  doc.setFontSize(18);
  doc.setTextColor(5, 150, 105);
  doc.text("Laporan Statistik Mingguan TahfidzQu", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Halaqoh: ${h.name}`, 14, 32);
  doc.text(`Pembimbing: ${u ? u.name : '-'}`, 14, 38);

  const startDateStr = new Date(semingguLalu).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const endDateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Periode: ${startDateStr} - ${endDateStr}`, 14, 44);

  const tableData = weeklySubs.map(s => {
    const siswa = siswas.find(x => x.id == s.siswaId);
    const surah = surahs.find(x => x.id == s.surahId);
    const seg = segs.find(x => x.id == s.segmentId);
    return [
      siswa ? siswa.name : '-',
      surah ? surah.title : '-',
      seg ? seg.title : '-',
      s.date || '-',
      s.grade || '-'
    ];
  });

  doc.autoTable({
    startY: 52,
    head: [['Nama Siswa', 'Surah', 'Ayat', 'Tanggal', 'Nilai']],
    body: tableData,
    headStyles: { fillColor: [16, 185, 129] },
  });

  doc.save(`Laporan_Mingguan_${h.name.replace(/\s+/g, '_')}.pdf`);
};

export const exportRekapPDF = (sId, { halaqohs, ustadz, siswas, surahs, segs, subs }) => {
  const doc = new jsPDF();
  const s = siswas.find(x => x.id == sId);
  if (!s) return;
  const h = halaqohs.find(x => x.id == s.halaqohId);
  const u = h ? ustadz.find(x => x.id == h.ustadzId) : null;

  const sSubs = subs.filter(x => x.siswaId === s.id && x.status === 'graded').sort((a, b) => b.id - a.id);

  doc.setFontSize(18);
  doc.setTextColor(5, 150, 105);
  doc.text("Rekapitulasi Nilai Hafalan", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Nama Siswa: ${s.name} (Kelas ${s.kelas || '-'})`, 14, 32);
  doc.text(`Halaqoh: ${h ? h.name : '-'}`, 14, 38);
  doc.text(`Pembimbing: ${u ? u.name : '-'}`, 14, 44);

  const tableData = sSubs.map(sb => {
    const surah = surahs.find(x => x.id == sb.surahId);
    const seg = segs.find(x => x.id == sb.segmentId);
    return [surah ? surah.title : '-', seg ? seg.title : '-', sb.date || '-', sb.grade || '-'];
  });

  doc.autoTable({
    startY: 52,
    head: [['Surah', 'Segmen', 'Tanggal', 'Nilai']],
    body: tableData,
    headStyles: { fillColor: [16, 185, 129] },
  });

  doc.save(`Rekap_Nilai_${s.name.replace(/\s+/g, '_')}.pdf`);
};
