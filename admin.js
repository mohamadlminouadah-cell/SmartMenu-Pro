const $ = s => document.querySelector(s), V = () => $('#view');
let D, R, SL, ORD = [];
const save = () => Store.save(D), saveO = () => Store.saveOrders(SL, ORD);
const ST = { new: 'جديد', prep: 'قيد التحضير', ready: 'جاهز', out: 'خرج للتوصيل', done: 'مكتمل', cancel: 'ملغى' };
const tabs = { items, orders, shop, stats, qr, acc };
function go(t) { document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); tabs[t](); }
$('#nav').onclick = e => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); };

// ---------- الوجبات ----------
function items() {
  V().innerHTML = `<div class="panel"><div class="row"><h3>الوجبات (${D.items.length})</h3><button class="btn sm" id="addI">+ وجبة جديدة</button></div><div class="tbl" style="margin-top:.7rem">` +
    (D.items.map(i => `<div class="tr"><div class="th" style="${i.img ? `background-image:url(${i.img})` : ''}">${i.img ? '' : esc(i.emoji || '🍽️')}</div>
      <div><b>${esc(i.name)}</b> ${i.badge ? `<span class="st">${esc(i.badge)}</span>` : ''}<div class="small">${esc((D.categories.find(c => c.id === i.cat) || {}).name || '-')} · ${fmt(itemPrice(i))}${i.discount ? ` (خصم ${i.discount}%)` : ''} · ${i.available ? 'متاحة' : 'غير متاحة'}</div></div>
      <div class="acts"><button class="btn ghost sm" data-a="av" data-id="${i.id}">${i.available ? 'إيقاف' : 'تفعيل'}</button><button class="btn ghost sm" data-a="ed" data-id="${i.id}">تعديل</button><button class="btn danger sm" data-a="rm" data-id="${i.id}">حذف</button></div></div>`).join('') || '<div class="empty">لا توجد وجبات بعد. أضف أول وجبة.</div>') + `</div></div>
    <div class="panel"><div class="row"><h3>التصنيفات</h3><button class="btn sm" id="addC">+ تصنيف</button></div><div class="acts" style="margin-top:.6rem">${D.categories.map(c => `<span class="st">${esc(c.name)} <button data-a="rc" data-id="${c.id}" style="background:none;color:#ff9d8f">✕</button></span>`).join('')}</div></div>
    <div class="panel"><div class="row"><h3>الإضافات</h3><button class="btn sm" id="addE">+ إضافة</button></div><div class="acts" style="margin-top:.6rem">${D.extras.map(e => `<span class="st">${esc(e.name)} (${fmt(e.price)}) <button data-a="re" data-id="${e.id}" style="background:none;color:#ff9d8f">✕</button></span>`).join('')}</div></div>` + couponsPanel();
  $('#addI').onclick = () => itemForm();
  $('#addK').onclick = () => { const c = (prompt('كود الخصم (حروف وأرقام)') || '').trim().toUpperCase(), p = +prompt('نسبة الخصم % (1-90)'); if (/^[A-Z0-9]{3,15}$/.test(c) && p >= 1 && p <= 90) { R.coupons = (R.coupons || []).filter(x => x.code !== c).concat({ code: c, percent: p }); save(); items(); } else alert('كود غير صالح أو نسبة خارج 1-90.'); };
  $('#addC').onclick = () => { const n = prompt('اسم التصنيف'); if (n && n.trim()) { D.categories.push({ id: 'c' + Date.now(), name: n.trim() }); save(); items(); } };
  $('#addE').onclick = () => { const n = prompt('اسم الإضافة'), p = +prompt('السعر بالدينار'); if (n && n.trim() && p >= 0) { D.extras.push({ id: 'e' + Date.now(), name: n.trim(), price: p }); save(); items(); } };
  V().onclick = e => {
    const b = e.target.closest('[data-a]'); if (!b) return; const id = b.dataset.id, a = b.dataset.a;
    if (a === 'av') { const i = D.items.find(x => x.id === id); i.available = !i.available; }
    else if (a === 'ed') return itemForm(D.items.find(x => x.id === id));
    else if (a === 'rm') { if (!confirm('حذف هذه الوجبة نهائيًا؟')) return; D.items = D.items.filter(x => x.id !== id); }
    else if (a === 'rc') { if (D.items.some(x => x.cat === id)) return alert('انقل وجبات هذا التصنيف أو احذفها أولًا.'); D.categories = D.categories.filter(x => x.id !== id); }
    else if (a === 're') D.extras = D.extras.filter(x => x.id !== id);
    else if (a === 'rk') R.coupons = R.coupons.filter(x => x.code !== id);
    else return;
    save(); items();
  };
}
const couponsPanel = () => `<div class="panel"><div class="row"><h3>كوبونات الخصم</h3><button class="btn sm" id="addK">+ كود</button></div><div class="acts" style="margin-top:.6rem">${(R.coupons || []).map(c => `<span class="st">${esc(c.code)} · ${c.percent}% <button data-a="rk" data-id="${esc(c.code)}" style="background:none;color:#ff9d8f">✕</button></span>`).join('') || '<span class="small">لا توجد كوبونات.</span>'}</div></div>`;
function itemForm(it) {
  const n = !it; it = it || { id: 'i' + Date.now(), cat: (D.categories[0] || {}).id, name: '', desc: '', price: 0, emoji: '🍽️', img: '', badge: '', discount: 0, available: true };
  if (!D.categories.length) return alert('أضف تصنيفًا أولًا.');
  const d = $('#dlg'); let img = it.img;
  d.innerHTML = `<div class="dlg"><h3>${n ? 'وجبة جديدة' : 'تعديل الوجبة'}</h3>
  <label class="f">الاسم<input class="in" id="fn" value="${esc(it.name)}"></label>
  <label class="f">الوصف والمكونات<textarea class="in" id="fd" rows="2">${esc(it.desc)}</textarea></label>
  <div class="two"><label class="f">السعر (د.ج)<input class="in" id="fp" type="number" min="0" value="${it.price}"></label><label class="f">خصم %<input class="in" id="fx" type="number" min="0" max="90" value="${it.discount || 0}"></label></div>
  <div class="two"><label class="f">التصنيف<select class="in" id="fc">${D.categories.map(c => `<option value="${c.id}" ${c.id === it.cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label class="f">الشارة<select class="in" id="fb">${['', 'الأكثر طلبًا', 'جديد', 'عرض خاص'].map(b => `<option ${b === it.badge ? 'selected' : ''}>${b}</option>`).join('')}</select></label></div>
  <div class="two"><label class="f">رمز تعبيري (بديل الصورة)<input class="in" id="fe" value="${esc(it.emoji)}"></label><label class="f">صورة الوجبة<input class="in" id="fi" type="file" accept="image/*"></label></div>
  <label class="opt"><span><input type="checkbox" id="fa" ${it.available ? 'checked' : ''}> متاحة للطلب</span></label>
  <div class="warn" id="fe_"></div>
  <div class="row"><button class="btn ghost" id="fcl">إلغاء</button><button class="btn" id="fs" style="flex:1">حفظ</button></div></div>`;
  $('#fi').onchange = e => e.target.files[0] && Store.readImg(e.target.files[0], 700, u => img = u);
  $('#fcl').onclick = () => d.close();
  $('#fs').onclick = () => {
    const name = $('#fn').value.trim(), price = +$('#fp').value;
    if (!name || !(price >= 0)) return $('#fe_').textContent = 'اكتب اسم الوجبة وسعرًا صحيحًا.';
    Object.assign(it, { name, desc: $('#fd').value.trim(), price, discount: Math.min(90, Math.max(0, +$('#fx').value || 0)), cat: $('#fc').value, badge: $('#fb').value, emoji: $('#fe').value || '🍽️', img, available: $('#fa').checked });
    if (n) D.items.push(it); if (save()) { d.close(); items(); }
  };
  d.showModal();
}

// ---------- الطلبات ----------
let oq = '';
function orders() {
  const k = oq.trim().toLowerCase(), list = ORD.filter(o => !k || (o.customer.name + o.customer.phone + o.date.slice(0, 10)).toLowerCase().includes(k));
  V().innerHTML = `<div class="panel"><input class="in" id="oq" placeholder="ابحث بالاسم أو الهاتف أو التاريخ (2026-10-23)" value="${esc(oq)}">
  <div class="small" style="margin:.5rem 0">الطلبات هنا تأتي من هذا المتصفح فقط. لاستقبال طلبات من أجهزة الزبائن يلزم ربط خادم وقاعدة بيانات.</div>
  <div class="tbl">${list.map(o => { const w = waNum(o.customer.phone); return `<div class="panel" style="margin:0"><div class="row"><b>${o.table ? '🪑 ' + esc(o.table) + ' · ' : ''}${esc(o.customer.name)} ${esc(o.customer.phone)}</b><b class="price">${fmt(o.total)}</b></div>
    <div class="small">${new Date(o.date).toLocaleString('ar-DZ')} · ${o.mode === 'delivery' ? 'توصيل: ' + esc(o.customer.address + '، ' + o.customer.commune + '، ' + o.customer.wilaya) : esc(o.where || 'استلام من المطعم')}${o.coupon ? ' · كوبون ' + esc(o.coupon) : ''}</div>
    <ul style="padding-inline-start:1.2rem;margin:.4rem 0">${o.lines.map(l => `<li>${esc(l.name)} × ${l.qty} ${l.extras.length ? '(+ ' + esc(l.extras.join('، ')) + ')' : ''}</li>`).join('')}</ul>${o.notes ? `<div class="small">ملاحظات: ${esc(o.notes)}</div>` : ''}
    <div class="acts"><select class="in" style="width:auto" data-s="${o.id}">${Object.entries(ST).map(([v, t]) => `<option value="${v}" ${v === o.status ? 'selected' : ''}>${t}</option>`).join('')}</select>${w ? `<a class="btn wa sm" target="_blank" rel="noopener" href="https://wa.me/${w}">واتساب الزبون</a>` : ''}<button class="btn ghost sm" data-p="${o.id}">طباعة للمطبخ</button><button class="btn danger sm" data-r="${o.id}">حذف</button></div></div>`; }).join('') || '<div class="empty">لا توجد طلبات بعد. ستظهر هنا الطلبات التي تُرسل من صفحة المنيو على هذا الجهاز.</div>'}</div></div>`;
  $('#oq').oninput = e => { oq = e.target.value; const p = e.target.selectionStart; orders(); const i = $('#oq'); i.focus(); i.setSelectionRange(p, p); };
  V().onchange = e => { const s = e.target.dataset.s; if (s) { ORD.find(o => o.id === s).status = e.target.value; saveO(); } };
  V().onclick = e => { const r = e.target.dataset.r, p = e.target.dataset.p; if (p) return ticket(ORD.find(o => o.id === p)); if (r && confirm('حذف الطلب؟')) { ORD = ORD.filter(o => o.id !== r); saveO(); orders(); } };
}

// ---------- إعدادات المطعم ----------
function shop() {
  const s = R.social, t = R.theme, f = (id, l, v, ty = 'text') => `<label class="f">${l}<input class="in" id="${id}" type="${ty}" value="${esc(v)}"></label>`;
  V().innerHTML = `<div class="panel"><h3>معلومات المطعم</h3><div class="two">${f('s_name', 'اسم المطعم', R.name)}${f('s_tag', 'شعار نصي', R.tagline)}${f('s_phone', 'رقم الهاتف', R.phone, 'tel')}${f('s_wa', 'رقم واتساب (05... أو +213...)', R.whatsapp, 'tel')}${f('s_wil', 'الولاية', R.wilaya)}${f('s_com', 'البلدية', R.commune)}</div>${f('s_adr', 'العنوان', R.address)}${f('s_hrs', 'ساعات العمل', R.hours)}
  <div class="two"><label class="f">الشعار<input class="in" id="s_logo" type="file" accept="image/*"></label><label class="f">صورة الغلاف<input class="in" id="s_cov" type="file" accept="image/*"></label></div></div>
  <div class="panel"><h3>التوصيل</h3><div class="two"><label class="opt"><span><input type="checkbox" id="s_del" ${R.delivery ? 'checked' : ''}> توصيل للمنزل</span></label><label class="opt"><span><input type="checkbox" id="s_pk" ${R.pickup ? 'checked' : ''}> استلام من المطعم</span></label>${f('s_fee', 'رسوم التوصيل (د.ج)', R.fee, 'number')}${f('s_min', 'الحد الأدنى للطلب (د.ج)', R.minOrder, 'number')}</div></div>
  <div class="panel"><h3>مواقع التواصل (روابط كاملة https://...)</h3><div class="two">${f('s_fb', 'فيسبوك', s.facebook)}${f('s_ig', 'إنستغرام', s.instagram)}${f('s_tk', 'تيك توك', s.tiktok)}${f('s_ms', 'ماسنجر', s.messenger)}</div></div>
  <div class="panel"><h3>الألوان</h3><div class="two">${f('t_p', 'اللون الرئيسي', t.primary, 'color')}${f('t_d', 'الخلفية', t.dark, 'color')}${f('t_t', 'النص', t.text, 'color')}</div>
  <div class="acts" style="margin-top:.5rem"><button class="btn ghost sm" data-pr="#c9a24b,#15110d,#f5efe3">أسود وذهبي</button><button class="btn ghost sm" data-pr="#d62828,#ffffff,#2b0b0b">أحمر وأبيض</button><button class="btn ghost sm" data-pr="#2f7d4f,#f6f0dd,#16301f">أخضر وكريمي</button></div></div>
  <div class="warn" id="s_err"></div><button class="btn" id="s_save">حفظ الإعدادات</button> <button class="btn danger" id="s_reset">إعادة البيانات التجريبية</button>`;
  V().onclick = e => { const p = e.target.dataset.pr; if (p) { const [a, b, c] = p.split(','); $('#t_p').value = a; $('#t_d').value = b; $('#t_t').value = c; } };
  $('#s_logo').onchange = e => e.target.files[0] && Store.readImg(e.target.files[0], 300, u => { R.logo = u; });
  $('#s_cov').onchange = e => e.target.files[0] && Store.readImg(e.target.files[0], 1400, u => { R.cover = u; });
  $('#s_reset').onclick = () => { if (confirm('سيتم استبدال المنيو بالبيانات التجريبية (حسابك وكلمة مرورك تبقى). متأكد؟')) { const a = D.auth, d = Store.defaults(); d.restaurant.id = SL; d.auth = a; Store.save(d); location.reload(); } };
  $('#s_save').onclick = () => {
    const g = id => $('#' + id).value.trim(), links = ['s_fb', 's_ig', 's_tk', 's_ms'].map(g);
    if (!g('s_name')) return $('#s_err').textContent = 'اسم المطعم مطلوب.';
    if (g('s_wa') && !waNum(g('s_wa'))) return $('#s_err').textContent = 'رقم واتساب غير صحيح، مثال: 0555123456';
    if (links.some(l => l && !/^https?:\/\//.test(l))) return $('#s_err').textContent = 'روابط التواصل يجب أن تبدأ بـ https://';
    Object.assign(R, { name: g('s_name'), tagline: g('s_tag'), phone: g('s_phone'), whatsapp: g('s_wa'), wilaya: g('s_wil'), commune: g('s_com'), address: g('s_adr'), hours: g('s_hrs'), delivery: $('#s_del').checked, pickup: $('#s_pk').checked, fee: +g('s_fee') || 0, minOrder: +g('s_min') || 0, demo: false,
      social: { facebook: links[0], instagram: links[1], tiktok: links[2], messenger: links[3] }, theme: { primary: g('t_p'), dark: g('t_d'), text: g('t_t') } });
    if (save()) { Store.applyTheme(R.theme); $('#s_err').textContent = ''; alert('تم حفظ الإعدادات.'); }
  };
}

// ---------- الإحصائيات ----------
function stats() {
  const ok = ORD.filter(o => o.status !== 'cancel'), sum = a => a.reduce((s, o) => s + o.total, 0), now = Date.now(), within = d => ok.filter(o => now - new Date(o.date) < d * 864e5);
  if (!ORD.length) return V().innerHTML = '<div class="panel empty">لا توجد طلبات بعد، لذلك لا توجد إحصائيات. ستظهر الأرقام تلقائيًا عند وصول أول طلب.</div>';
  const cnt = {}; ok.forEach(o => o.lines.forEach(l => cnt[l.name] = (cnt[l.name] || 0) + l.qty));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5), box = (l, v) => `<div class="stat">${l}<b>${v}</b></div>`;
  V().innerHTML = `<div class="stats">${box('عدد الطلبات', ORD.length)}${box('إجمالي المبيعات', fmt(sum(ok)))}${box('مكتملة', ORD.filter(o => o.status === 'done').length)}${box('ملغاة', ORD.filter(o => o.status === 'cancel').length)}${box('مبيعات اليوم', fmt(sum(within(1))))}${box('آخر 7 أيام', fmt(sum(within(7))))}${box('آخر 30 يومًا', fmt(sum(within(30))))}</div>
  <div class="panel" style="margin-top:1rem"><h3>الأكثر طلبًا</h3>${top.map(([n, c]) => `<div class="row"><span>${esc(n)}</span><b>${c}</b></div>`).join('') || '<div class="small">لا توجد بيانات.</div>'}</div>`;
}

function ticket(o) {
  const w = window.open('', '', 'width=340,height=600');
  w.document.write(`<body dir="rtl" style="font:14px sans-serif;width:280px"><h3>${esc(R.name)}</h3><div><b>${o.table ? 'طاولة ' + esc(o.table) : esc(o.where || '')}</b></div><div>${new Date(o.date).toLocaleString('ar-DZ')}</div><hr>${o.lines.map(l => `${esc(l.name)} × ${l.qty}` + (l.extras.length ? `<br><small>+ ${esc(l.extras.join('، '))}</small>` : '')).join('<hr>')}<hr>${o.notes ? esc(o.notes) + '<hr>' : ''}<b>الإجمالي: ${fmt(o.total)}</b></body>`);
  w.document.close(); w.print();
}

// ---------- QR والطاولات ----------
const mkQR = (text, size) => { if (!window.QRCode) return ''; const h = document.createElement('div'); new QRCode(h, { text, width: size, height: size }); const c = h.querySelector('canvas'); return c ? c.toDataURL() : ''; };
function qr() {
  const base = location.href.split('admin.html')[0] + 'index.html';
  V().innerHTML = `<div class="panel"><h3>رموز QR</h3><p class="small">ضع رابط موقعك بعد رفعه على الإنترنت. الرابط المحلي لا يعمل على هاتف الزبون. كل طاولة لها رمز خاص يفتح المنيو ويكتب رقم الطاولة تلقائيًا في الطلب.</p>
  <label class="f">رابط ملف index.html على الإنترنت<input class="in" id="qb" dir="ltr" value="${esc(base)}"></label>
  <label class="f">عدد الطاولات<input class="in" id="qn" type="number" min="0" max="200" value="${R.tables || 0}"></label>
  <div class="acts" style="margin-top:.6rem"><button class="btn" id="qall">طباعة رموز كل الطاولات</button></div></div>
  <div class="panel"><h3>رمز المنيو العام (للواجهة والقوائم)</h3><div id="qbox" style="background:#fff;padding:12px;display:inline-block;margin:.6rem 0;border-radius:12px"></div><div class="acts"><button class="btn" id="qd">تحميل الصورة</button></div></div>`;
  const url = () => $('#qb').value.trim() + '?r=' + SL;
  const draw = () => { $('#qbox').innerHTML = ''; if (window.QRCode) new QRCode($('#qbox'), { text: url(), width: 200, height: 200 }); else $('#qbox').textContent = 'تعذر تحميل مكتبة QR. تحقق من الإنترنت.'; };
  $('#qb').oninput = draw; draw();
  $('#qn').onchange = () => { R.tables = Math.max(0, Math.min(200, +$('#qn').value || 0)); save(); };
  $('#qd').onclick = () => { const c = $('#qbox canvas'); if (!c) return; const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'menu-qr.png'; a.click(); };
  $('#qall').onclick = () => {
    const n = R.tables || 0; if (!n) return alert('حدد عدد الطاولات أولًا.'); if (!window.QRCode) return alert('تعذر تحميل مكتبة QR.');
    const cards = Array.from({ length: n }, (_, i) => `<div style="border:2px solid #000;border-radius:12px;padding:12px;text-align:center;break-inside:avoid"><h3 style="margin:0">${esc(R.name)}</h3><img src="${mkQR(url() + '&t=' + (i + 1), 180)}"><h2 style="margin:4px">طاولة ${i + 1}</h2><small>امسح الرمز واطلب من مكانك</small></div>`).join('');
    const w = window.open(''); w.document.write(`<body dir="rtl" style="font-family:sans-serif"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${cards}</div></body>`); w.document.close(); setTimeout(() => w.print(), 400);
  };
}

// ---------- الحساب والنشر ----------
function acc() {
  V().innerHTML = `<div class="panel"><h3>نشر المنيو للزبائن</h3><p class="small">بيانات المنيو محفوظة في متصفحك فقط، فلا يراها الزبون على هاتفه قبل النشر. حمّل الملف وضعه في مجلد <b dir="ltr">data</b> داخل موقعك باسم <b dir="ltr">${SL}.json</b> ثم ارفع الموقع، وكرر ذلك عند كل تعديل. الملف لا يحتوي كلمة المرور ولا الطلبات.</p>
  <div class="acts"><button class="btn" id="pub">تحميل ${SL}.json</button><a class="btn ghost" href="index.html?r=${SL}&preview=1" target="_blank" rel="noopener">معاينة</a></div></div>
  <div class="panel"><h3>استعادة نسخة</h3><p class="small">ارفع ملف ${SL}.json محفوظًا سابقًا لاستعادة المنيو (حسابك وكلمة مرورك لا يتغيران).</p><input class="in" id="imp" type="file" accept=".json"></div>
  <div class="panel"><h3>تغيير كلمة المرور</h3><div class="two"><label class="f">الحالية<input class="in" id="p0" type="password" autocomplete="current-password"></label><label class="f">الجديدة (6 أحرف+)<input class="in" id="p1" type="password" autocomplete="new-password"></label></div><div class="warn" id="pe"></div><div class="acts"><button class="btn" id="pc">تغيير</button><button class="btn danger" id="out">تسجيل الخروج</button></div></div>`;
  $('#pub').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(Store.exportPublic(D))], { type: 'application/json' })); a.download = SL + '.json'; a.click(); };
  $('#imp').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const n = JSON.parse(t); if (!n.restaurant || !Array.isArray(n.items) || !Array.isArray(n.categories)) throw 0; n.restaurant.id = SL; n.auth = D.auth; D = n; R = n.restaurant; save(); alert('تمت الاستعادة.'); acc(); } catch (x) { alert('الملف غير صالح.'); } }); };
  $('#out').onclick = () => { sessionStorage.removeItem('sm:s'); location.reload(); };
  $('#pc').onclick = async () => {
    const p0 = $('#p0').value, p1 = $('#p1').value; if (p1.length < 6) return $('#pe').textContent = 'كلمة المرور الجديدة قصيرة.';
    if (await Store.hash(p0, D.auth.salt) !== D.auth.hash) return $('#pe').textContent = 'كلمة المرور الحالية غير صحيحة.';
    const salt = Store.salt(); D.auth = { salt, hash: await Store.hash(p1, salt) }; save(); $('#pe').textContent = ''; alert('تم تغيير كلمة المرور.');
  };
}

// ---------- الدخول ----------
function loginView(mode = 'in') {
  $('#app').hidden = true; const L = $('#login'); L.hidden = false; const nw = mode === 'new';
  L.innerHTML = `<div class="panel dlg"><h1>SmartMenu Pro</h1>
  <div class="acts"><button class="chip ${nw ? '' : 'on'}" data-m="in">دخول</button><button class="chip ${nw ? 'on' : ''}" data-m="new">إنشاء مطعم</button></div>
  ${nw ? '<label class="f">اسم المطعم<input class="in" id="ln"></label>' : ''}
  <label class="f">معرّف المطعم (إنجليزي: royal-taste)<input class="in" id="ls" dir="ltr" autocapitalize="off" autocomplete="username"></label>
  <label class="f">كلمة المرور${nw ? ' (6 أحرف+)' : ''}<input class="in" id="lp" type="password" autocomplete="${nw ? 'new-password' : 'current-password'}"></label>
  ${nw ? '<label class="opt"><span><input type="checkbox" id="lx"> ابدأ ببيانات تجريبية</span></label>' : ''}
  <div class="warn" id="le"></div><button class="btn" id="lg">${nw ? 'إنشاء وفتح' : 'دخول'}</button>
  <div class="small">حماية هذه النسخة محلية (على هذا المتصفح). الفصل الحقيقي بين المطاعم عبر الأجهزة يتطلب Supabase، كما في README.</div></div>`;
  L.onclick = e => { const m = e.target.dataset.m; if (m) loginView(m); };
  $('#lg').onclick = async () => {
    const slug = $('#ls').value.trim().toLowerCase(), pw = $('#lp').value, le = $('#le');
    try {
      if (nw) { const r = await Store.create(slug, pw, $('#ln').value.trim(), $('#lx').checked); if (typeof r === 'string') return le.textContent = r; sessionStorage.setItem('sm:s', slug); start(r); }
      else { const d = await Store.login(slug, pw); if (!d) return le.textContent = 'المعرّف أو كلمة المرور غير صحيحة.'; sessionStorage.setItem('sm:s', slug); start(d); }
    } catch (x) { le.textContent = 'المتصفح لا يدعم التشفير هنا. افتح الصفحة عبر https أو localhost.'; }
  };
}
function setOpen() { $('#openBtn').textContent = R.open === false ? '🔴 مغلق (اضغط للفتح)' : '🟢 مفتوح (اضغط للإغلاق)'; }
function start(d) {
  D = d; R = d.restaurant; SL = R.id; ORD = Store.orders(SL); Store.applyTheme(R.theme);
  $('#login').hidden = true; $('#app').hidden = false; $('#shopName').textContent = R.name;
  $('#prev').href = 'index.html?r=' + SL + '&preview=1'; setOpen();
  $('#openBtn').onclick = () => { R.open = R.open === false; save(); setOpen(); };
  go('items');
}
const sess = sessionStorage.getItem('sm:s'), d0 = sess && Store.load(sess);
d0 && d0.auth ? start(d0) : loginView();
