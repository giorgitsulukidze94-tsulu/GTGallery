/* ============================================================
   GT GALLERY — Admin panel logic
   ============================================================ */

var API_URL = window.GT_CONFIG.API_URL;
var root = document.getElementById('root');
var AUTH = JSON.parse(localStorage.getItem('gt_admin_auth') || 'null');
var listingsCache = [];
var currentView = 'list'; // list | form | settings
var editingListing = null;

var COLORS = ['თეთრი','შავი','ვერცხლისფერი','რუხი','წითელი','ლურჯი','ყვითელი','მწვანე','ნარინჯისფერი','ოქროსფერი','იასამნისფერი','ვარდისფერი','ჩალისფერი','შინდისფერი','ცისფერი','ყავისფერი'];
var FEATURES_LIST = ['ბორტკომპიუტერი','კონდიციონერი','პარკინგკონტროლი','უკანა ხედვის კამერა','ელექტრო შუშები','კლიმატკონტროლი','კრუიზ-კონტროლი','Start/Stop სისტემა','ლუქი','საჭის გათბობა','საჭის მექანიკური რეგულირება','ABS','სავარძლის გათბობა','სავარძლის მეხსიერება','ცენტრალური საკეტი','სიგნალიზაცია','სანისლე ფარები','მონიტორი (ნავიგაცია)','AUX','Bluetooth','მულტი საჭე','დისკები','სათადარიგო საბურავი','ssmb ადაპტირებული'];

var FORM_SCHEMA = [
  { title: '🚘 ძირითადი მონაცემები', fields: [
    { key: 'make', label: 'მწარმოებელი', type: 'text', required: true },
    { key: 'model', label: 'მოდელი', type: 'text', required: true },
    { key: 'year', label: 'წელი', type: 'number', required: true },
    { key: 'month', label: 'თვე', type: 'select', options: range(1, 12) },
    { key: 'trim', label: 'კომპლექტაცია', type: 'text' },
    { key: 'fuelType', label: 'საწვავის ტიპი', type: 'choice', options: ['ბენზინი', 'დიზელი', 'ჰიბრიდი', 'ელექტრო', 'გაზი'], required: true },
    { key: 'category', label: 'კატეგორია', type: 'choice', options: ['სედანი', 'ჯიპი', 'ჰეტჩბექი', 'კუპე', 'უნივერსალი', 'პიკაპი', 'მინივენი', 'სხვა'], required: true },
    { key: 'cylinders', label: 'ცილინდრების რაოდენობა', type: 'select', options: [2, 3, 4, 5, 6, 8, 10, 12] },
    { key: 'engineVolume', label: 'ძრავის მოცულობა (ლ)', type: 'text', placeholder: 'მაგ. 2.0' },
    { key: 'turbo', label: 'ტურბო', type: 'toggle' }
  ]},
  { title: '🛣️ გარბენი და ტექნიკური მონაცემები', fields: [
    { key: 'mileage', label: 'გარბენი', type: 'number', required: true },
    { key: 'mileageUnit', label: 'ერთეული', type: 'choice', options: ['კმ', 'მილი'] },
    { key: 'seats', label: 'საჯდომების რაოდენობა', type: 'number' },
    { key: 'transmission', label: 'ტრანსმისია', type: 'choice', options: ['მექანიკა', 'ავტომატიკა', 'ტიპტრონიკი', 'ვარიატორი'], required: true },
    { key: 'driveType', label: 'წამყვანი თვლები', type: 'choice', options: ['წინა', 'უკანა', '4x4'], required: true },
    { key: 'doors', label: 'კარის რაოდენობა', type: 'choice', options: ['2/3', '4/5', '>5'] },
    { key: 'catalyst', label: 'კატალიზატორი', type: 'toggle' },
    { key: 'airbags', label: 'აირბეგების რაოდენობა', type: 'select', options: range(0, 12) }
  ]},
  { title: '🎨 ფერი და სალონი', fields: [
    { key: 'color', label: 'ავტომობილის ფერი', type: 'select', options: COLORS },
    { key: 'interiorMaterial', label: 'სალონის მასალა', type: 'choice', options: ['ნაჭერი', 'ტყავი', 'ხელოვნური ტყავი', 'კომბინირებული', 'ალკანტარა'] },
    { key: 'interiorColor', label: 'სალონის ფერი', type: 'select', options: COLORS }
  ]},
  { title: '✨ დამატებითი აღჭურვილობა', fields: [
    { key: 'features', label: '', type: 'multi-choice', options: FEATURES_LIST }
  ]},
  { title: '📝 აღწერა', fields: [
    { key: 'descriptionGe', label: 'აღწერა (ქართულად)', type: 'textarea' },
    { key: 'descriptionEn', label: 'Description (English)', type: 'textarea' },
    { key: 'descriptionRu', label: 'Описание (Русский)', type: 'textarea' }
  ]},
  { title: '📍 მდებარეობა და განბაჟება', fields: [
    { key: 'location', label: 'მდებარეობა', type: 'text', required: true },
    { key: 'customsCleared', label: 'განბაჟებული', type: 'toggle' },
    { key: 'techInspection', label: 'ტექ. დათვალიერება გავლილია', type: 'toggle' },
    { key: 'techInspectionDate', label: 'ტექდათვალიერების ვადა', type: 'text', placeholder: 'მაგ. 2026-12-01' }
  ]},
  { title: '🎥 ვიდეო', fields: [
    { key: 'video', label: 'ვიდეოს ლინკი (YouTube)', type: 'text', placeholder: 'https://www.youtube.com/watch?v=...' }
  ]},
  { title: '💰 ფასი', fields: [
    { key: 'price', label: 'ფასი', type: 'number', required: true },
    { key: 'currency', label: 'ვალუტა', type: 'choice', options: [{ v: 'USD', l: '$ (USD)' }, { v: 'GEL', l: '₾ (GEL)' }] },
    { key: 'priceNegotiable', label: 'ფასი შეთანხმებით', type: 'toggle' },
    { key: 'tradeIn', label: 'სხვა ავტომობილში გაცვლა', type: 'toggle' }
  ]},
  { title: '🌍 შესაძენი წყარო (არასავალდებულო)', fields: [
    { key: 'sourceSite', label: 'საიტი', type: 'choice', options: ['Copart', 'IAAI', 'სხვა'] },
    { key: 'sourceLink', label: 'ლინკი', type: 'text', placeholder: 'https://www.copart.com/lot/...' }
  ]},
  { title: '☎️ საკონტაქტო ინფორმაცია ამ განცხადებისთვის', fields: [
    { key: 'contactName', label: 'სახელი', type: 'text' },
    { key: 'contactPhone', label: 'ტელეფონის ნომერი', type: 'text', placeholder: '+995 5XX XX XX XX' },
    { key: 'contactWhatsapp', label: 'WhatsApp ნომერი', type: 'text', placeholder: '995555123456' }
  ]},
  { title: '👁️ ხილვადობა', fields: [
    { key: 'visible', label: 'საიტზე გამოჩენა', type: 'toggle' },
    { key: 'sold', label: 'გაყიდულია', type: 'toggle' }
  ]}
];

function range(a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; }
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------- API ---------- */
function apiGet(action, params) {
  var url = API_URL + '?action=' + action;
  for (var k in (params || {})) url += '&' + k + '=' + encodeURIComponent(params[k]);
  return fetch(url).then(function (r) { return r.json(); });
}
function apiPost(action, data) {
  var body = Object.assign({ action: action, username: AUTH && AUTH.username, password: AUTH && AUTH.password }, data || {});
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  }).then(function (r) { return r.json(); });
}

function showToast(msg) {
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 2200);
}

/* ---------- Boot ---------- */
function boot() {
  if (!AUTH) { renderLogin(); }
  else { renderShell(); }
}

/* ---------- Login ---------- */
function renderLogin() {
  root.innerHTML =
    '<div class="login-screen"><div class="login-card">' +
      '<h1 style="display:flex;align-items:center;justify-content:center;gap:10px;"><img src="https://i.ibb.co/1JsKZnrH/Gemini-Generated-Image-jrilsljrilsljril.png" alt="GT GALLERY" class="logo-img">GT <span style="color:#ff7a59;">GALLERY</span></h1>' +
      '<div class="field"><label>მომხმარებელი</label><input id="loginUser" type="text" autocomplete="username"></div>' +
      '<div class="field"><label>პაროლი</label><input id="loginPass" type="password" autocomplete="current-password"></div>' +
      '<button class="btn btn-primary" style="width:100%;" onclick="doLogin()">შესვლა</button>' +
      '<div class="login-error" id="loginError"></div>' +
    '</div></div>';

  document.getElementById('loginPass').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doLogin();
  });
}

function doLogin() {
  var username = document.getElementById('loginUser').value.trim();
  var password = document.getElementById('loginPass').value;
  apiPost('login', { username: username, password: password }).then(function (res) {
    if (res.ok) {
      AUTH = { username: username, password: password };
      localStorage.setItem('gt_admin_auth', JSON.stringify(AUTH));
      renderShell();
    } else {
      document.getElementById('loginError').textContent = 'მომხმარებელი ან პაროლი არასწორია';
    }
  });
}

function logout() {
  localStorage.removeItem('gt_admin_auth');
  AUTH = null;
  renderLogin();
}

/* ---------- Shell ---------- */
function renderShell() {
  root.innerHTML =
    '<div class="admin-shell">' +
      '<div class="admin-sidebar">' +
        '<div class="logo" style="margin-bottom:24px;"><img src="https://i.ibb.co/1JsKZnrH/Gemini-Generated-Image-jrilsljrilsljril.png" alt="GT GALLERY" class="logo-img">GT <span style="color:#ff7a59;">GALLERY</span></div>' +
        '<div class="nav-item" data-view="list">📋 განცხადებები</div>' +
        '<div class="nav-item" data-view="form">➕ ახალი დამატება</div>' +
        '<div class="nav-item" data-view="settings">⚙️ პარამეტრები</div>' +
        '<div class="nav-item" onclick="logout()">🚪 გასვლა</div>' +
      '</div>' +
      '<div class="admin-main" id="mainContent"></div>' +
    '</div>';

  document.querySelectorAll('.nav-item[data-view]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (el.dataset.view === 'form') {
        editingListing = null;
        initFormState();
      }
      navigate(el.dataset.view);
    });
  });

  navigate('list');
}

function navigate(view) {
  currentView = view;
  document.querySelectorAll('.nav-item[data-view]').forEach(function (el) {
    el.classList.toggle('active', el.dataset.view === view);
  });
  if (view === 'list') renderListView();
  else if (view === 'form') renderFormView();
  else if (view === 'settings') renderSettingsView();
}

/* ---------- Listings list (drag reorder) ---------- */
function renderListView() {
  var main = document.getElementById('mainContent');
  main.innerHTML = '<h2>განცხადებები</h2><div class="empty-state">🔄 იტვირთება...</div>';

  apiPost('adminListings', {}).then(function (res) {
    if (!res.ok) { main.innerHTML = '<div class="empty-state">❌ შეცდომა: ' + escapeHtml(res.error) + '</div>'; return; }
    listingsCache = res.data;
    drawListRows();
  });
}

function drawListRows() {
  var main = document.getElementById('mainContent');
  if (!listingsCache.length) {
    main.innerHTML = '<h2>განცხადებები</h2><div class="empty-state">ჯერ არცერთი განცხადება არ დაგიმატებია</div>';
    return;
  }
  main.innerHTML =
    '<h2>განცხადებები <span style="font-size:13px;color:var(--text-secondary);">(გადათრიე 🟰 თანმიმდევრობის შესაცვლელად)</span></h2>' +
    '<div id="rowsWrap">' + listingsCache.map(rowHtml).join('') + '</div>';

  var rows = main.querySelectorAll('.admin-row');
  var dragSrcIndex = null;
  rows.forEach(function (row, idx) {
    row.addEventListener('dragstart', function () { dragSrcIndex = idx; row.classList.add('dragging'); });
    row.addEventListener('dragend', function () { row.classList.remove('dragging'); });
    row.addEventListener('dragover', function (e) { e.preventDefault(); });
    row.addEventListener('drop', function (e) {
      e.preventDefault();
      var targetIdx = idx;
      if (dragSrcIndex === null || dragSrcIndex === targetIdx) return;
      var moved = listingsCache.splice(dragSrcIndex, 1)[0];
      listingsCache.splice(targetIdx, 0, moved);
      drawListRows();
      apiPost('reorder', { orderedIds: listingsCache.map(function (l) { return l.id; }) });
    });
  });
}

function rowHtml(l, idx) {
  var photo = (l.photos && l.photos[Number(l.mainPhotoIndex) || 0]) || (l.photos && l.photos[0]) || 'https://via.placeholder.com/100x75?text=No+Photo';
  return (
    '<div class="admin-row" draggable="true">' +
      '<span class="drag-handle">☰</span>' +
      '<img src="' + escapeHtml(photo) + '">' +
      '<div>' +
        '<div class="row-title">' + escapeHtml(l.make) + ' ' + escapeHtml(l.model) + (l.year ? ', ' + escapeHtml(l.year) : '') + '</div>' +
        '<div class="row-sub">' + (l.price ? Number(l.price).toLocaleString('en-US') + ' ' + (l.currency === 'GEL' ? '₾' : '$') : 'ფასი არ მითითებულია') + (l.sold ? ' · 🔴 გაყიდულია' : '') + '</div>' +
      '</div>' +
      '<div class="row-actions">' +
        toggleBtn(l.id, 'visible', l.visible, '👁️ საიტზე') +
        toggleBtn(l.id, 'sold', l.sold, '🏷️ გაყიდულია') +
        '<button class="btn btn-sm btn-ghost" onclick="editListing(\'' + l.id + '\')">✏️ რედაქტირება</button>' +
        '<button class="btn btn-sm btn-danger" onclick="removeListing(\'' + l.id + '\')">🗑️ წაშლა</button>' +
      '</div>' +
    '</div>'
  );
}

function toggleBtn(id, field, value, label) {
  return '<span style="display:flex;align-items:center;gap:6px;font-size:13px;">' + label +
    '<span class="toggle ' + (value ? 'on' : '') + '" onclick="toggleListingField(\'' + id + '\',\'' + field + '\')"></span></span>';
}

function toggleListingField(id, field) {
  var action = field === 'visible' ? 'toggleVisible' : 'toggleSold';
  apiPost(action, { id: id }).then(function (res) {
    if (res.ok) {
      var l = listingsCache.find(function (x) { return x.id === id; });
      if (l) l[field] = !l[field];
      drawListRows();
      showToast('განახლდა ✅');
    } else {
      showToast('შეცდომა ❌');
    }
  });
}

function removeListing(id) {
  if (!confirm('ნამდვილად წაშალო ეს განცხადება?')) return;
  apiPost('deleteListing', { id: id }).then(function (res) {
    if (res.ok) {
      listingsCache = listingsCache.filter(function (l) { return l.id !== id; });
      drawListRows();
      showToast('წაშლილია ✅');
    }
  });
}

function editListing(id) {
  editingListing = listingsCache.find(function (l) { return l.id === id; });
  initFormState();
  navigate('form');
}

/* ---------- Add / Edit form ---------- */
var formState = {};

function defaultFormState() {
  return { features: [], photos: [], mainPhotoIndex: 0, visible: true, sold: false, currency: 'USD', mileageUnit: 'კმ' };
}

// მხოლოდ ფორმაში პირველად შესვლისას (ან რედაქტირების დაწყებისას) გამოიძახება —
// renderFormView-ის ხელახალი გამოძახება (chip-ების დაჭერისას) ამას არ უნდა აღრესტარტავდეს,
// თორემ უკვე შეყვანილი მონაცემები წაიშლება.
function initFormState() {
  formState = editingListing ? JSON.parse(JSON.stringify(editingListing)) : defaultFormState();
  if (!formState.features) formState.features = [];
  if (!formState.photos) formState.photos = [];
}

function renderFormView() {
  var main = document.getElementById('mainContent');

  var html = '<h2>' + (editingListing ? '✏️ განცხადების რედაქტირება' : '➕ ახალი განცხადება') + '</h2>';

  FORM_SCHEMA.forEach(function (section) {
    html += '<div class="card" style="padding:20px;margin-bottom:18px;">';
    html += '<h3 style="margin-top:0;">' + section.title + '</h3>';
    section.fields.forEach(function (f) { html += renderField(f); });
    html += '</div>';
  });

  // Photos section
  html += '<div class="card" style="padding:20px;margin-bottom:18px;">' +
    '<h3 style="margin-top:0;">📷 ფოტოები</h3>' +
    '<p style="color:var(--text-secondary);font-size:13px;margin-top:-8px;">ჩასვი ფოტოს ლინკი ' +
    '<a href="https://giorgi-tulukide.imgbb.com/" target="_blank">imgbb გალერეიდან</a> და მონიშნე, რომელი იქნება მთავარი ფოტო.</p>' +
    '<div id="photosWrap">' + (formState.photos.length ? formState.photos.map(photoRowHtml).join('') : '') + '</div>' +
    '<button class="btn btn-sm btn-ghost" onclick="addPhotoRow()">+ ფოტოს ლინკის დამატება</button>' +
    '</div>';

  html += '<div style="display:flex;gap:12px;margin-bottom:60px;">' +
    '<button class="btn btn-primary" onclick="submitForm()">💾 შენახვა</button>' +
    '<button class="btn btn-ghost" onclick="navigate(\'list\')">გაუქმება</button>' +
    '</div>';

  main.innerHTML = html;
  if (!formState.photos.length) addPhotoRow();
}

function renderField(f) {
  var val = formState[f.key];
  var req = f.required ? ' *' : '';
  if (f.type === 'text' || f.type === 'number') {
    return '<div class="field"><label>' + f.label + req + '</label>' +
      '<input type="' + f.type + '" data-key="' + f.key + '" value="' + escapeHtml(val || '') + '" placeholder="' + (f.placeholder || '') + '" oninput="setFormValue(\'' + f.key + '\', this.value)"></div>';
  }
  if (f.type === 'textarea') {
    return '<div class="field"><label>' + f.label + req + '</label>' +
      '<textarea rows="4" data-key="' + f.key + '" oninput="setFormValue(\'' + f.key + '\', this.value)">' + escapeHtml(val || '') + '</textarea></div>';
  }
  if (f.type === 'select') {
    var opts = f.options.map(function (o) {
      var v = (typeof o === 'object') ? o.v : o;
      var l = (typeof o === 'object') ? o.l : o;
      return '<option value="' + escapeHtml(v) + '" ' + (String(val) === String(v) ? 'selected' : '') + '>' + escapeHtml(l) + '</option>';
    }).join('');
    return '<div class="field"><label>' + f.label + req + '</label>' +
      '<select data-key="' + f.key + '" onchange="setFormValue(\'' + f.key + '\', this.value)"><option value="">—</option>' + opts + '</select></div>';
  }
  if (f.type === 'choice') {
    var chips = f.options.map(function (o) {
      var v = (typeof o === 'object') ? o.v : o;
      var l = (typeof o === 'object') ? o.l : o;
      return '<div class="choice ' + (String(val) === String(v) ? 'active' : '') + '" data-value="' + escapeHtml(v) + '" onclick="setChoice(\'' + f.key + '\', \'' + escapeHtml(v) + '\')">' + escapeHtml(l) + '</div>';
    }).join('');
    return '<div class="field"><label>' + f.label + req + '</label><div class="choice-group" id="choice-' + f.key + '">' + chips + '</div></div>';
  }
  if (f.type === 'multi-choice') {
    return '<div class="field"><div class="choice-group" id="choice-' + f.key + '">' + multiChoiceChips(f.key, f.options) + '</div></div>';
  }
  if (f.type === 'toggle') {
    return '<div class="field" style="display:flex;align-items:center;gap:12px;">' +
      '<span class="toggle ' + (val ? 'on' : '') + '" id="toggle-' + f.key + '" onclick="setToggle(\'' + f.key + '\')"></span>' +
      '<label style="margin:0;">' + f.label + '</label></div>';
  }
  return '';
}

function setFormValue(key, value) { formState[key] = value; }

function setChoice(key, value) {
  formState[key] = value;
  var group = document.getElementById('choice-' + key);
  Array.from(group.children).forEach(function (chip) {
    chip.classList.toggle('active', chip.dataset.value === value);
  });
}

function multiChoiceChips(key, options) {
  var current = formState[key] || [];
  return options.map(function (o) {
    var active = current.indexOf(o) !== -1;
    return '<div class="choice ' + (active ? 'active' : '') + '" data-value="' + escapeHtml(o) + '" onclick="toggleMultiChoice(\'' + key + '\', \'' + o + '\')">' + (active ? '✓ ' : '') + escapeHtml(o) + '</div>';
  }).join('');
}

function toggleMultiChoice(key, value) {
  formState[key] = formState[key] || [];
  var idx = formState[key].indexOf(value);
  if (idx === -1) formState[key].push(value); else formState[key].splice(idx, 1);
  // მხოლოდ ამ ჯგუფის chip-ებს ვანახლებთ — მთელი ფორმის თავიდან არ ვხატავთ,
  // რომ უკვე შეყვანილი მონაცემები არ წაშლილიყო.
  var fieldDef = null;
  FORM_SCHEMA.forEach(function (section) {
    section.fields.forEach(function (f) { if (f.key === key) fieldDef = f; });
  });
  if (fieldDef) document.getElementById('choice-' + key).innerHTML = multiChoiceChips(key, fieldDef.options);
}

function setToggle(key) {
  formState[key] = !formState[key];
  document.getElementById('toggle-' + key).classList.toggle('on', formState[key]);
}

function photoRowHtml(url, idx) {
  return '<div class="field" style="display:flex;gap:10px;align-items:center;width:100%;" data-photo-idx="' + idx + '">' +
    '<input type="radio" name="mainPhoto" style="flex:0 0 auto;width:auto;" ' + (Number(formState.mainPhotoIndex) === idx ? 'checked' : '') + ' onchange="formState.mainPhotoIndex=' + idx + '" title="მთავარი ფოტო">' +
    '<input type="text" style="flex:1 1 auto;width:100%;min-width:0;" value="' + escapeHtml(url || '') + '" placeholder="https://i.ibb.co/..." oninput="formState.photos[' + idx + ']=this.value">' +
    '<button class="btn btn-icon btn-ghost" style="flex:0 0 auto;" onclick="removePhotoRow(' + idx + ')">✕</button>' +
    '</div>';
}

function addPhotoRow() {
  formState.photos.push('');
  document.getElementById('photosWrap').insertAdjacentHTML('beforeend', photoRowHtml('', formState.photos.length - 1));
}

function removePhotoRow(idx) {
  formState.photos.splice(idx, 1);
  if (formState.mainPhotoIndex >= formState.photos.length) formState.mainPhotoIndex = 0;
  document.getElementById('photosWrap').innerHTML = formState.photos.map(photoRowHtml).join('');
}

function submitForm() {
  formState.photos = (formState.photos || []).filter(function (p) { return p && p.trim(); });
  if (!formState.make || !formState.model || !formState.location) {
    showToast('⚠️ შეავსე სავალდებულო ველები (მწარმოებელი, მოდელი, მდებარეობა)');
    return;
  }
  var action = editingListing ? 'updateListing' : 'addListing';
  var payload = editingListing ? { id: editingListing.id, listing: formState } : { listing: formState };

  apiPost(action, payload).then(function (res) {
    if (res.ok) {
      showToast('შენახულია ✅');
      editingListing = null;
      navigate('list');
    } else {
      showToast('❌ შეცდომა: ' + res.error);
    }
  });
}

/* ---------- Settings ---------- */
function renderSettingsView() {
  var main = document.getElementById('mainContent');
  main.innerHTML = '<h2>პარამეტრები</h2><div class="empty-state">🔄 იტვირთება...</div>';

  apiGet('settings').then(function (res) {
    var s = res.data || {};
    main.innerHTML =
      '<div class="card" style="padding:20px;margin-bottom:18px;max-width:480px;">' +
        '<h3 style="margin-top:0;">საკონტაქტო ინფორმაცია (ზოგადი)</h3>' +
        '<div class="field"><label>ტელეფონი</label><input id="setPhone" value="' + escapeHtml(s.contactPhone || '') + '"></div>' +
        '<div class="field"><label>WhatsApp</label><input id="setWhatsapp" value="' + escapeHtml(s.contactWhatsapp || '') + '"></div>' +
        '<div class="field"><label>მისამართი</label><input id="setAddress" value="' + escapeHtml(s.contactAddress || '') + '"></div>' +
        '<button class="btn btn-primary" onclick="saveSettings()">შენახვა</button>' +
      '</div>' +
      '<div class="card" style="padding:20px;max-width:480px;">' +
        '<h3 style="margin-top:0;">ადმინ პაროლის შეცვლა</h3>' +
        '<div class="field"><label>ახალი მომხმარებელი</label><input id="newUser" value="' + escapeHtml(AUTH.username) + '"></div>' +
        '<div class="field"><label>ახალი პაროლი</label><input id="newPass" type="password"></div>' +
        '<button class="btn btn-blue" onclick="changePassword()">პაროლის შეცვლა</button>' +
      '</div>';
  });
}

function saveSettings() {
  apiPost('updateSettings', {
    contactPhone: document.getElementById('setPhone').value,
    contactWhatsapp: document.getElementById('setWhatsapp').value,
    contactAddress: document.getElementById('setAddress').value
  }).then(function (res) {
    showToast(res.ok ? 'შენახულია ✅' : '❌ შეცდომა');
  });
}

function changePassword() {
  var newUsername = document.getElementById('newUser').value.trim();
  var newPassword = document.getElementById('newPass').value;
  if (!newPassword) { showToast('⚠️ ჩაწერე ახალი პაროლი'); return; }
  apiPost('changePassword', { newUsername: newUsername, newPassword: newPassword }).then(function (res) {
    if (res.ok) {
      AUTH = { username: newUsername, password: newPassword };
      localStorage.setItem('gt_admin_auth', JSON.stringify(AUTH));
      showToast('პაროლი შეცვლილია ✅');
    } else {
      showToast('❌ შეცდომა');
    }
  });
}

boot();
