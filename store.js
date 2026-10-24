/* طبقة البيانات: الآن LocalStorage (تجريبي). لاحقًا استبدل load/save بنداءات Supabase
   (جداول: restaurants, categories, items, extras, orders مع RLS على restaurant_id). */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Math.round(n).toLocaleString('en-US') + ' د.ج';
const itemPrice = i => i.price * (1 - (i.discount || 0) / 100);
// يحوّل 0555123456 أو +213555123456 إلى 213555123456؛ يعيد '' إذا كان غير صالح
function waNum(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '213' + d.slice(1);
  return /^\d{11,13}$/.test(d) ? d : '';
}
const Store = {
  defaults() {
    const it = (id, cat, name, desc, price, emoji, extra = {}) => ({ id, cat, name, desc, price, emoji, img: '', badge: '', discount: 0, available: true, ...extra });
    return {
      restaurant: {
        id: 'royal-taste', demo: true, name: 'مطعم الذوق الملكي', tagline: 'نكهة فاخرة تصل إليك ساخنة',
        logo: '', cover: '', phone: '0555000000', whatsapp: '0555000000',
        wilaya: 'الجزائر', commune: 'باب الزوار', address: 'عنوان تجريبي - عدّله من لوحة التحكم',
        hours: 'يوميًا من 11:00 صباحًا إلى 00:00 ليلًا',
        social: { facebook: '', instagram: '', tiktok: '', messenger: '' },
        delivery: true, pickup: true, fee: 200, minOrder: 800, open: true, tables: 10, coupons: [{ code: 'ROYAL10', percent: 10 }],
        theme: { primary: '#c9a24b', dark: '#15110d', text: '#f5efe3' }
      },
      categories: [{ id: 'burger', name: 'برغر' }, { id: 'pizza', name: 'بيتزا' }, { id: 'shawarma', name: 'شاورما' }, { id: 'fast', name: 'وجبات سريعة' }, { id: 'drinks', name: 'مشروبات' }],
      extras: [{ id: 'e1', name: 'جبن إضافي', price: 50 }, { id: 'e2', name: 'صلصة ثوم', price: 30 }, { id: 'e3', name: 'بطاطا مقلية', price: 150 }, { id: 'e4', name: 'مشروب غازي', price: 100 }],
      items: [
        it('i1', 'burger', 'برغر ملكي', 'لحم بقري مشوي، جبن شيدر، خس، طماطم وصلصة خاصة', 700, '🍔', { badge: 'الأكثر طلبًا' }),
        it('i2', 'burger', 'تشيكن برغر', 'صدر دجاج مقرمش مع جبن وصلصة الثوم', 600, '🍔'),
        it('i3', 'pizza', 'بيتزا مارغريتا', 'صلصة طماطم، موزاريلا وريحان', 800, '🍕'),
        it('i4', 'pizza', 'بيتزا الذوق الملكي', 'لحم مفروم، فطر، زيتون وفلفل', 1200, '🍕', { badge: 'جديد' }),
        it('i5', 'shawarma', 'شاورما دجاج', 'دجاج متبّل مع ثوم وبطاطا ومخلل', 450, '🌯', { badge: 'الأكثر طلبًا' }),
        it('i6', 'shawarma', 'شاورما لحم', 'لحم مشوي بالصلصة الشرقية', 550, '🌯'),
        it('i7', 'fast', 'وجبة تاكوس', 'تاكوس دجاج مع جبن وبطاطا', 650, '🌮', { badge: 'عرض خاص', discount: 15 }),
        it('i8', 'fast', 'بطاطا مقلية', 'حصة كبيرة مع صلصة', 200, '🍟'),
        it('i9', 'drinks', 'عصير برتقال طبيعي', 'برتقال طازج بدون سكر مضاف', 250, '🍊'),
        it('i10', 'drinks', 'مشروب غازي', 'علبة 33cl', 100, '🥤')
      ],
      orders: []
    };
  },
  key: s => 'smartmenu:v2:' + s,
  load(s) { try { const d = JSON.parse(localStorage.getItem(this.key(s))); if (d && d.restaurant) return d; } catch (e) {} return null; },
  save(d) { try { localStorage.setItem(this.key(d.restaurant.id), JSON.stringify(d)); return true; } catch (e) { alert('تعذر الحفظ: مساحة التخزين ممتلئة. استخدم صورًا أصغر.'); return false; } },
  orders(s) { try { return JSON.parse(localStorage.getItem(this.key(s) + ':orders')) || []; } catch (e) { return []; } },
  saveOrders(s, o) { try { localStorage.setItem(this.key(s) + ':orders', JSON.stringify(o)); } catch (e) {} },
  // المنيو المنشور: ملف data/<slug>.json بجانب الموقع (بلا كلمة مرور ولا طلبات)
  async published(s) { try { const r = await fetch('data/' + s + '.json', { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch (e) { return null; } },
  exportPublic(d) { const c = JSON.parse(JSON.stringify(d)); delete c.auth; return c; },
  // كلمة المرور لا تُخزَّن أبدًا: فقط ملح + ناتج PBKDF2
  async hash(pw, salt) {
    const enc = new TextEncoder(), k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    const b = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 120000 }, k, 256);
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  },
  salt() { return [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join(''); },
  async create(slug, pw, name, sample) {
    if (!/^[a-z0-9-]{3,30}$/.test(slug)) return 'المعرّف: 3-30 حرفًا إنجليزيًا صغيرًا أو أرقامًا أو شرطة.';
    if (pw.length < 6) return 'كلمة المرور 6 أحرف على الأقل.';
    if (this.load(slug)) return 'هذا المعرّف مستخدم، اختر معرّفًا آخر.';
    const d = this.defaults(); d.restaurant.id = slug;
    if (!sample) { d.items = []; d.extras = []; d.categories = [{ id: 'c1', name: 'الأطباق' }]; Object.assign(d.restaurant, { demo: false, name: name || slug, tagline: '', phone: '', whatsapp: '', address: '', commune: '', coupons: [] }); }
    const salt = this.salt(); d.auth = { salt, hash: await this.hash(pw, salt) };
    return this.save(d) ? d : 'تعذر الحفظ.';
  },
  async login(slug, pw) { const d = this.load(slug); if (!d || !d.auth) return null; return (await this.hash(pw, d.auth.salt)) === d.auth.hash ? d : null; },
  // يصغّر الصورة قبل الحفظ كي لا تمتلئ مساحة المتصفح
  readImg(file, max, cb) {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', .8)); }; im.src = r.result; };
    r.readAsDataURL(file);
  },
  applyTheme(t) { const s = document.documentElement.style; s.setProperty('--p', t.primary); s.setProperty('--d', t.dark); s.setProperty('--t', t.text); }
};
