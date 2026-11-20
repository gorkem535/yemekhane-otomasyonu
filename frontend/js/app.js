'use strict';

const API = '/api';
const state = {
  user: null,
  reservations: [],
  recentMenuIds: new Set(),
  reservationFilter: 'all',
  adminOptions: { yemekhaneler: [], ogunler: [], yemekler: [] },
  adminReports: []
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function getFirst(object, keys, fallback = '') {
  for (const key of keys) if (object && object[key] !== undefined && object[key] !== null) return object[key];
  return fallback;
}

function unwrapArray(payload, keys) {
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload)) return payload;
  return [];
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function money(value) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number.isFinite(number) ? number : 0);
}

function dateKey(value) {
  if (!value) return '';
  const raw = String(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match && !raw.includes('T')) return match[1];
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return match?.[1] || '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function formatDate(value, options = {}) {
  const key = dateKey(value);
  if (!key) return '—';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', ...(options.year === false ? {} : { year: 'numeric' }), timeZone: 'UTC' }).format(date);
}

function parseSqlDateTime(value) {
  if (!value) return null;
  const text = String(value);
  // MySQL DATETIME değerlerinin saat dilimi belirtilmez; veritabanı İstanbul saatini kullanır.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text) ? text.replace(' ', 'T') + '+03:00' : text;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toast(message, type = 'info') {
  const area = $('#toast-area');
  const item = document.createElement('div');
  item.className = `toast ${type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`;
  item.textContent = message;
  area.append(item);
  window.setTimeout(() => item.remove(), 4200);
}

async function apiFetch(path, options = {}) {
  const config = { method: options.method || 'GET', credentials: 'same-origin', headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }, ...options };
  if (config.body && typeof config.body !== 'string') config.body = JSON.stringify(config.body);
  let response;
  try {
    response = await fetch(`${API}${path}`, config);
  } catch (error) {
    throw new Error('Sunucuya ulaşılamadı. Docker servislerinin çalıştığını kontrol et.');
  }
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok || data.basarili === false) {
    const message = getFirst(data, ['mesaj', 'message', 'hata', 'error'], `İstek başarısız oldu (HTTP ${response.status}).`);
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function showLogin() {
  $('#login-view').hidden = false;
  $('#app-view').hidden = true;
  $('#login-password').value = '';
  $('#login-error').textContent = '';
}

function showApp(user) {
  state.user = user || {};
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  const fullName = [getFirst(user, ['ad', 'isim'], ''), getFirst(user, ['soyad'], '')].filter(Boolean).join(' ') || getFirst(user, ['adSoyad', 'ad_soyad', 'eposta'], 'Kullanıcı');
  const role = getFirst(user, ['rol'], 'ogrenci');
  $('#user-name').textContent = fullName;
  $('#user-role').textContent = ({ ogrenci: 'Öğrenci', personel: 'Personel', yonetici: 'Yönetici' })[role] || role;
  $('#user-avatar').textContent = (fullName.trim()[0] || 'K').toLocaleUpperCase('tr-TR');
  $('#balance-owner').textContent = fullName;
  $('#admin-nav').hidden = role !== 'yonetici';
  $('#today-label').textContent = formatDate(todayISO());
  $('#weekly-start').value = todayISO();
  changeView('daily');
  loadReservations().catch(() => {});
}

async function restoreSession() {
  try {
    const data = await apiFetch('/auth/me');
    const user = getFirst(data, ['kullanici', 'user', 'oturum'], data);
    if (user && (user.id || user.kullanici_id || user.eposta)) showApp(user);
    else showLogin();
  } catch {
    showLogin();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const button = $('#login-form button[type="submit"]');
  const errorBox = $('#login-error');
  errorBox.textContent = '';
  button.disabled = true;
  button.textContent = 'Giriş yapılıyor…';
  try {
    const data = await apiFetch('/auth/giris', { method: 'POST', body: { eposta: $('#login-email').value.trim(), sifre: $('#login-password').value } });
    const user = getFirst(data, ['kullanici', 'user'], data);
    showApp(user);
    toast('Hoş geldin! Oturumun açıldı.', 'success');
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Giriş yap <span aria-hidden="true">→</span>';
  }
}

async function logout() {
  try { await apiFetch('/auth/cikis', { method: 'POST' }); }
  catch (error) { toast(error.message, 'error'); }
  state.user = null;
  state.reservations = [];
  showLogin();
  toast('Güvenli çıkış yapıldı.', 'success');
}

function changeView(name) {
  const titles = { daily: 'Günlük menü', weekly: 'Haftalık menü', reservations: 'Rezervasyonlarım', balance: 'Bakiyem', reviews: 'Değerlendirmeler', admin: 'Yönetici paneli' };
  if (name === 'admin' && state.user?.rol !== 'yonetici') return;
  $$('.page-section').forEach(section => { section.hidden = section.id !== `page-${name}`; });
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  $('#page-breadcrumb').textContent = titles[name] || 'Ana sayfa';
  closeMobileMenu();
  const loaders = { daily: loadDailyMenus, weekly: loadWeeklyMenus, reservations: loadReservations, balance: loadBalance, reviews: loadReviews, admin: loadAdmin };
  loaders[name]?.().catch(error => toast(error.message, 'error'));
}

function fillSelect(select, rows, placeholder, selectedValue = '') {
  if (!select) return;
  const current = selectedValue || select.value;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` + rows.map(row => {
    const id = getFirst(row, ['id', 'yemekhane_id', 'ogun_id', 'yemek_id']);
    const name = getFirst(row, ['ad', 'yemekhane', 'ogun', 'yemek', 'name']);
    return `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`;
  }).join('');
  if (current && rows.some(row => String(getFirst(row, ['id', 'yemekhane_id', 'ogun_id', 'yemek_id'])) === String(current))) select.value = current;
}

async function loadMenuRows(start, end, canteenId = '', mealId = '') {
  const query = new URLSearchParams({ baslangic: start, bitis: end });
  if (canteenId) query.set('yemekhaneId', canteenId);
  if (mealId) query.set('ogunId', mealId);
  const data = await apiFetch(`/menuler?${query.toString()}`);
  return unwrapArray(data, ['menuler', 'sonuclar', 'veriler', 'data']);
}

function groupMenus(rows) {
  const map = new Map();
  for (const row of rows) {
    const id = getFirst(row, ['menu_id', 'menuId', 'id']);
    if (id === '') continue;
    if (!map.has(String(id))) {
      map.set(String(id), {
        id,
        date: getFirst(row, ['tarih', 'menu_tarihi']),
        canteenId: getFirst(row, ['yemekhane_id', 'yemekhaneId']),
        canteen: getFirst(row, ['yemekhane', 'yemekhane_ad'], 'Yemekhane'),
        mealId: getFirst(row, ['ogun_id', 'ogunId']),
        meal: getFirst(row, ['ogun', 'ogun_ad'], 'Öğün'),
        deadline: getFirst(row, ['rezervasyon_son', 'rezervasyonSon']),
        studentPrice: getFirst(row, ['ogrenci_fiyati', 'ogrenciFiyati'], 0),
        staffPrice: getFirst(row, ['personel_fiyati', 'personelFiyati'], 0),
        capacity: getFirst(row, ['kapasite'], 0),
        reserved: getFirst(row, ['rezerve', 'rezervasyon_sayisi'], 0),
        emptySeats: getFirst(row, ['bos_yer', 'bosYer'], 0),
        foods: []
      });
    }
    const menu = map.get(String(id));
    const foodId = getFirst(row, ['yemek_id', 'yemekId']);
    if (foodId !== '' && !menu.foods.some(food => String(food.id) === String(foodId))) {
      menu.foods.push({
        id: foodId,
        name: getFirst(row, ['yemek', 'yemek_ad'], 'Yemek'),
        category: getFirst(row, ['kategori', 'kategori_ad'], ''),
        calories: Number(getFirst(row, ['kalori'], 0)),
        vegetarian: Boolean(Number(getFirst(row, ['vejetaryen'], 0))),
        allergens: getFirst(row, ['alerjenler'], '')
      });
    }
  }
  return [...map.values()].sort((a, b) => `${dateKey(a.date)}-${a.mealId}-${a.canteenId}`.localeCompare(`${dateKey(b.date)}-${b.mealId}-${b.canteenId}`));
}

function reservationForMenu(menuId) {
  return state.reservations.find(item => String(getFirst(item, ['menu_id', 'menuId'])) === String(menuId) && getFirst(item, ['durum', 'status']) === 'aktif');
}

function deadlinePassed(value) {
  const deadline = parseSqlDateTime(value);
  return deadline ? Date.now() > deadline.getTime() : false;
}

function mealEmoji(meal) {
  const text = String(meal).toLocaleLowerCase('tr-TR');
  if (text.includes('kahvalt')) return '☕';
  if (text.includes('öğle')) return '🍲';
  if (text.includes('akşam')) return '🍽';
  return '🥗';
}

function renderMenuCard(menu, showDate = false) {
  const userRole = state.user?.rol;
  const price = userRole === 'ogrenci' ? menu.studentPrice : menu.staffPrice;
  const calories = menu.foods.reduce((total, food) => total + food.calories, 0);
  const already = reservationForMenu(menu.id) || state.recentMenuIds.has(String(menu.id));
  const full = Number(menu.emptySeats) <= 0;
  const expired = deadlinePassed(menu.deadline);
  const disabled = Boolean(already || full || expired);
  const statusText = already ? 'Rezervasyonun var' : full ? 'Kapasite doldu' : expired ? 'Süre doldu' : `${menu.emptySeats} boş yer`;
  const statusClass = already ? 'pill-green' : (full || expired) ? 'pill-red' : 'pill-gold';
  const foods = menu.foods.map(food => `<div class="food-row"><span class="food-symbol">${food.vegetarian ? '🥬' : '🍴'}</span><div class="food-info"><strong>${escapeHtml(food.name)}</strong><small>${escapeHtml(food.category || 'Menü')}${food.calories ? ` · ${food.calories} kcal` : ''}</small><div class="food-tags">${food.vegetarian ? '<span class="food-tag vegetarian">Vejetaryen</span>' : ''}${food.allergens ? `<span class="food-tag">Alerjen: ${escapeHtml(food.allergens)}</span>` : ''}</div></div></div>`).join('');
  return `<article class="menu-card" data-menu-id="${escapeHtml(menu.id)}">
    <div class="menu-card-head"><div class="menu-title"><span class="meal-icon">${mealEmoji(menu.meal)}</span><div><h3>${escapeHtml(menu.meal)}</h3><p>${escapeHtml(menu.canteen)}${showDate ? ` · ${escapeHtml(formatDate(menu.date))}` : ''}</p></div></div><div class="menu-meta"><span class="pill ${statusClass}">${escapeHtml(statusText)}</span></div></div>
    <div class="food-grid">${foods || '<div class="empty-state">Bu menüye henüz yemek eklenmemiş.</div>'}</div>
    <div class="menu-card-footer"><div class="menu-summary"><div class="summary-item"><span>Toplam enerji</span><strong>${calories.toLocaleString('tr-TR')} kcal</strong></div><div class="summary-item"><span>Rezervasyon sonu</span><strong>${escapeHtml(formatTime(menu.deadline))}</strong></div><div class="summary-item"><span>Doluluk</span><strong>${Number(menu.capacity) ? `${Number(menu.reserved)} / ${Number(menu.capacity)}` : '—'}</strong></div></div><div class="menu-actions"><span class="menu-price">${money(price)}</span><button class="button ${disabled ? 'button-secondary' : 'button-primary'} reserve-button" type="button" data-reserve-menu="${escapeHtml(menu.id)}" ${disabled ? 'disabled' : ''}>${already ? 'Rezervasyon mevcut' : full ? 'Yer kalmadı' : expired ? 'Süre doldu' : 'Rezervasyon yap'}</button></div></div>
  </article>`;
}

function formatTime(value) {
  if (!value) return '—';
  const date = parseSqlDateTime(value);
  if (date) return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(date);
  const match = String(value).match(/(\d{2}:\d{2})/);
  return match ? match[1] : String(value);
}

async function loadDailyMenus() {
  const container = $('#daily-menu-list');
  container.innerHTML = '<div class="loading-state">Günün menüleri yükleniyor…</div>';
  const rows = await loadMenuRows(todayISO(), todayISO(), $('#daily-canteen').value, $('#daily-meal').value);
  const menus = groupMenus(rows);
  container.innerHTML = menus.length ? menus.map(menu => renderMenuCard(menu)).join('') : '<div class="empty-state"><strong>Bugün için menü bulunamadı.</strong>Farklı bir yemekhane veya öğün seçebilirsin.</div>';
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

async function loadWeeklyMenus() {
  const container = $('#weekly-menu-list');
  const start = $('#weekly-start').value || todayISO();
  container.innerHTML = '<div class="loading-state">Haftalık menüler yükleniyor…</div>';
  const rows = await loadMenuRows(start, addDays(start, 6), $('#weekly-canteen').value);
  const menus = groupMenus(rows);
  if (!menus.length) {
    container.innerHTML = '<div class="empty-state"><strong>Bu tarih aralığında menü bulunamadı.</strong>Başka bir başlangıç tarihi seçebilirsin.</div>';
    return;
  }
  const sections = new Map();
  menus.forEach(menu => {
    const key = dateKey(menu.date);
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key).push(menu);
  });
  container.innerHTML = [...sections.entries()].map(([date, items]) => `<div class="menu-day-heading">${escapeHtml(formatDate(date))}</div>${items.map(menu => renderMenuCard(menu, false)).join('')}`).join('');
}

async function bookMenu(menuId, button) {
  button.disabled = true;
  const original = button.textContent;
  button.textContent = 'İşleniyor…';
  try {
    const data = await apiFetch('/rezervasyonlar', { method: 'POST', body: { menuId: Number(menuId) } });
    state.recentMenuIds.add(String(menuId));
    const result = getFirst(data, ['sonuc', 'rezervasyon', 'islem'], data);
    const balance = getFirst(result, ['bakiye'], getFirst(data, ['bakiye']));
    const cost = getFirst(result, ['ucret', 'tutar'], getFirst(data, ['ucret']));
    toast(`Rezervasyon oluşturuldu. ${cost !== '' ? `Ücret: ${money(cost)}. ` : ''}${balance !== '' ? `Güncel bakiyen: ${money(balance)}.` : 'Bakiye bilgisi güncellendi.'}`, 'success');
    await loadReservations();
    if (!$('#page-daily').hidden) await loadDailyMenus();
    if (!$('#page-weekly').hidden) await loadWeeklyMenus();
  } catch (error) {
    button.disabled = false;
    button.textContent = original;
    toast(error.message, 'error');
  }
}

async function loadReservations() {
  const container = $('#reservation-list');
  if (container) container.innerHTML = '<div class="loading-state">Rezervasyonların getiriliyor…</div>';
  const data = await apiFetch('/rezervasyonlar');
  state.reservations = unwrapArray(data, ['rezervasyonlar', 'sonuclar', 'veriler', 'data']);
  if (container) renderReservations();
}

function renderReservations() {
  const container = $('#reservation-list');
  const rows = state.reservations.filter(item => state.reservationFilter === 'all' || getFirst(item, ['durum', 'status']) === state.reservationFilter);
  if (!rows.length) {
    container.innerHTML = '<div class="empty-state"><strong>Bu kategoride rezervasyon yok.</strong>Menüleri inceleyerek yeni bir rezervasyon oluşturabilirsin.</div>';
    return;
  }
  container.innerHTML = rows.map(item => {
    const id = getFirst(item, ['rezervasyon_id', 'rezervasyonId', 'id']);
    const status = getFirst(item, ['durum', 'status'], 'aktif');
    const menu = getFirst(item, ['ogun', 'ogun_ad'], 'Yemek rezervasyonu');
    const canteen = getFirst(item, ['yemekhane', 'yemekhane_ad'], 'Yemekhane');
    const date = getFirst(item, ['tarih', 'menu_tarihi']);
    const canCancel = status === 'aktif' && !deadlinePassed(getFirst(item, ['rezervasyon_son', 'rezervasyonSon']));
    const stateLabel = ({ aktif: 'Aktif', kullanildi: 'Kullanıldı', iptal: 'İptal edildi' })[status] || status;
    const stateClass = status === 'aktif' ? 'pill-green' : status === 'iptal' ? 'pill-red' : 'pill';
    return `<div class="reservation-row"><div class="reservation-main"><strong>${escapeHtml(menu)} · ${escapeHtml(canteen)}</strong><small>${escapeHtml(formatDate(date))}</small></div><div class="reservation-date reservation-detail"><span class="muted">Rezervasyon #${escapeHtml(id)}</span></div><div class="reservation-state"><span class="pill ${stateClass}">${escapeHtml(stateLabel)}</span></div><div class="reservation-money">${money(getFirst(item, ['ucret', 'tutar'], 0))}</div><div class="reservation-action">${canCancel ? `<button class="button button-secondary cancel-reservation" type="button" data-cancel-reservation="${escapeHtml(id)}">İptal et</button>` : ''}</div></div>`;
  }).join('');
}

async function cancelReservation(id, button) {
  button.disabled = true;
  button.textContent = 'İptal ediliyor…';
  try {
    const data = await apiFetch(`/rezervasyonlar/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const result = getFirst(data, ['sonuc', 'rezervasyon', 'islem'], data);
    const refund = getFirst(result, ['iade'], getFirst(data, ['iade']));
    const balance = getFirst(result, ['bakiye'], getFirst(data, ['bakiye']));
    toast(`Rezervasyon iptal edildi.${refund !== '' ? ` İade: ${money(refund)}.` : ''}${balance !== '' ? ` Güncel bakiye: ${money(balance)}.` : ''}`, 'success');
    state.recentMenuIds.clear();
    await loadReservations();
    if (!$('#page-daily').hidden) await loadDailyMenus();
    if (!$('#page-weekly').hidden) await loadWeeklyMenus();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'İptal et';
    toast(error.message, 'error');
  }
}

async function loadBalance() {
  $('#balance-movements').innerHTML = '<div class="loading-state">Hesap hareketleri yükleniyor…</div>';
  const data = await apiFetch('/bakiye');
  const balance = getFirst(data, ['bakiye', 'guncelBakiye', 'guncel_bakiye'], getFirst(data.kullanici, ['bakiye'], 0));
  $('#balance-amount').textContent = money(balance);
  const movements = unwrapArray(data, ['hareketler', 'islemler', 'bakiyeHareketleri', 'data']);
  renderMovements(movements);
}

function renderMovements(rows) {
  const container = $('#balance-movements');
  if (!rows.length) { container.innerHTML = '<div class="empty-state">Henüz bakiye hareketi bulunmuyor.</div>'; return; }
  const tableRows = rows.map(item => {
    const amount = Number(getFirst(item, ['tutar', 'miktar'], 0));
    const type = getFirst(item, ['tur', 'tip', 'islem_turu'], 'İşlem');
    const descriptions = { yukleme: 'Bakiye yükleme', rezervasyon: 'Menü rezervasyonu', iade: 'Rezervasyon iadesi' };
    return `<tr><td>${escapeHtml(formatDate(getFirst(item, ['olusturma', 'tarih'])))}</td><td><strong>${escapeHtml(getFirst(item, ['aciklama'], descriptions[type] || type))}</strong></td><td class="${amount >= 0 ? 'amount-positive' : 'amount-negative'}">${amount > 0 ? '+' : ''}${money(amount)}</td></tr>`;
  }).join('');
  container.innerHTML = `<table><thead><tr><th>TARİH</th><th>İŞLEM</th><th>TUTAR</th></tr></thead><tbody>${tableRows}</tbody></table>`;
}

async function topUp(event) {
  event.preventDefault();
  const input = $('#topup-amount');
  const amount = Number(input.value);
  if (!Number.isFinite(amount) || amount < 10 || amount > 1000) { toast('Yükleme tutarı 10 TL ile 1.000 TL arasında olmalıdır.', 'error'); return; }
  const button = $('#topup-form button[type="submit"]');
  button.disabled = true;
  try {
    const data = await apiFetch('/bakiye/yukle', { method: 'POST', body: { tutar: amount } });
    const result = getFirst(data, ['sonuc', 'islem'], data);
    if (getFirst(result, ['bakiye']) !== '') $('#balance-amount').textContent = money(result.bakiye);
    input.value = '';
    toast('Bakiye yükleme işlemi tamamlandı.', 'success');
    await loadBalance();
  } catch (error) { toast(error.message, 'error'); }
  finally { button.disabled = false; }
}

async function loadReviews() {
  const container = $('#review-list');
  container.innerHTML = '<div class="loading-state">Değerlendirmeler yükleniyor…</div>';
  const data = await apiFetch('/degerlendirmeler');
  const rows = unwrapArray(data, ['degerlendirmeler', 'menuler', 'sonuclar', 'data']);
  if (!rows.length) { container.innerHTML = '<div class="empty-state"><strong>Değerlendirmeye açık menü yok.</strong>Kullandığın menüler burada görünecek.</div>'; return; }
  container.innerHTML = rows.map(item => {
    const menuId = getFirst(item, ['menu_id', 'menuId']);
    const title = `${getFirst(item, ['ogun', 'ogun_ad'], 'Menü')} · ${getFirst(item, ['yemekhane', 'yemekhane_ad'], 'Yemekhane')}`;
    const existing = Boolean(getFirst(item, ['degerlendirildi', 'degerlendirildi_mi', 'puan'], false));
    const review = getFirst(item, ['yorum'], '');
    const stars = Number(getFirst(item, ['puan'], 0));
    return `<article class="review-card"><div class="review-card-head"><div><h3>${escapeHtml(title)}</h3><p class="muted">${escapeHtml(formatDate(getFirst(item, ['tarih', 'menu_tarihi'])))}</p></div><span class="pill ${existing ? 'pill-green' : 'pill-gold'}">${existing ? 'Değerlendirildi' : 'Değerlendirebilirsin'}</span></div>${existing ? `<div class="stars" aria-label="${stars} / 5">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div><div class="reviewed-comment">${escapeHtml(review || 'Yorum eklenmemiş.')}</div>` : `<form class="review-form" data-review-menu="${escapeHtml(menuId)}"><div class="field"><label for="review-score-${escapeHtml(menuId)}">Puanın</label><select id="review-score-${escapeHtml(menuId)}" name="puan" required><option value="5">5 · Çok iyi</option><option value="4">4 · İyi</option><option value="3">3 · Orta</option><option value="2">2 · Kötü</option><option value="1">1 · Çok kötü</option></select></div><div class="field" style="margin-top:10px"><label for="review-comment-${escapeHtml(menuId)}">Yorumun (isteğe bağlı)</label><textarea id="review-comment-${escapeHtml(menuId)}" name="yorum" maxlength="500" placeholder="Menü hakkındaki düşünceni yaz…"></textarea></div><div class="review-form-bottom"><span class="muted">En fazla 500 karakter</span><button class="button button-primary" type="submit">Değerlendir</button></div></form>`}</article>`;
  }).join('');
}

async function submitReview(event) {
  event.preventDefault();
  const form = event.target.closest('.review-form');
  if (!form) return;
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  const formData = new FormData(form);
  try {
    await apiFetch('/degerlendirmeler', { method: 'POST', body: { menuId: Number(form.dataset.reviewMenu), puan: Number(formData.get('puan')), yorum: String(formData.get('yorum') || '').trim() } });
    toast('Değerlendirmen kaydedildi. Teşekkürler!', 'success');
    await loadReviews();
  } catch (error) { button.disabled = false; toast(error.message, 'error'); }
}

async function loadAdminOptions() {
  const data = await apiFetch('/yonetici/secenekler');

  const options = data.secenekler || data;

  state.adminOptions = {
    yemekhaneler: unwrapArray(options, ['yemekhaneler']),
    ogunler: unwrapArray(options, ['ogunler']),
    yemekler: unwrapArray(options, ['yemekler'])
  };

  fillSelect($('#daily-canteen'), state.adminOptions.yemekhaneler, 'Tüm yemekhaneler');
  fillSelect($('#weekly-canteen'), state.adminOptions.yemekhaneler, 'Tüm yemekhaneler');
  fillSelect($('#admin-canteen'), state.adminOptions.yemekhaneler, 'Seçiniz');
  fillSelect($('#daily-meal'), state.adminOptions.ogunler, 'Tüm öğünler');
  fillSelect($('#admin-meal'), state.adminOptions.ogunler, 'Seçiniz');

  renderFoodOptions();
}

function renderFoodOptions(selectedIds = []) {
  const list = $('#admin-food-options');
  const selected = new Set(selectedIds.map(String));
  const foods = state.adminOptions.yemekler;
  if (!foods.length) { list.innerHTML = '<span class="muted">Yemek listesi bulunamadı.</span>'; return; }
  list.innerHTML = foods.map(food => {
    const id = getFirst(food, ['id', 'yemek_id']);
    const name = getFirst(food, ['ad', 'yemek']);
    const category = getFirst(food, ['kategori', 'kategori_ad'], '');
    return `<label class="food-check"><input type="checkbox" name="yemekIds" value="${escapeHtml(id)}" ${selected.has(String(id)) ? 'checked' : ''}><span>${escapeHtml(name)}${category ? `<small class="muted"> · ${escapeHtml(category)}</small>` : ''}</span></label>`;
  }).join('');
}

async function loadAdminReports() {
  const data = await apiFetch('/yonetici/raporlar');
  state.adminReports = unwrapArray(data, ['raporlar', 'menuler', 'data']);
  const totalMenus = getFirst(data, ['toplam'], state.adminReports.length);
  const totalBookings = state.adminReports.reduce((sum, item) => sum + Number(getFirst(item, ['rezerve'], 0)), 0);
  const ratings = state.adminReports.map(item => Number(getFirst(item, ['ortalama_puan', 'ortalamaPuan'], NaN))).filter(Number.isFinite);
  const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  $('#admin-stats').innerHTML = `<div class="stat-card"><span>Toplam menü</span><strong>${Number(totalMenus).toLocaleString('tr-TR')}</strong></div><div class="stat-card"><span>Toplam rezervasyon</span><strong>${totalBookings.toLocaleString('tr-TR')}</strong></div><div class="stat-card"><span>Ortalama puan</span><strong>${ratings.length ? average.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' / 5' : '—'}</strong></div>`;
  renderAdminReports();
}

function renderAdminReports() {
  const container = $('#admin-reports');
  if (!state.adminReports.length) { container.innerHTML = '<div class="empty-state">Henüz raporlanacak menü yok.</div>'; return; }
  const rows = state.adminReports.map(item => {
    const menuId = getFirst(item, ['menu_id', 'id']);
    return `<tr><td><strong>${escapeHtml(formatDate(getFirst(item, ['tarih'])))}</strong><br>${escapeHtml(getFirst(item, ['ogun'], ''))}</td><td>${escapeHtml(getFirst(item, ['yemekhane'], ''))}</td><td>${escapeHtml(getFirst(item, ['rezerve'], 0))} / ${escapeHtml(getFirst(item, ['kapasite'], 0))}<br><span class="muted">%${escapeHtml(getFirst(item, ['doluluk_yuzde'], 0))}</span></td><td>${getFirst(item, ['ortalama_puan']) === null || getFirst(item, ['ortalama_puan']) === '' ? '—' : `${Number(item.ortalama_puan).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} / 5`}</td><td><button class="edit-button" type="button" data-edit-menu="${escapeHtml(menuId)}">Düzenle</button></td></tr>`;
  }).join('');
  container.innerHTML = `<table><thead><tr><th>TARİH / ÖĞÜN</th><th>YEMEKHANE</th><th>DOLULUK</th><th>PUAN</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function loadAdmin() {
  $('#admin-reports').innerHTML = '<div class="loading-state">Yönetici verileri yükleniyor…</div>';
  await loadAdminOptions();
  await loadAdminReports();
  if (!$('#admin-date').value) $('#admin-date').value = todayISO();
}

function resetAdminForm() {
  $('#admin-menu-form').reset();
  $('#admin-menu-id').value = '';
  $('#admin-date').value = todayISO();
  $('#admin-form-title').textContent = 'Yeni menü oluştur';
  $('#admin-cancel-edit').hidden = true;
  $('#admin-form-error').textContent = '';
  renderFoodOptions();
}

async function editMenu(menuId) {
  const report = state.adminReports.find(item => String(getFirst(item, ['menu_id', 'id'])) === String(menuId));
  if (!report) return;
  const start = dateKey(report.tarih);
  const query = new URLSearchParams({ baslangic: start, bitis: start, yemekhaneId: String(report.yemekhane_id), ogunId: String(report.ogun_id) });
  try {
    const data = await apiFetch(`/menuler?${query.toString()}`);
    const rows = unwrapArray(data, ['menuler', 'sonuclar', 'veriler', 'data']);
    const foodIds = rows.filter(row => String(getFirst(row, ['menu_id', 'menuId'])) === String(menuId)).map(row => getFirst(row, ['yemek_id', 'yemekId'])).filter(value => value !== '');
    $('#admin-menu-id').value = menuId;
    $('#admin-date').value = start;
    $('#admin-canteen').value = report.yemekhane_id;
    $('#admin-meal').value = report.ogun_id;
    $('#admin-student-price').value = report.ogrenci_fiyati;
    $('#admin-staff-price').value = report.personel_fiyati;
    $('#admin-form-title').textContent = `Menü #${menuId} düzenleniyor`;
    $('#admin-cancel-edit').hidden = false;
    $('#admin-form-error').textContent = '';
    renderFoodOptions(foodIds);
    $('#admin-menu-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { toast(`Menü bilgileri alınamadı: ${error.message}`, 'error'); }
}

async function saveAdminMenu(event) {
  event.preventDefault();
  const form = $('#admin-menu-form');
  const button = $('button[type="submit"]', form);
  const selectedFoods = $$('input[name="yemekIds"]:checked', form).map(input => Number(input.value));
  if (!selectedFoods.length) { $('#admin-form-error').textContent = 'Menüye en az bir yemek eklemelisin.'; return; }
  const body = {
    tarih: $('#admin-date').value,
    yemekhaneId: Number($('#admin-canteen').value),
    ogunId: Number($('#admin-meal').value),
    ogrenciFiyati: Number($('#admin-student-price').value),
    personelFiyati: Number($('#admin-staff-price').value),
    yemekIds: selectedFoods
  };
  const menuId = $('#admin-menu-id').value;
  button.disabled = true;
  $('#admin-form-error').textContent = '';
  try {
    if (menuId) await apiFetch(`/yonetici/menuler/${encodeURIComponent(menuId)}`, { method: 'PUT', body });
    else await apiFetch('/yonetici/menuler', { method: 'POST', body });
    toast(menuId ? 'Menü güncellendi.' : 'Yeni menü oluşturuldu.', 'success');
    resetAdminForm();
    await loadAdminReports();
  } catch (error) { $('#admin-form-error').textContent = error.message; }
  finally { button.disabled = false; }
}

function openMobileMenu() {
  $('#sidebar').classList.add('open');
  $('#sidebar-scrim').hidden = false;
}
function closeMobileMenu() {
  $('#sidebar').classList.remove('open');
  $('#sidebar-scrim').hidden = true;
}

// Olay bağlantıları
$('#login-form').addEventListener('submit', handleLogin);
$('#logout-button').addEventListener('click', logout);
$$('[data-view]').forEach(button => button.addEventListener('click', () => changeView(button.dataset.view)));
$('#daily-refresh').addEventListener('click', () => loadDailyMenus().catch(error => toast(error.message, 'error')));
$('#weekly-refresh').addEventListener('click', () => loadWeeklyMenus().catch(error => toast(error.message, 'error')));
$('#daily-canteen').addEventListener('change', () => loadDailyMenus().catch(error => toast(error.message, 'error')));
$('#daily-meal').addEventListener('change', () => loadDailyMenus().catch(error => toast(error.message, 'error')));
$('#weekly-canteen').addEventListener('change', () => loadWeeklyMenus().catch(error => toast(error.message, 'error')));
$('#reservations-refresh').addEventListener('click', () => loadReservations().catch(error => toast(error.message, 'error')));
$('#balance-refresh').addEventListener('click', () => loadBalance().catch(error => toast(error.message, 'error')));
$('#topup-form').addEventListener('submit', topUp);
$('#reviews-refresh').addEventListener('click', () => loadReviews().catch(error => toast(error.message, 'error')));
$('#admin-refresh').addEventListener('click', () => loadAdmin().catch(error => toast(error.message, 'error')));
$('#admin-menu-form').addEventListener('submit', saveAdminMenu);
$('#admin-cancel-edit').addEventListener('click', resetAdminForm);
$('#mobile-menu-button').addEventListener('click', openMobileMenu);
$('#sidebar-scrim').addEventListener('click', closeMobileMenu);
$('#reservation-list').addEventListener('click', event => {
  const filter = event.target.closest('[data-res-filter]');
  if (filter) {
    state.reservationFilter = filter.dataset.resFilter;
    $$('.status-tab').forEach(tab => tab.classList.toggle('active', tab === filter));
    renderReservations();
    return;
  }
  const cancel = event.target.closest('[data-cancel-reservation]');
  if (cancel) cancelReservation(cancel.dataset.cancelReservation, cancel);
});
$('#daily-menu-list').addEventListener('click', event => {
  const button = event.target.closest('[data-reserve-menu]');
  if (button) bookMenu(button.dataset.reserveMenu, button);
});
$('#weekly-menu-list').addEventListener('click', event => {
  const button = event.target.closest('[data-reserve-menu]');
  if (button) bookMenu(button.dataset.reserveMenu, button);
});
$('#review-list').addEventListener('submit', submitReview);
$('#admin-reports').addEventListener('click', event => {
  const button = event.target.closest('[data-edit-menu]');
  if (button) editMenu(button.dataset.editMenu);
});

restoreSession();
