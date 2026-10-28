'use strict';
const $ = id => document.getElementById(id);
const VERSION = '28.10.2026';
const NOTICE = 'Dichtere Fenster können den bisherigen Luftwechsel verringern. Bei unzureichender Feuchteabfuhr drohen Tauwasser und Schimmel, besonders an kalten Bauteilen. Angepasstes Heizen und Lüften bleibt wichtig; manuelles Fensteröffnen ersetzt keine erforderliche nutzerunabhängige Feuchteschutzlüftung.';
const RIGHTS = 'Dieses Protokoll dokumentiert Hinweise und den Klärungsstand. Es ersetzt kein erforderliches Lüftungskonzept und keine Fachplanung. Gesetzliche Rechte sowie die Verantwortung für die geschuldeten Leistungen bleiben unberührt.';
const SCOPE = 'Lüftungskonzept und zusätzliche Lüftungstechnik gehören nur zum Auftrag, soweit vereinbart oder nach dem konkreten Vertragsinhalt geschuldet. Erforderliche Prüfungen, konkrete Warnungen und technische Klärungen bleiben Aufgabe des Betriebs; siehe Ziffer 11 der vereinbarten AGB.';
const EXTENTS = {small:'Bis einschließlich 1/3 der vorhandenen Fenster',large:'Mehr als 1/3 der vorhandenen Fenster / Neubau',funded:'BEG-geförderte Maßnahme mit erhöhter Luftdichtheit',unclear:'Umfang unklar / weitere relevante Änderungen'};
const RESULTS = {
  small:{title:'Kein weiterer Klärungsbedarf erkennbar',text:'Auf Grundlage der unten dokumentierten fachlichen Einschätzung ist derzeit kein zusätzlicher Klärungsbedarf erkennbar. Dies ist kein rechnerischer Lüftungsnachweis. Bei neuen Erkenntnissen ist erneut zu prüfen.',label:'Prüfgrundlage / kurze Begründung',placeholder:'Z. B. 1 von 8 Fenstern; frühere Etappen, Lüftung und Anschlüsse betrachtet. Tatsächliche Feststellungen kurz benennen.'},
  planned:{title:'Planung / Lüftungskonzept liegt vor',text:'Die benannte Planung ist verfügbar. Eignung für diese Maßnahme, erforderliche Maßnahmen und deren Umsetzung sind vor Ausführung abzugleichen; offene Punkte im Befund benennen.',label:'Ergebnis / erforderliche Maßnahmen / Umsetzungsstand',placeholder:'Z. B. Konzept passt zum Fenstertausch; vorgesehene Außenluftdurchlässe werden gemäß Planung eingebaut. Offene Punkte benennen.'},
  open:{title:'Klärungsbedarf / konkrete Bedenken',text:'Die unten beschriebenen Punkte sind fachlich zu klären. Betroffene Arbeiten erst nach dokumentierter Klärung und geeigneter Lösung ausführen. Eine Ablehnung des Kunden oder diese Unterschrift allein ist keine technische Ausführungsfreigabe.',label:'Konkreter Befund, Risiko und erforderliche Klärung',placeholder:'Wo liegt das Problem, welche Folgen drohen und was muss geklärt werden? Z. B. Schimmel an kalter Badlaibung; Feuchte- und Wärmebrückenbewertung erforderlich.'}
};
let openedAt = new Date(), signedAt = null, signedFingerprint = '', sigImage = '';
let signaturePad, sigDrawing = [], sigSize = null, canvasSize = null;
let manualDate = false, busy = false, lastExport = '', downloadUrl = '', contractorImagePromise;
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
  $('auto').textContent=`Geöffnet: ${stamp(openedAt)} · Datum und Unterzeichnungszeit automatisch`;
}
function formData() {
  const s=status();
  return {customer:value('kunde'),object:value('objekt'),order:value('auftrag'),extent:value('umfang'),status:s,basis:value('basis'),plan:s==='planned'?value('plan'):'',next:s==='open'?value('next'):'',note:value('notiz'),signer:value('vertreter')||value('kunde'),date:value('datum'),place:value('ort')||value('objekt'),without:$('ohne').checked,reason:$('ohne').checked?value('grund'):''};
}
function fingerprint() { return JSON.stringify(formData()); }
function clearSignature() {
  signaturePad?.clear(); signedAt=null; signedFingerprint=''; sigImage=''; sigDrawing=[]; sigSize=null;
}
function invalidateSignature() {
  lastExport=''; clearDownload();
  if (sigImage && fingerprint()!==signedFingerprint) { clearSignature(); message('Angaben geändert. Bitte den aktualisierten Stand erneut unterschreiben lassen.'); }
}
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
  $('signBlock').hidden=$('ohne').checked;
  $('noSignFields').hidden=!$('ohne').checked; $('grund').required=$('ohne').checked;
}
function resizeSignature() {
  const canvas=$('sig'),rect=canvas.getBoundingClientRect(),ratio=Math.max(window.devicePixelRatio||1,1);
  if(!rect.width || !rect.height) return;
  if(canvasSize && canvasSize.w===rect.width && canvasSize.h===rect.height && canvasSize.r===ratio) return;
  canvas.width=Math.round(rect.width*ratio); canvas.height=Math.round(rect.height*ratio);
  canvas.getContext('2d').setTransform(ratio,0,0,ratio,0,0);
  signaturePad?.clear();
  if(signaturePad && sigDrawing.length && sigSize) {
    const scale=Math.min(rect.width/sigSize.w,rect.height/sigSize.h);
    signaturePad.fromData(sigDrawing.map(group=>({...group,points:group.points.map(p=>({...p,x:p.x*scale,y:p.y*scale}))})));
  }
  canvasSize={w:rect.width,h:rect.height,r:ratio};
}
function validate() {
  updateResult();
  const fields=['kunde','objekt','auftrag','umfang'];
  if(!status()) { message('Bitte den fachlichen Stand auswählen.'); return false; }
  fields.push('basis');
  if(status()==='planned') fields.push('plan');
  if(status()==='open') fields.push('next');
  if($('ohne').checked) fields.push('grund');
  fields.push('datum');
  for(const id of fields) {
    if(!value(id) || !$(id).checkValidity()) {
      if($(id).closest('details')) $(id).closest('details').open=true;
      message('Bitte die erforderlichen Angaben vervollständigen.'); $(id).focus(); $(id).reportValidity(); return false;
    }
  }
  if(!$('ohne').checked && (!sigImage || !signaturePad || signaturePad.isEmpty())) { message('Bitte den Kunden unterschreiben lassen oder unter „Weitere Angaben“ einen Betriebsvermerk ohne Kundenunterschrift wählen.'); $('sig').scrollIntoView({block:'center'}); return false; }
  if(!$('ohne').checked && fingerprint()!==signedFingerprint) { clearSignature(); message('Der Stand wurde geändert. Bitte neu unterschreiben lassen.'); return false; }
  return true;
}
function clean(text) { return String(text||'').replace(/[–—‑]/g,'-').replace(/[„“”]/g,'"').replace(/[’‘]/g,"'").replace(/\u00a0/g,' ').replace(/\t/g,' '); }
function safeFile(data) { const name=data.customer.replace(/[^\wäöüÄÖÜß-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,65)||'Kunde'; return `Feuchteschutz_${name}_${data.date.replace(/-/g,'')}.pdf`; }
function loadContractorImage() {
  return new Promise(resolve=>{
    const image=new Image();
    image.onload=()=>{try { const c=document.createElement('canvas'); c.width=image.naturalWidth;c.height=image.naturalHeight;c.getContext('2d').drawImage(image,0,0); resolve(c.toDataURL('image/jpeg',.9)); }catch {resolve(null);} };
    image.onerror=()=>resolve(null); image.src='images/unterschrift_auftragnehmer.jpg.jpg';
  });
}
async function buildPDF(data,signature,signTime,exportedAt) {
  if(!window.jspdf) throw new Error('PDF-Funktion nicht geladen. Bitte Internetverbindung prüfen und die Seite nach Sicherung der Angaben neu öffnen.');
  const contractor=await contractorImagePromise;
  const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
  pdf.setProperties({title:'Feuchteschutz und Lüftung - '+data.customer,subject:'Objektbezogener Hinweis und Klärungsstand',author:'Swen Neubauer, Sichtwerk - Neubauer'});
  const left=17,right=193,width=176,bottom=277;let y=0;
  function header() {
    pdf.setFillColor(16,63,72);pdf.rect(0,0,210,27,'F');pdf.setTextColor(255);pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.text('Feuchteschutz & Lüftung',left,12);
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text('Sichtwerk - Neubauer | Hinweis- und Prüfvermerk',left,20);pdf.text(germanDate(data.date),right,20,{align:'right'});pdf.setTextColor(21,53,61);y=36;
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
  function imageFit(url,x,top,w,h,type){const i=pdf.getImageProperties(url),s=Math.min(w/i.width,h/i.height);pdf.addImage(url,type,x+(w-i.width*s)/2,top+(h-i.height*s)/2,i.width*s,i.height*s,undefined,'FAST');}
  header();
  field('Kunde / Auftraggeber',data.customer);field('Objekt / Nutzungseinheit',data.object);field('Maßnahme / Auftrag',data.order);
  text('Umfang: '+EXTENTS[data.extent],{size:8,leading:3.8,after:3});
  if(data.extent==='funded')text('Förderhinweis: Lüftungskonzept-Nachweis nach den maßgeblichen BEG-Förderbedingungen mit dem Energieeffizienz-Experten klären. Die Anforderung nennt keine Drittel-Ausnahme.',{size:8,leading:3.8,after:3});
  heading(RESULTS[data.status].title.toUpperCase());text(RESULTS[data.status].text,{size:8.5,leading:4,after:2});
  field(RESULTS[data.status].label,data.basis);
  if(data.plan)field('Zugeordnete Planung / Dokument',data.plan);
  if(data.next)field('Nächster Schritt / Zuständigkeit / Termin',data.next);
  if(data.note)field('Weitere Hinweise / Kundenentscheidung / Übergabe',data.note);
  heading('Hinweis zum Feuchteschutz');text(NOTICE,{size:8.5,leading:4,after:2});text(RIGHTS,{size:8,leading:3.7,after:3});
  // Keep the complete signature and its statement on the same page.
  pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);
  const placeLines=pdf.splitTextToSize(clean('Ort: '+data.place),width);
  const signerLines=pdf.splitTextToSize(clean(data.signer),82);
  const reasonLines=pdf.splitTextToSize(clean(data.reason),width);
  space(68+placeLines.length*3.5+signerLines.length*3.2+(data.without?reasonLines.length*3.5:0));
  heading(data.without?'Betriebsvermerk ohne Kundenunterschrift':'Empfang des Hinweises');
  text('Ort: '+data.place,{size:8,leading:3.5,after:1});
  text('Besichtigung: '+germanDate(data.date)+' | Geöffnet: '+stamp(openedAt),{size:7.5,leading:3.5,after:1});
  text((data.without?'Vermerk erstellt: ':'Unterzeichnung erfasst: ')+stamp(signTime||exportedAt)+' (Deutschland)',{size:7.5,leading:3.5,after:2});
  if(data.without) {
    text('Keine Kundenunterschrift. Grund: '+data.reason,{size:8,leading:3.8,bold:true,after:2});
    text('Ein Empfang oder Einverständnis des Kunden wird dadurch nicht bestätigt. Tatsächlichen Zugang des Hinweises gesondert nachweisen.',{size:7.5,leading:3.5,after:3});
  } else {
    text('Freiwillige Unterschrift zum Empfang dieses Hinweises. Technische Einschätzungen sind Angaben des Betriebs. Keine Bestätigung technischer Tatsachen; kein Verzicht auf Rechte; gesetzliche Beweislast unverändert.',{size:7.5,leading:3.5,after:2});
  }
  const signY=y;
  if(!data.without)imageFit(signature,left,signY,82,20,'PNG');
  if(contractor)imageFit(contractor,111,signY,82,20,'JPEG');
  pdf.setDrawColor(155,175,178);pdf.line(left,signY+22,99,signY+22);pdf.line(111,signY+22,right,signY+22);
  pdf.setFontSize(7.5);pdf.setFont('helvetica','normal');pdf.text(data.without?'Keine Kundenunterschrift':signerLines,left,signY+26);pdf.text('Swen Neubauer, Sichtwerk - Neubauer',111,signY+26);
  pdf.setFontSize(6.8);pdf.text(contractor?'Auftragnehmer - hinterlegte Unterschrift':'Auftragnehmer',111,signY+30);
  if(!data.without)pdf.text(data.signer===data.customer?'Auftraggeber':'Bevollmächtigter Vertreter',left,signY+27+signerLines.length*3.2);
  const pages=pdf.getNumberOfPages();
  for(let i=1;i<=pages;i++){pdf.setPage(i);pdf.setDrawColor(217,227,228);pdf.line(left,284,right,284);pdf.setTextColor(95,115,120);pdf.setFontSize(6.5);pdf.text(`Formular ${VERSION} | AGB 27.10.2026, Ziff. 11 | Gerätezeit, kein qualifizierter Zeitstempel`,left,289);pdf.text(`${i} / ${pages}`,right,289,{align:'right'});}
  return pdf;
}
function lock(value) {
  busy=value;for(const element of $('form').elements)element.disabled=value;
  if(value)signaturePad?.off();else{signaturePad?.on();updateResult();}
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
  const data=formData(),signature=sigImage,signTime=signedAt,exportedAt=new Date(),snapshot=fingerprint();
  lock(true);
  try {
    const pdf=await buildPDF(data,signature,signTime,exportedAt),name=safeFile(data),blob=pdf.output('blob'),file=new File([blob],name,{type:'application/pdf'});
    if(share && navigator.canShare?.({files:[file]}) && navigator.share) {
      try{await navigator.share({files:[file],title:'Feuchteschutz und Lüftung'});}catch(error){if(error.name==='AbortError'){message('Teilen abgebrochen. Das Protokoll bleibt geöffnet.');return;}downloadPDF(blob,name);message('Teilen war nicht verfügbar. PDF ist zum Herunterladen bereit. Bitte selbst speichern und dem Kunden übergeben.',true);}
    } else {downloadPDF(blob,name);message('PDF erstellt. Falls der Download nicht startet, „PDF herunterladen“ antippen. Bitte selbst speichern, dem Kunden übergeben und den tatsächlichen Zugang dokumentieren.',true);}
    lastExport=snapshot;
  } catch(error){message(error.message||'PDF konnte nicht erstellt werden.');}
  finally{lock(false);}
}
function resetForm(){if((value('kunde')||value('objekt')||value('auftrag')||sigImage)&&!confirm('Neuen Vorgang beginnen und aktuelle Angaben löschen?'))return;HTMLFormElement.prototype.reset.call($('form'));$('extras').open=false;manualDate=false;activeStatus='';basisByStatus={};openedAt=new Date();$('datum').value=dateValue(openedAt);clearSignature();clearDownload();lastExport='';message('');updateAuto();updateResult();resizeSignature();}
window.addEventListener('DOMContentLoaded',()=>{
  $('notice').textContent=NOTICE;$('rights').textContent=RIGHTS;$('scope').textContent=SCOPE;
  $('datum').value=dateValue(openedAt);updateAuto();updateResult();
  contractorImagePromise=loadContractorImage();
  if(window.SignaturePad){signaturePad=new SignaturePad($('sig'),{backgroundColor:'rgb(255,255,255)',penColor:'rgb(21,53,61)',minWidth:.8,maxWidth:2.4});resizeSignature();signaturePad.addEventListener('endStroke',()=>{
    if(!manualDate)$('datum').value=dateValue(new Date());
    signedAt=new Date();signedFingerprint=fingerprint();sigImage=$('sig').toDataURL('image/png');sigDrawing=signaturePad.toData();const r=$('sig').getBoundingClientRect();sigSize={w:r.width,h:r.height};lastExport='';message('');
  });}else message('Unterschriftsfunktion nicht geladen. Internetverbindung prüfen. Ein Betriebsvermerk ohne Kundenunterschrift bleibt möglich.');
  $('form').addEventListener('submit',event=>event.preventDefault());
  $('form').addEventListener('input',event=>{if(event.target.id==='datum')manualDate=true;updateResult();invalidateSignature();updateAuto();});
  $('form').addEventListener('change',()=>{updateResult();invalidateSignature();resizeSignature();});
  $('clear').addEventListener('click',()=>{clearSignature();clearDownload();lastExport='';message('');});
  $('save').addEventListener('click',()=>exportPDF(false));$('share').addEventListener('click',()=>exportPDF(true));$('reset').addEventListener('click',resetForm);
  window.addEventListener('resize',resizeSignature);document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateAuto();resizeSignature();}});
  window.addEventListener('beforeunload',event=>{if((value('kunde')||value('objekt'))&&fingerprint()!==lastExport){event.preventDefault();event.returnValue='';}});
});
