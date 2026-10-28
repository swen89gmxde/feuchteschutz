'use strict';
const $ = id => document.getElementById(id);
const VERSION = '28.10.2026';
const AUTHOR = 'Swen Neubauer, Sichtwerk - Neubauer';
const NOTICE = 'Dichtere Fenster können den bisherigen Luftwechsel verringern. Bei unzureichender Feuchteabfuhr drohen Tauwasser und Schimmel, besonders an kalten Bauteilen. Angepasstes Heizen und Lüften bleibt wichtig; manuelles Fensteröffnen ersetzt keine erforderliche nutzerunabhängige Feuchteschutzlüftung.';
const RIGHTS = 'Dieser vom Betrieb erstellte Hinweis ersetzt kein erforderliches Lüftungskonzept und keine Fachplanung. Gesetzliche Rechte sowie die Verantwortung für die geschuldeten Leistungen bleiben unberührt.';
const RECEIPT = 'Dieses Dokument enthält keine Empfangsbestätigung oder Zustimmung des Kunden. Tatsächliche Übermittlung und gegebenenfalls Gespräch gesondert dokumentieren.';
const SCOPE = 'Lüftungskonzept und zusätzliche Lüftungstechnik gehören nur zum Auftrag, soweit vereinbart oder nach dem konkreten Vertragsinhalt geschuldet. Erforderliche Prüfungen, konkrete Warnungen und technische Klärungen bleiben Aufgabe des Betriebs; siehe Ziffer 11 der vereinbarten AGB.';
const EXTENTS = {small:'Bis einschließlich 1/3 der vorhandenen Fenster',large:'Mehr als 1/3 der vorhandenen Fenster / Neubau',funded:'BEG-geförderte Maßnahme mit erhöhter Luftdichtheit',unclear:'Umfang unklar / weitere relevante Änderungen'};
const RESULTS = {
  small:{title:'Kein weiterer Klärungsbedarf erkennbar',text:'Auf Grundlage der unten dokumentierten fachlichen Einschätzung des Betriebs ist derzeit kein zusätzlicher Klärungsbedarf erkennbar. Dies ist kein rechnerischer Lüftungsnachweis. Bei neuen Erkenntnissen ist erneut zu prüfen.',label:'Prüfgrundlage / kurze Begründung',placeholder:'Z. B. 1 von 8 Fenstern; frühere Etappen, Lüftung und Anschlüsse betrachtet. Tatsächliche Feststellungen kurz benennen.'},
  planned:{title:'Planung / Lüftungskonzept liegt vor',text:'Die benannte Planung ist verfügbar. Eignung für diese Maßnahme, erforderliche Maßnahmen und deren Umsetzung sind vor Ausführung abzugleichen; offene Punkte im Befund benennen.',label:'Ergebnis / erforderliche Maßnahmen / Umsetzungsstand',placeholder:'Z. B. Konzept passt zum Fenstertausch; vorgesehene Außenluftdurchlässe werden gemäß Planung eingebaut. Offene Punkte benennen.'},
  open:{title:'Klärungsbedarf / konkrete Bedenken',text:'Die unten beschriebenen Punkte sind fachlich zu klären. Betroffene Arbeiten erst nach dokumentierter Klärung und geeigneter Lösung ausführen. Eine Ablehnung des Kunden oder die bloße Übermittlung dieses Hinweises ist keine technische Ausführungsfreigabe.',label:'Konkreter Befund, Risiko und erforderliche Klärung',placeholder:'Wo liegt das Problem, welche Folgen drohen und was muss geklärt werden? Z. B. Schimmel an kalter Badlaibung; Feuchte- und Wärmebrückenbewertung erforderlich.'}
};
let openedAt = new Date(), busy = false, lastExport = '', downloadUrl = '';
let activeStatus = '', basisByStatus = {};
function parts(date = new Date()) {
  const p = {};
  new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).forEach(x => { p[x.type] = x.value; });
  return p;
}
function dateValue(date) { const p=parts(date); return `${p.year}-${p.month}-${p.day}`; }
function germanDate(v) { const p=v.split('-'); return p.length===3 ? `${p[2]}.${p[1]}.${p[0]}` : v; }
function stamp(date) { const p=parts(date); return `${p.day}.${p.month}.${p.year}, ${p.hour}:${p.minute}:${p.second} Uhr`; }
function value(id) { return $(id).value.trim(); }
function status() { return document.querySelector('input[name=status]:checked')?.value || ''; }
function message(text,ok=false) { $('message').textContent=text; $('message').hidden=!text; $('message').classList.toggle('ok',ok); }
function updateAuto() {
  $('datum').max=dateValue(new Date());
  $('auto').textContent=`Begonnen: ${stamp(openedAt)} · Aussteller und Erstellungszeit automatisch`;
}
function formData() {
  const s=status();
  return {customer:value('kunde'),object:value('objekt'),order:value('auftrag'),extent:value('umfang'),status:s,basis:value('basis'),plan:s==='planned'?value('plan'):'',next:s==='open'?value('next'):'',note:value('notiz'),date:value('datum')};
}
function fingerprint() { return JSON.stringify(formData()); }
function invalidateExport() { lastExport=''; clearDownload(); message(''); }
function updateResult() {
  const extent=value('umfang');
  $('statusSmall').disabled=extent!=='small';
  if ($('statusSmall').disabled && $('statusSmall').checked) $('statusSmall').checked=false;
  const s=status(), result=RESULTS[s];
  if(s!==activeStatus) {
    if(activeStatus)basisByStatus[activeStatus]=$('basis').value;
    $('basis').value=basisByStatus[s]||'';activeStatus=s;
  }
  $('resultFields').hidden=!result;
  $('basis').required=!!result;
  $('planFields').hidden=s!=='planned'; $('plan').required=s==='planned';
  $('openFields').hidden=s!=='open'; $('next').required=s==='open';
  $('statement').textContent=result?.text || (extent==='large' ? 'Typischer Anlass für ein Lüftungskonzept nach DIN 1946-6. Die Drittelgrenze ist keine abschließende Prüfgrenze. Planung zuordnen oder Klärungsbedarf dokumentieren.' : extent==='funded' ? 'Bei BEG-geförderter Sanierung mit erhöhter Luftdichtheit ist ein Lüftungskonzept-Nachweis gefordert; die Förderanforderung nennt keine Drittel-Ausnahme. Mit dem Energieeffizienz-Experten klären; Planung zuordnen oder offenen Bedarf dokumentieren.' : extent==='unclear' ? 'Umfang oder Auswirkungen zunächst klären. Vorhandene geeignete Planung zuordnen oder offene Bedenken festhalten.' : 'Keine Vorbelegung: Ergebnis erst nach fachlicher Einschätzung auswählen. Dieses Formular berechnet keinen Luftwechsel.');
  $('statement').classList.toggle('warn',s==='open'||(!s && ['large','funded','unclear'].includes(extent)));
  if(result) { $('basisLabel').textContent=result.label; $('basis').placeholder=result.placeholder; }
}
function validate() {
  updateResult();
  const fields=['kunde','objekt','auftrag','umfang'];
  if(!status()) { message('Bitte den fachlichen Stand auswählen.'); return false; }
  fields.push('basis');
  if(status()==='planned') fields.push('plan');
  if(status()==='open') fields.push('next');
  fields.push('datum');
  for(const id of fields) {
    if(!value(id) || !$(id).checkValidity()) {
      if($(id).closest('details')) $(id).closest('details').open=true;
      message('Bitte die erforderlichen Angaben vervollständigen.'); $(id).focus(); $(id).reportValidity(); return false;
    }
  }
  return true;
}
function clean(text) { return String(text||'').replace(/[–—‑]/g,'-').replace(/[„“”]/g,'"').replace(/[’‘]/g,"'").replace(/\u00a0/g,' ').replace(/\t/g,' '); }
function safeFile(data,exportedAt) {
  const name=data.customer.replace(/[^\wäöüÄÖÜß-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,65)||'Kunde',p=parts(exportedAt);
  return `Feuchteschutz_${name}_${p.year}${p.month}${p.day}_${p.hour}${p.minute}${p.second}.pdf`;
}
function chatText(data) {
  const topic=data.status==='open' ? 'Bitte beachten Sie insbesondere die beschriebenen Risiken, erforderlichen Klärungen und nächsten Schritte.' : 'Bitte beachten Sie die Hinweise zum Feuchteschutz und den dokumentierten Planungsstand.';
  return `Anbei erhalten Sie von ${AUTHOR} den Feuchteschutz- und Lüftungshinweis zu Ihrem Objekt ${data.object} (${data.order}). ${topic} Bitte bewahren Sie die PDF auf. Bei Fragen melden Sie sich gerne.`;
}
function buildPDF(data,exportedAt) {
  if(!window.jspdf) throw new Error('PDF-Funktion nicht geladen. Bitte Internetverbindung prüfen und die Seite nach Sicherung der Angaben neu öffnen.');
  const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
  pdf.setProperties({title:'Feuchteschutz und Lüftung - '+data.customer,subject:'Objektbezogener Hinweis des Betriebs',author:AUTHOR});
  const left=17,right=193,width=176,bottom=277;let y=0;
  function header() {
    pdf.setFillColor(16,63,72);pdf.rect(0,0,210,27,'F');pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.text('Feuchteschutz & Lüftung',left,12);
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text('Sichtwerk - Neubauer | Objektbezogener Hinweis',left,20);pdf.text(germanDate(data.date),right,20,{align:'right'});pdf.setTextColor(21,53,61);y=36;
  }
  function newPage(){pdf.addPage();header();}
  function space(h){if(y+h>bottom)newPage();}
  function text(t,{size=9,leading=4.1,bold=false,after=2}={}) {
    pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);
    const lines=pdf.splitTextToSize(clean(t||'-'),width);
    for(const line of lines){space(leading+1);pdf.text(line,left,y);y+=leading;}y+=after;
  }
  function field(label,t){space(10);text(label,{size:7.5,leading:3.4,bold:true,after:0});text(t,{size:9,leading:4.1,after:2.7});}
  function heading(t){space(11);y+=2;text(t,{size:10,bold:true,leading:4.5,after:2});}
  header();
  field('Für Kunde / Auftraggeber',data.customer);field('Objekt / Nutzungseinheit',data.object);field('Maßnahme / Auftrag',data.order);
  text('Umfang: '+EXTENTS[data.extent],{size:8,leading:3.8,after:3});
  if(data.extent==='funded')text('Förderhinweis: Lüftungskonzept-Nachweis nach den maßgeblichen BEG-Förderbedingungen mit dem Energieeffizienz-Experten klären. Die Anforderung nennt keine Drittel-Ausnahme.',{size:8,leading:3.8,after:3});
  heading(RESULTS[data.status].title.toUpperCase());text(RESULTS[data.status].text,{size:8.5,leading:4,after:2});
  field(RESULTS[data.status].label,data.basis);
  if(data.plan)field('Zugeordnete Planung / Dokument',data.plan);
  if(data.next)field('Nächster Schritt / Zuständigkeit / Termin',data.next);
  if(data.note)field('Ergänzender Vermerk des Betriebs',data.note);
  heading('Hinweis zum Feuchteschutz');text(NOTICE,{size:8.5,leading:4,after:2});text(RIGHTS,{size:8,leading:3.7,after:3});
  space(38);heading('Aussteller / Dokumentation');
  text(AUTHOR,{size:9,bold:true,leading:4,after:1});
  text('Datum des Befunds: '+germanDate(data.date),{size:8,leading:3.7,after:1});
  text('Dokument erstellt: '+stamp(exportedAt)+' (Deutschland, Gerätezeit)',{size:8,leading:3.7,after:2});
  text(RECEIPT,{size:7.5,leading:3.5,after:2});
  const pages=pdf.getNumberOfPages();
  for(let i=1;i<=pages;i++){pdf.setPage(i);pdf.setDrawColor(217,227,228);pdf.line(left,284,right,284);pdf.setTextColor(95,115,120);pdf.setFontSize(6.5);pdf.text(`Formular ${VERSION} | AGB 27.10.2026, Ziff. 11 | Hinweis des Betriebs`,left,289);pdf.text(`${i} / ${pages}`,right,289,{align:'right'});}
  return pdf;
}
function lock(value) {
  busy=value;for(const element of $('form').elements)element.disabled=value;
  if(!value)updateResult();
}
function clearDownload() {
  if(downloadUrl)URL.revokeObjectURL(downloadUrl);
  downloadUrl='';$('pdfLink').hidden=true;$('pdfLink').removeAttribute('href');
}
function downloadPDF(blob,name) {
  clearDownload();downloadUrl=URL.createObjectURL(blob);
  const link=$('pdfLink');link.href=downloadUrl;link.download=name;link.hidden=false;link.click();
}
async function exportPDF(share=false) {
  if(busy)return;message('');if(!validate())return;
  const data=formData(),exportedAt=new Date(),snapshot=fingerprint();
  lock(true);
  try {
    const pdf=buildPDF(data,exportedAt),name=safeFile(data,exportedAt),blob=pdf.output('blob'),file=new File([blob],name,{type:'application/pdf'});
    if(share && navigator.canShare?.({files:[file]}) && navigator.share) {
      try{await navigator.share({files:[file],title:'Feuchteschutz und Lüftung',text:chatText(data)});message('Teilen beendet. PDF selbst aufbewahren und tatsächlichen Versand im Chat prüfen; Versand und Empfang werden hier nicht automatisch bestätigt.',true);}catch(error){if(error.name==='AbortError'){message('Teilen abgebrochen. Der Hinweis bleibt geöffnet.');return;}downloadPDF(blob,name);message('Teilen war nicht verfügbar. PDF ist zum Herunterladen bereit; anschließend selbst im Chat versenden und aufbewahren.',true);}
    } else {downloadPDF(blob,name);message('PDF erstellt. Falls der Download nicht startet, „PDF herunterladen“ antippen. PDF selbst speichern, im Chat versenden und den zugehörigen Verlauf aufbewahren.',true);}
    lastExport=snapshot;
  } catch(error){message(error.message||'PDF konnte nicht erstellt werden.');}
  finally{lock(false);}
}
function resetForm(){if((value('kunde')||value('objekt')||value('auftrag'))&&!confirm('Neuen Vorgang beginnen und aktuelle Angaben löschen?'))return;HTMLFormElement.prototype.reset.call($('form'));$('extras').open=false;activeStatus='';basisByStatus={};openedAt=new Date();$('datum').value=dateValue(openedAt);clearDownload();lastExport='';message('');updateAuto();updateResult();}
window.addEventListener('DOMContentLoaded',()=>{
  $('notice').textContent=NOTICE;$('rights').textContent=RIGHTS;$('scope').textContent=SCOPE;
  $('datum').value=dateValue(openedAt);updateAuto();updateResult();
  $('form').addEventListener('submit',event=>event.preventDefault());
  $('form').addEventListener('input',()=>{updateResult();invalidateExport();updateAuto();});
  $('form').addEventListener('change',()=>{updateResult();invalidateExport();});
  $('save').addEventListener('click',()=>exportPDF(false));$('share').addEventListener('click',()=>exportPDF(true));$('reset').addEventListener('click',resetForm);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateAuto();});
  window.addEventListener('beforeunload',event=>{if((value('kunde')||value('objekt'))&&fingerprint()!==lastExport){event.preventDefault();event.returnValue='';}});
});
