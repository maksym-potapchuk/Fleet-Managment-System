import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toDisplayUnit, unitLabel, type DistanceUnit } from './distance';

type PdfLang = 'uk' | 'pl' | 'en';

interface RegulationItem {
  title: string;
  title_pl: string;
  title_uk: string;
  title_en: string;
}

interface RegulationPlanEntry {
  item: RegulationItem;
  last_done_km: number;
  effective_every_km: number;
  effective_notify_before_km: number;
  next_due_km: number;
  updated_at: string;
}

interface RegulationPlan {
  schema: { title: string; title_pl: string; title_uk: string; title_en: string };
  assigned_at: string;
  entries: RegulationPlanEntry[];
}

const S3_BASE = 'https://fdmanagerstorage.s3.eu-central-1.amazonaws.com/static';

const LABELS: Record<PdfLang, {
  title: string;
  vehicle: string;
  mileage: string;
  schema: string;
  assignedOn: string;
  generatedOn: string;
  unitLabel: string;
  columns: {
    nr: string;
    name: string;
    lastDone: string;
    nextDue: string;
    lastUpdated: string;
  };
  status: { overdue: string; soon: string; ok: string };
  footer: string[];
}> = {
  uk: {
    title: 'Регламент технічного обслуговування',
    vehicle: 'Автомобіль',
    mileage: 'Пробіг',
    schema: 'Схема',
    assignedOn: 'Призначено',
    generatedOn: 'Згенеровано',
    unitLabel: 'Одиниця виміру',
    columns: {
      nr: '№',
      name: 'Назва',
      lastDone: 'Остання заміна',
      nextDue: 'Наступна заміна',
      lastUpdated: 'Оновлено',
    },
    status: { overdue: 'ПРОСТРОЧЕНО', soon: 'СКОРО', ok: 'ОК' },
    footer: [
      'Цей документ є регламентом технічного обслуговування транспортного засобу.',
      'Дотримання графіку замін є обов\'язковим для підтримки справності автомобіля.',
      'У разі прострочення заміни — негайно зверніться до менеджера або до найближчого СТО.',
      'Документ згенеровано автоматично системою управління автопарком FinDrive.',
    ],
  },
  pl: {
    title: 'Regulamin serwisowy',
    vehicle: 'Pojazd',
    mileage: 'Przebieg',
    schema: 'Schemat',
    assignedOn: 'Przypisano',
    generatedOn: 'Wygenerowano',
    unitLabel: 'Jednostka',
    columns: {
      nr: 'Nr',
      name: 'Nazwa',
      lastDone: 'Ostatnia wymiana',
      nextDue: 'Następna wymiana',
      lastUpdated: 'Zaktualizowano',
    },
    status: { overdue: 'PRZETERMINOWANE', soon: 'WKRÓTCE', ok: 'OK' },
    footer: [
      'Niniejszy dokument stanowi regulamin serwisowy pojazdu.',
      'Przestrzeganie harmonogramu wymian jest obowiązkowe w celu utrzymania sprawności pojazdu.',
      'W przypadku przekroczenia terminu wymiany — niezwłocznie skontaktuj się z menedżerem lub najbliższym serwisem.',
      'Dokument wygenerowany automatycznie przez system zarządzania flotą FinDrive.',
    ],
  },
  en: {
    title: 'Maintenance Regulation',
    vehicle: 'Vehicle',
    mileage: 'Mileage',
    schema: 'Schema',
    assignedOn: 'Assigned on',
    generatedOn: 'Generated on',
    unitLabel: 'Unit',
    columns: {
      nr: '#',
      name: 'Name',
      lastDone: 'Last done',
      nextDue: 'Next due',
      lastUpdated: 'Updated',
    },
    status: { overdue: 'OVERDUE', soon: 'SOON', ok: 'OK' },
    footer: [
      'This document is a vehicle maintenance regulation.',
      'Following the replacement schedule is mandatory to maintain vehicle condition.',
      'If a replacement is overdue — contact your manager or the nearest service center immediately.',
      'Document generated automatically by the FinDrive fleet management system.',
    ],
  },
};

function itemTitle(item: RegulationItem, lang: PdfLang): string {
  if (lang === 'pl' && item.title_pl) return item.title_pl;
  if (lang === 'uk' && item.title_uk) return item.title_uk;
  if (lang === 'en' && item.title_en) return item.title_en;
  return item.title;
}

function schemaTitle(
  schema: { title: string; title_pl: string; title_uk: string; title_en: string },
  lang: PdfLang,
): string {
  if (lang === 'pl' && schema.title_pl) return schema.title_pl;
  if (lang === 'uk' && schema.title_uk) return schema.title_uk;
  if (lang === 'en' && schema.title_en) return schema.title_en;
  return schema.title;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US').replace(/,/g, ' ');
}

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let fontCache: { regular: string; bold: string } | null = null;

async function loadFonts(): Promise<{ regular: string; bold: string }> {
  if (fontCache) return fontCache;
  const [regular, bold] = await Promise.all([
    fetchAsBase64(`${S3_BASE}/fonts/Roboto-Regular.ttf`),
    fetchAsBase64(`${S3_BASE}/fonts/Roboto-Bold.ttf`),
  ]);
  fontCache = { regular, bold };
  return fontCache;
}


function registerFonts(doc: jsPDF, fonts: { regular: string; bold: string }) {
  doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', fonts.bold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
}

export async function generateRegulationPdf(
  plan: RegulationPlan,
  carNumber: string,
  currentKm: number,
  pdfUnit: DistanceUnit,
  lang: PdfLang,
) {
  const fonts = await loadFonts();

  const l = LABELS[lang];
  const unit = unitLabel(pdfUnit);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  registerFonts(doc, fonts);
  doc.setFont('Roboto', 'normal');

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 12;

  // ── Header band (teal background strip) ──
  const bandH = 22;
  doc.setFillColor(45, 139, 126);
  doc.rect(0, 0, pageW, bandH, 'F');

  // Brand: "FINDRIVE" — clean white on teal, with macron over D
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setCharSpace(3);
  doc.text('FINDRIVE', marginX + 1, 9, { align: 'left' });
  doc.setCharSpace(0);

  // Tagline under brand
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(200, 235, 230);
  doc.setCharSpace(1);
  doc.text('CAR SELLING & LEASING', marginX + 1, 13.5, { align: 'left' });
  doc.setCharSpace(0);

  // Document title — right side of band
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(l.title, pageW - marginX, 10, { align: 'right' });

  // Generated date — subtle, right aligned under title
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(200, 235, 230);
  doc.text(`${l.generatedOn}: ${new Date().toLocaleDateString()}`, pageW - marginX, 14.5, { align: 'right' });

  // ── Info cards row (below band) ──
  doc.setTextColor(0, 0, 0);
  const infoY = bandH + 5;
  const infoItems = [
    { label: l.vehicle, value: carNumber },
    { label: l.mileage, value: `${fmt(toDisplayUnit(currentKm, pdfUnit))} ${unit}` },
    { label: l.schema, value: schemaTitle(plan.schema, lang) },
    { label: l.assignedOn, value: new Date(plan.assigned_at).toLocaleDateString() },
  ];

  const cardW = (pageW - marginX * 2 - (infoItems.length - 1) * 4) / infoItems.length;
  infoItems.forEach((item, i) => {
    const x = marginX + i * (cardW + 4);

    // Card background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, infoY, cardW, 12, 1.5, 1.5, 'FD');

    // Label
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(item.label.toUpperCase(), x + 3, infoY + 4);

    // Value
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(item.value, x + 3, infoY + 9.5);
  });

  // ── Table ──
  const cols = l.columns;
  const head = [[cols.nr, cols.name, cols.lastDone, cols.nextDue, cols.lastUpdated]];

  const body = plan.entries.map((entry, idx) => {
    const nextDisplay = toDisplayUnit(entry.next_due_km, pdfUnit);
    const lastDoneDisplay = toDisplayUnit(entry.last_done_km, pdfUnit);
    const notifyAtKm = entry.next_due_km - entry.effective_notify_before_km;
    const isOverdue = currentKm >= entry.next_due_km;
    const isDueSoon = !isOverdue && currentKm >= notifyAtKm;

    let statusBadge = '';
    if (isOverdue) statusBadge = `  [${l.status.overdue}]`;
    else if (isDueSoon) statusBadge = `  [${l.status.soon}]`;

    return [
      String(idx + 1),
      itemTitle(entry.item, lang),
      `${fmt(lastDoneDisplay)} ${unit}`,
      `${fmt(nextDisplay)} ${unit}${statusBadge}`,
      new Date(entry.updated_at).toLocaleDateString(),
    ];
  });

  autoTable(doc, {
    startY: infoY + 16,
    head,
    body,
    theme: 'grid',
    margin: { left: marginX, right: marginX },
    styles: {
      font: 'Roboto',
      fontSize: 9,
      cellPadding: 3,
      lineColor: [180, 180, 180],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [45, 139, 126],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: 4,
    },
    bodyStyles: {
      textColor: [30, 30, 30],
    },
    alternateRowStyles: {
      fillColor: [245, 248, 247],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 50 },
      4: { halign: 'center', cellWidth: 30 },
    },
    didParseCell(data) {
      if (data.section !== 'body' || data.column.index !== 3) return;
      const text = String(data.cell.raw);
      if (text.includes(l.status.overdue)) {
        data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      } else if (text.includes(l.status.soon)) {
        data.cell.styles.textColor = [217, 119, 6];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ── Footer — policy text ──
  const footerStartY = pageH - 26;

  // Thin separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(marginX, footerStartY, pageW - marginX, footerStartY);

  l.footer.forEach((line, i) => {
    if (i === 2) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(9);
    } else {
      doc.setTextColor(80, 80, 80);
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(8);
    }
    doc.text(line, marginX, footerStartY + 5 + i * 4.5);
  });

  doc.setTextColor(0, 0, 0);

  doc.save(`regulation-${carNumber}-${lang}.pdf`);
}
