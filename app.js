const $ = s => document.querySelector(s);
const qs = new URLSearchParams(location.search);
async function boot() {
const slug = (qs.get('r') || 'royal-taste').toLowerCase(), table = (qs.get('t') || '').replace(/[^\w-]/g, '').slice(0, 8);
let D = qs.get('preview') ? Store.load(slug) : (await Store.published(slug)) || Store.load(slug);
if (!D && slug === 'royal-taste') D = Store.defaults();
if (!D) { document.body.innerHTML = '<div class="empty" style="padding:4rem 1rem">هذا المطعم غير موجود أو لم يُنشر منيوه بعد.</div>'; return; }
const R = D.restaurant;
let cart = [], cat = 'all', q = '', cur = null, qty = 1;
const byId = id => D.items.find(i => i.id === id);
const exById = id => D.extras.find(e => e.id === id);
const lineTotal = l => (itemPrice(byId(l.id)) + l.extras.reduce((s, e) => s + exById(e).price, 0)) * l.qty;
const subtotal = () => cart.reduce((s, l) => s + lineTotal(l), 0);

Store.applyTheme(R.theme);
document.title = R.name;
$('#name').textContent = R.name; $('#tagline').textContent = R.tagline;
if (R.cover) $('#hero').style.backgroundImage = `url(${R.cover})`;
if (R.logo) { $('#logo').style.backgroundImage = `url(${R.logo})`; $('#logo').textContent = ''; }
$('#demoNote').hidden = !R.demo;
$('#closedNote').hidden = R.open !== false;
$('#info').innerHTML = `${table ? `<div><b>🪑 طاولة ${esc(table)}</b></div>` : ''}<div>📍 ${esc(R.address)} - ${esc(R.commune)}، ${esc(R.wilaya)}</div><div>🕒 ${esc(R.hours)}</div>`;
const soc = [['facebook', 'فيسبوك'], ['instagram', 'إنستغرام'], ['tiktok', 'تيك توك'], ['messenger', 'ماسنجر']];
$('#actions').innerHTML =
  (R.phone ? `<a class="btn ghost" href="tel:${esc(R.phone)}">📞 اتصل بنا</a>` : '') +
  (waNum(R.whatsapp) ? `<a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/${waNum(R.whatsapp)}">واتساب</a>` : '') +
  soc.filter(([k]) => /^https?:\/\//.test(R.social[k] || '')).map(([k, n]) => `<a class="btn ghost" target="_blank" rel="noopener" href="${esc(R.social[k])}">${n}</a>`).join('');

function renderCats() {
  $('#cats').innerHTML = [{ id: 'all', name: 'الكل' }, ...D.categories].map(c => `<button class="chip ${c.id === cat ? 'on' : ''}" data-c="${esc(c.id)}">${esc(c.name)}</button>`).join('');
}
function renderMenu() {
  const k = q.trim().toLowerCase();
  let html = '';
  D.categories.filter(c => cat === 'all' || c.id === cat).forEach(c => {
    const list = D.items.filter(i => i.cat === c.id && (!k || (i.name + i.desc).toLowerCase().includes(k)));
    if (!list.length) return;
    html += `<h2 class="cat">${esc(c.name)}</h2><div class="grid">` + list.map(i => `
      <button class="item ${i.available ? '' : 'off'}" data-i="${esc(i.id)}" ${i.available && R.open !== false ? '' : 'disabled'}>
        <div class="pic" style="${i.img ? `background-image:url(${i.img})` : ''}">${i.img ? '' : esc(i.emoji || '🍽️')}${i.badge ? `<span class="badge">${esc(i.badge)}</span>` : ''}</div>
        <div class="body"><h3>${esc(i.name)}</h3><p>${esc(i.desc)}</p>
        <div class="row"><span class="price">${fmt(itemPrice(i))}${i.discount ? `<span class="old">${fmt(i.price)}</span>` : ''}</span><span class="small">${i.available ? 'أضف +' : 'غير متوفر'}</span></div></div>
      </button>`).join('') + '</div>';
  });
  $('#menu').innerHTML = html || '<div class="empty">لا توجد وجبات مطابقة لبحثك.</div>';
}
function renderBar() {
  const n = cart.reduce((s, l) => s + l.qty, 0);
  $('#cartbar').hidden = !n; $('#cn').textContent = n; $('#ct').textContent = fmt(subtotal());
}
$('#cats').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; renderCats(); renderMenu(); } };
$('#q').oninput = e => { q = e.target.value; renderMenu(); };
$('#menu').onclick = e => { const b = e.target.closest('[data-i]'); if (b) openItem(b.dataset.i); };

function openItem(id) {
  cur = byId(id); qty = 1;
  const d = $('#dItem');
  d.innerHTML = `<div class="dlg"><h3>${esc(cur.name)}</h3><p class="small">${esc(cur.desc)}</p>
    ${D.extras.length ? '<b>الإضافات</b>' : ''}${D.extras.map(e => `<label class="opt"><span><input type="checkbox" value="${esc(e.id)}"> ${esc(e.name)}</span><span>+${fmt(e.price)}</span></label>`).join('')}
    <div class="row"><div class="qty"><button id="m">−</button><b id="qv">1</b><button id="pl">+</button></div><b class="price" id="ip"></b></div>
    <div class="row"><button class="btn ghost" id="cl">إلغاء</button><button class="btn" id="add" style="flex:1">أضف إلى السلة</button></div></div>`;
  const chosen = () => [...d.querySelectorAll('input:checked')].map(i => i.value);
  const upd = () => { $('#qv').textContent = qty; $('#ip').textContent = fmt((itemPrice(cur) + chosen().reduce((s, x) => s + exById(x).price, 0)) * qty); };
  d.onchange = upd; upd();
  $('#m').onclick = () => { qty = Math.max(1, qty - 1); upd(); };
  $('#pl').onclick = () => { qty = Math.min(50, qty + 1); upd(); };
  $('#cl').onclick = () => d.close();
  $('#add').onclick = () => {
    const ex = chosen().sort(), same = cart.find(l => l.id === cur.id && l.extras.join() === ex.join());
    same ? same.qty += qty : cart.push({ id: cur.id, qty, extras: ex });
    d.close(); renderBar();
  };
  d.showModal();
}

// ---- السلة والطلب ----
let coupon = null;
const disc = () => coupon ? subtotal() * coupon.percent / 100 : 0;
$('#openCart').onclick = openCart;
function openCart() {
  const d = $('#dCart');
  const keep = id => { const el = d.querySelector('#' + id); return el ? el.value : ''; };
  const sv = (() => { try { return JSON.parse(localStorage.getItem('sm:cust')) || {}; } catch (e) { return {}; } })();
  const v = { n: keep('cn_') || sv.n || '', p: keep('cp') || sv.p || '', w: keep('cw') || sv.w || R.wilaya, c: keep('cc') || sv.c || R.commune, a: keep('ca') || sv.a || '', o: keep('co'), k: keep('ck') };
  const mode = table ? 'dine' : ((d.querySelector('input[name=mode]:checked') || {}).value || (R.delivery ? 'delivery' : 'pickup'));
  const fee = mode === 'delivery' ? R.fee : 0, total = subtotal() - disc() + fee;
  d.innerHTML = `<div class="dlg"><h3>سلة الطلبات</h3>
  ${cart.length ? cart.map((l, k) => { const it = byId(l.id); return `<div class="row"><div><b>${esc(it.name)}</b><div class="small">${l.extras.map(e => esc(exById(e).name)).join('، ')}</div></div>
    <div class="qty"><button data-d="${k}" data-v="-1">−</button><b>${l.qty}</b><button data-d="${k}" data-v="1">+</button></div><b>${fmt(lineTotal(l))}</b></div>`; }).join('') : '<div class="empty">السلة فارغة.</div>'}
  ${table ? `<div class="opt"><span>🪑 طلب على الطاولة ${esc(table)} (الاسم والهاتف اختياريان)</span></div>` : ''}
  <div class="two"><label class="f">الاسم<input class="in" id="cn_" value="${esc(v.n)}" autocomplete="name"></label><label class="f">رقم الهاتف<input class="in" id="cp" inputmode="tel" placeholder="05XXXXXXXX" value="${esc(v.p)}" autocomplete="tel"></label></div>
  ${table ? '' : `<div class="two">${R.delivery ? `<label class="opt"><span><input type="radio" name="mode" value="delivery" ${mode === 'delivery' ? 'checked' : ''}> توصيل للمنزل</span></label>` : ''}${R.pickup ? `<label class="opt"><span><input type="radio" name="mode" value="pickup" ${mode === 'pickup' ? 'checked' : ''}> استلام من المطعم</span></label>` : ''}</div>`}
  ${mode === 'delivery' ? `<div class="two"><label class="f">الولاية<input class="in" id="cw" value="${esc(v.w)}"></label><label class="f">البلدية<input class="in" id="cc" value="${esc(v.c)}"></label></div><label class="f">العنوان<input class="in" id="ca" value="${esc(v.a)}"></label>` : ''}
  <label class="f">ملاحظات (اختياري)<textarea class="in" id="co" rows="2">${esc(v.o)}</textarea></label>
  ${(R.coupons || []).length ? `<div class="row"><input class="in" id="ck" placeholder="كود خصم (اختياري)" value="${esc(v.k)}"><button class="btn ghost sm" id="ak">تطبيق</button></div>${coupon ? `<div class="small">✅ تم تطبيق الكود ${esc(coupon.code)} (خصم ${coupon.percent}%)</div>` : ''}` : ''}
  <div class="tot"><div class="row"><span>المجموع</span><span>${fmt(subtotal())}</span></div>${coupon ? `<div class="row"><span>الخصم</span><span>−${fmt(disc())}</span></div>` : ''}${fee ? `<div class="row"><span>رسوم التوصيل</span><span>${fmt(fee)}</span></div>` : ''}<div class="row big"><span>الإجمالي</span><span>${fmt(total)}</span></div></div>
  <div class="warn" id="err"></div>
  <button class="btn wa" id="sendWa" ${cart.length ? '' : 'disabled'}>اطلب عبر واتساب</button>
  <button class="btn ghost" id="saveLocal" ${cart.length ? '' : 'disabled'}>إرسال مباشر (تجريبي)</button>
  <div class="small">«الإرسال المباشر» يحفظ الطلب في هذا المتصفح فقط ولا يصل إلى المطعم قبل ربط خادم وقاعدة بيانات. للطلب الفعلي استخدم واتساب.</div>
  <button class="btn ghost" id="close">متابعة التسوق</button></div>`;
  d.onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; const l = cart[b.dataset.d]; l.qty += +b.dataset.v; if (l.qty < 1) cart.splice(b.dataset.d, 1); renderBar(); openCart(); };
  d.onchange = e => { if (e.target.name === 'mode') openCart(); };
  $('#close').onclick = () => d.close();
  const ak = $('#ak'); if (ak) ak.onclick = () => { const c = R.coupons.find(x => x.code.toLowerCase() === $('#ck').value.trim().toLowerCase()); coupon = c || null; openCart(); if (!c) $('#err').textContent = 'كود الخصم غير صحيح.'; };
  if (cart.length) { $('#sendWa').onclick = () => submit('wa'); $('#saveLocal').onclick = () => submit('local'); }
  if (!d.open) d.showModal();
}
function submit(kind) {
  const g = id => ($('#' + id) || { value: '' }).value.trim();
  const rm = $('input[name=mode]:checked'), mode = table ? 'dine' : rm && rm.value, delivery = mode === 'delivery', err = $('#err');
  const name = g('cn_'), phone = g('cp').replace(/[\s.-]/g, '');
  if (R.open === false) return err.textContent = 'المطعم مغلق حاليًا.';
  if (!table && !name) return err.textContent = 'اكتب اسمك.';
  if ((!table || phone) && !/^(0|\+213|00213)\d{8,9}$/.test(phone)) return err.textContent = 'رقم الهاتف غير صحيح، مثال: 0555123456';
  if (!mode) return err.textContent = 'اختر طريقة الاستلام.';
  if (delivery && (!g('cw') || !g('cc') || !g('ca'))) return err.textContent = 'أكمل الولاية والبلدية والعنوان.';
  if (!table && subtotal() < R.minOrder) return err.textContent = `الحد الأدنى للطلب ${fmt(R.minOrder)}.`;
  const fee = delivery ? R.fee : 0, total = subtotal() - disc() + fee;
  const where = table ? `في المطعم - طاولة ${table}` : delivery ? 'توصيل إلى المنزل' : 'استلام من المطعم';
  const lines = cart.map(l => ({ name: byId(l.id).name, qty: l.qty, extras: l.extras.map(e => exById(e).name), total: lineTotal(l) }));
  const order = { id: 'o' + Date.now(), date: new Date().toISOString(), status: 'new', source: kind, table, customer: { name, phone, wilaya: g('cw'), commune: g('cc'), address: g('ca') }, mode, where, notes: g('co'), lines, fee, coupon: coupon && coupon.code, discount: disc(), total };
  if (kind === 'wa') {
    const num = waNum(R.whatsapp);
    if (!num) return err.textContent = 'رقم واتساب المطعم غير مضبوط. يعدّله صاحب المطعم من لوحة التحكم.';
    const msg = [`*طلب جديد - ${R.name}*`, table ? `🪑 *الطاولة: ${table}*` : null, '', ...lines.map(l => `• ${l.name} × ${l.qty}${l.extras.length ? ' (+ ' + l.extras.join('، ') + ')' : ''} = ${fmt(l.total)}`), '',
      `المجموع: ${fmt(subtotal())}`, coupon ? `الخصم (${coupon.code}): −${fmt(disc())}` : null, delivery ? `التوصيل: ${fmt(fee)}` : null, `*الإجمالي: ${fmt(total)}*`, '',
      name ? `الاسم: ${name}` : null, phone ? `الهاتف: ${phone}` : null, `الاستلام: ${where}`,
      delivery ? `العنوان: ${g('ca')}، ${g('cc')}، ${g('cw')}` : null, order.notes ? `ملاحظات: ${order.notes}` : null].filter(x => x !== null).join('\n');
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
  }
  const os = Store.orders(slug); os.unshift(order); Store.saveOrders(slug, os); // نسخة محلية للتجربة فقط
  if (!table) try { localStorage.setItem('sm:cust', JSON.stringify({ n: name, p: phone, w: g('cw'), c: g('cc'), a: g('ca') })); } catch (e) {}
  cart = []; coupon = null; renderBar();
  $('#dCart').innerHTML = `<div class="dlg"><h3>${kind === 'wa' ? 'تم تجهيز رسالتك' : 'تم حفظ الطلب محليًا'}</h3><p>${kind === 'wa' ? 'أكمل إرسال الرسالة داخل واتساب ليصل طلبك إلى المطعم.' : 'هذا الطلب محفوظ في هذا الجهاز فقط (نسخة تجريبية)، ولم يُرسل إلى المطعم.'}</p><button class="btn" onclick="$('#dCart').close()">حسنًا</button></div>`;
}
renderCats(); renderMenu(); renderBar();
}
boot();
