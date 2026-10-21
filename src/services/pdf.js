import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const exportHalaqohPDF = (hId, { halaqohs, ustadz, siswas, surahs, segs, subs, schSub }) => {
  const doc = new jsPDF();
  const h = halaqohs.find(x => x.id == hId);
  if (!h) return;
  const u = ustadz.find(x => x.id == h.ustadzId);

  const semingguLalu = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const weeklySubs = subs.filter(s => s.halaqohId == hId && s.id >= semingguLalu && s.status === 'graded');

  // Kop Surat Simple
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129); // Emerald 500
  doc.text("LAPORAN STATISTIK MINGGUAN TAHFIDZQU", 105, 20, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(schSub || "Program Tahfidz Al-Quran Terpadu", 105, 26, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.line(14, 30, 196, 30);

  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(`Halaqoh: ${h.name}`, 14, 38);
  doc.text(`Pembimbing: ${u ? u.name : '-'}`, 14, 44);

  const startDateStr = new Date(semingguLalu).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const endDateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Periode: ${startDateStr} - ${endDateStr}`, 14, 50);

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
    startY: 56,
    head: [['Nama Siswa', 'Surah', 'Ayat / Segmen', 'Tanggal', 'Nilai']],
    body: tableData.length > 0 ? tableData : [['-', 'Belum ada setoran minggu ini', '-', '-', '-']],
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  // Tanda Tangan Ustadz
  const finalY = (doc).lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.text(`Mengetahui,`, 150, finalY);
  doc.text(`Pembimbing Halaqoh`, 150, finalY + 6);
  doc.setFont("helvetica", "bold");
  doc.text(u ? u.name : '(................................)', 150, finalY + 26);

  doc.save(`Laporan_Mingguan_${h.name.replace(/\s+/g, '_')}.pdf`);
};

export const exportRekapPDF = (sId, { halaqohs, ustadz, siswas, surahs, segs, subs, schSub, schLogo }) => {
  const doc = new jsPDF();
  const s = siswas.find(x => x.id == sId);
  if (!s) return;
  const h = halaqohs.find(x => x.id == s.halaqohId);
  const u = h ? ustadz.find(x => x.id == h.ustadzId) : null;

  const sSubs = subs.filter(x => x.siswaId == s.id && x.status === 'graded').sort((a, b) => b.id - a.id);
  const passedCount = sSubs.filter(x => x.grade && !['D', 'E'].includes(x.grade)).length;

  // Header Kop Surat
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text("RAPOR HAFALAN TAHFIDZ AL-QURAN", 105, 20, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(schSub || "Laporan Perkembangan & Rekapitulasi Tahfidz Siswa", 105, 27, { align: 'center' });
  
  doc.setLineWidth(0.8);
  doc.setDrawColor(16, 185, 129);
  doc.line(14, 33, 196, 33);
  doc.setLineWidth(0.2);
  doc.setDrawColor(200);
  doc.line(14, 34.5, 196, 34.5);

  // Biodata Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 40, 182, 32, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 40, 182, 32, 3, 3, 'S');

  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.setFont("helvetica", "bold");
  doc.text("Nama Siswa:", 20, 48);
  doc.text("Kelas / Halaqoh:", 20, 56);
  doc.text("Ustadz Pembimbing:", 20, 64);

  doc.setFont("helvetica", "normal");
  doc.text(`${s.name}`, 60, 48);
  doc.text(`${s.kelas || '-'} / ${h ? h.name : '-'}`, 60, 56);
  doc.text(`${u ? u.name : '-'}`, 60, 64);

  doc.setFont("helvetica", "bold");
  doc.text("Total Ayat Lulus:", 125, 48);
  doc.text("Total Setoran:", 125, 56);
  doc.text("Tanggal Rapor:", 125, 64);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(16, 185, 129);
  doc.setFont("helvetica", "bold");
  doc.text(`${passedCount} Ayat`, 160, 48);
  doc.setTextColor(50);
  doc.setFont("helvetica", "normal");
  doc.text(`${sSubs.length} Kali`, 160, 56);
  doc.text(`${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, 160, 64);

  // Table Data
  const tableData = sSubs.map((sb, idx) => {
    const surah = surahs.find(x => x.id == sb.surahId);
    const seg = segs.find(x => x.id == sb.segmentId);
    return [
      idx + 1,
      surah ? surah.title : '-',
      seg ? seg.title : '-',
      sb.date || '-',
      sb.grade || '-',
      sb.note || '-'
    ];
  });

  doc.autoTable({
    startY: 78,
    head: [['No', 'Surah', 'Ayat / Segmen', 'Tanggal Setor', 'Nilai', 'Catatan Ustadz']],
    body: tableData.length > 0 ? tableData : [['-', '-', 'Belum ada riwayat setoran', '-', '-', '-']],
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 35, fontStyle: 'bold' },
      2: { cellWidth: 40 },
      3: { cellWidth: 28, halign: 'center' },
      4: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] },
      5: { cellWidth: 'auto' }
    },
    styles: { fontSize: 9, cellPadding: 3.5 },
  });

  // Tanda Tangan Box
  const finalY = (doc).lastAutoTable.finalY + 20;
  
  if (finalY < 250) {
    doc.setFontSize(10);
    doc.setTextColor(50);
    
    // Wali Siswa
    doc.text("Mengetahui,", 35, finalY, { align: 'center' });
    doc.text("Orang Tua / Wali Siswa", 35, finalY + 6, { align: 'center' });
    doc.setFont("helvetica", "bold");
    doc.text("(................................)", 35, finalY + 26, { align: 'center' });

    // Ustadz
    doc.setFont("helvetica", "normal");
    doc.text("Memeriksa & Menyetejui,", 160, finalY, { align: 'center' });
    doc.text("Ustadz Pembimbing", 160, finalY + 6, { align: 'center' });
    doc.setFont("helvetica", "bold");
    doc.text(u ? u.name : '(................................)', 160, finalY + 26, { align: 'center' });
  }

  doc.save(`Rapor_Tahfidz_${s.name.replace(/\s+/g, '_')}.pdf`);
};
