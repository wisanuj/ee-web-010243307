/* create_form.gs — creates the anonymous feedback form of the EE_Web site (course 010243307) and its response sheet.
   Run it once, signed in to the instructor's Google account:
     1. open https://script.google.com → New project, paste this whole file, save
     2. choose the function createEeWebFeedbackForm and press Run; allow access to Google Forms and Google Sheets
     3. open the Execution log and send the four lines FORM_URL, PREFILL, EDIT_URL, SHEET_URL back to the site maintainer
   The site (assets/shell.js, FEEDBACK) needs the form id and the entry numbers that appear in the PREFILL link.
   CHOICES must stay identical to FB_KINDS in assets/shell.js (Thai + ' / ' + English, no commas). */
const CHOICES = [
  'เนื้อหาหรือคำอธิบายไม่ชัด / unclear explanation',
  'ตัวเลขหรือเฉลยผิด / wrong number or answer',
  'ภาพจำลองมีปัญหาหรือเข้าใจยาก / simulation problem',
  'ใช้บนมือถือลำบาก / hard to use on a phone',
  'อยากให้เพิ่มโจทย์หรือเนื้อหา / more problems or topics',
  'ชอบส่วนนี้ / I liked this'
];

function createEeWebFeedbackForm() {
  const form = FormApp.create('ความเห็นต่อสื่อการสอน 010243307 วิศวกรรมไฟฟ้า (EE_Web)');
  form.setDescription('แบบฟอร์มไม่ระบุตัวตน ไม่เก็บชื่อ อีเมล หรือรหัสนักศึกษา ใช้ปรับปรุงสื่อการสอน https://wisanuj.github.io/ee-web-010243307/ · ' +
    'Anonymous feedback (no name, e-mail or student ID) used to improve the course website.');
  form.setCollectEmail(false);
  try { form.setRequireLogin(false); } catch (e) {}          // only Google Workspace accounts have this switch
  form.setLimitOneResponsePerUser(false);                    // true would force a sign-in
  form.setAllowResponseEdits(false);
  form.setPublishingSummary(false);                          // students do not see each other's comments
  form.setShowLinkToRespondAgain(true);
  form.setConfirmationMessage('ขอบคุณครับ ความเห็นนี้จะใช้ปรับปรุงหน้าเว็บ · Thank you, this feedback will be used to improve the pages.');
  try { form.setPublished(true); } catch (e) {}              // newer forms must be published before they accept responses
  form.setAcceptingResponses(true);

  const page = form.addTextItem().setTitle('หน้า (page)').setHelpText('หน้าเว็บกรอกให้อัตโนมัติ · filled in by the web page');
  const rate = form.addScaleItem().setTitle('หน้านี้ช่วยให้เข้าใจเนื้อหาแค่ไหน (How much did this page help you understand?)')
    .setBounds(1, 5).setLabels('ไม่ช่วยเลย / not at all', 'ช่วยมาก / a lot');
  const kind = form.addCheckboxItem().setTitle('เรื่องที่อยากบอก (What is it about?)').setChoiceValues(CHOICES);
  const text = form.addParagraphTextItem().setTitle('ส่วนไหนยังงง หรืออยากให้ปรับอะไร (What was confusing, or what should change?)');
  const device = form.addTextItem().setTitle('อุปกรณ์ (device)').setHelpText('หน้าเว็บกรอกให้อัตโนมัติ: ภาษา ขนาดจอ ธีม · filled in by the web page: language, screen size, theme');

  const sheet = SpreadsheetApp.create('EE_Web feedback responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  /* a pre-filled link with a placeholder in every question: its entry.<number> parameters are what the web page posts */
  const sample = form.createResponse()
    .withItemResponse(page.createResponse('PAGE'))
    .withItemResponse(rate.createResponse(3))
    .withItemResponse(kind.createResponse([CHOICES[0]]))
    .withItemResponse(text.createResponse('TEXT'))
    .withItemResponse(device.createResponse('DEVICE'));
  console.log('FORM_URL ' + form.getPublishedUrl());
  console.log('PREFILL ' + sample.toPrefilledUrl());
  console.log('EDIT_URL ' + form.getEditUrl());
  console.log('SHEET_URL ' + sheet.getUrl());
}
