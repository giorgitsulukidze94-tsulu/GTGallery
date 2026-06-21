/* ============================================================
   GT GALLERY — Public site logic
   ============================================================ */

var API_URL = window.GT_CONFIG.API_URL;
var app = document.getElementById('app');
var topbarActions = document.getElementById('topbarActions');
document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());

var cache = { listings: null, settings: null };
var NO_PHOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><rect width="100%" height="100%" fill="%230d1322"/><text x="50%" y="50%" font-size="28" fill="%2393a0bd" text-anchor="middle" dy=".3em">🚗 ფოტო არ არის</text></svg>'
);

function apiGet(action, params, timeoutMs) {
  var url = API_URL + '?action=' + action;
  for (var k in (params || {})) url += '&' + k + '=' + encodeURIComponent(params[k]);

  var controller = ('AbortController' in window) ? new AbortController() : null;
  var timer = setTimeout(function () { if (controller) controller.abort(); }, timeoutMs || 15000);

  return fetch(url, controller ? { signal: controller.signal } : {})
    .then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .catch(function (err) {
      clearTimeout(timer);
      return { ok: false, error: (err && err.name === 'AbortError') ? 'TIMEOUT' : String(err) };
    });
}

function fmtPrice(listing) {
  if (!listing.price) return listing.priceNegotiable ? 'ფასი შეთანხმებით' : '';
  var cur = listing.currency === 'GEL' ? '₾' : '$';
  var txt = Number(listing.price).toLocaleString('en-US') + ' ' + cur;
  if (listing.priceNegotiable) txt += ' (შეთანხმებით)';
  return txt;
}

function mainPhoto(listing) {
  var photos = listing.photos || [];
  var idx = Number(listing.mainPhotoIndex) || 0;
  return photos[idx] || photos[0] || NO_PHOTO;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------- Contact strip (above header) ---------- */
function loadContactBar() {
  var bar = document.getElementById('contactBar');
  if (!bar) return;
  apiGet('settings').then(function (res) {
    if (!res.ok || !res.data) return;
    var s = res.data;
    var parts = [];
    if (s.contactPhone) parts.push('<a href="tel:' + escapeHtml(s.contactPhone) + '">📞 ' + escapeHtml(s.contactPhone) + '</a>');
    if (s.contactWhatsapp) parts.push('<a href="https://wa.me/' + escapeHtml(String(s.contactWhatsapp).replace(/[^0-9]/g, '')) + '" target="_blank">💬 WhatsApp</a>');
    if (s.contactAddress) parts.push('<span class="contact-address">📍 ' + escapeHtml(s.contactAddress) + '</span>');
    if (!parts.length) return;
    bar.innerHTML = '<div class="container contact-bar-inner">' + parts.join('') + '</div>';
    bar.style.display = 'block';
  });
}
loadContactBar();

/* ---------- Router ---------- */
function router() {
  var hash = location.hash || '#/';
  var match = hash.match(/^#\/car\/(.+)$/);
  if (match) {
    renderDetail(match[1]);
  } else {
    renderGrid();
  }
}
window.addEventListener('hashchange', router);

/* ---------- Grid view ---------- */
function renderGrid() {
  topbarActions.innerHTML = '';
  app.innerHTML = '<div class="empty-state">🔄 იტვირთება...</div>';

  var load = cache.listings
    ? Promise.resolve({ ok: true, data: cache.listings })
    : apiGet('listings');

  load.then(function (res) {
    if (!res.ok) {
      app.innerHTML = '<div class="empty-state">❌ მონაცემების ჩატვირთვა ვერ მოხერხდა (' + escapeHtml(res.error || '') + ')<br><br><button class="btn btn-primary" onclick="renderGrid()">🔄 თავიდან სცადე</button></div>';
      return;
    }
    cache.listings = res.data;
    if (!res.data.length) {
      app.innerHTML = '<div class="empty-state">🚗 ჯერ არცერთი განცხადება არ არის დამატებული</div>';
      return;
    }
    app.innerHTML = '<div class="grid">' + res.data.map(cardHtml).join('') + '</div>';
  });
}

function cardHtml(l) {
  return (
    '<div class="card listing-card" onclick="location.hash=\'#/car/' + l.id + '\'">' +
      '<div class="listing-photo-wrap">' +
        '<img src="' + escapeHtml(mainPhoto(l)) + '" loading="lazy" alt="' + escapeHtml(l.make) + ' ' + escapeHtml(l.model) + '" onerror="this.onerror=null;this.src=NO_PHOTO;">' +
        (l.sold ? '<div class="sold-badge">გაყიდულია</div>' : '') +
      '</div>' +
      '<div class="listing-info">' +
        '<p class="listing-title">' + escapeHtml(l.make) + ' ' + escapeHtml(l.model) + (l.year ? ', ' + escapeHtml(l.year) : '') + '</p>' +
        '<p class="listing-sub">' + escapeHtml(l.category || '') + (l.location ? ' · ' + escapeHtml(l.location) : '') + '</p>' +
        '<div class="listing-price">' + fmtPrice(l) + '</div>' +
        '<div class="listing-meta">' +
          (l.mileage ? '<span>🛣️ ' + escapeHtml(l.mileage) + ' ' + escapeHtml(l.mileageUnit || 'კმ') + '</span>' : '') +
          (l.fuelType ? '<span>⛽ ' + escapeHtml(l.fuelType) + '</span>' : '') +
          (l.transmission ? '<span>⚙️ ' + escapeHtml(l.transmission) + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

/* ---------- Detail view ---------- */
var SPEC_FIELDS = [
  ['მწარმოებელი', 'make'],
  ['მოდელი', 'model'],
  ['წელი', function (l) { return l.year ? (l.year + (l.month ? ' / ' + l.month : '')) : ''; }],
  ['კატეგორია', 'category'],
  ['საწვავის ტიპი', 'fuelType'],
  ['ცილინდრები', 'cylinders'],
  ['ძრავის მოცულობა', function (l) { return l.engineVolume ? (l.engineVolume + (l.turbo ? ' (ტურბო)' : '')) : ''; }],
  ['გარბენი', function (l) { return l.mileage ? (Number(l.mileage).toLocaleString('en-US') + ' ' + (l.mileageUnit || 'კმ')) : ''; }],
  ['ტრანსმისია', 'transmission'],
  ['წამყვანი თვლები', 'driveType'],
  ['კარის რაოდენობა', 'doors'],
  ['საჯდომები', 'seats'],
  ['აირბეგი', 'airbags'],
  ['კატალიზატორი', function (l) { return l.catalyst ? 'კი' : 'არა'; }],
  ['ფერი', 'color'],
  ['სალონი', function (l) { return [l.interiorMaterial, l.interiorColor].filter(Boolean).join(', '); }],
  ['მდებარეობა', 'location'],
  ['განბაჟება', function (l) { return l.customsCleared ? 'განბაჟებული' : 'არ არის განბაჟებული'; }],
  ['ტექ. დათვალიერება', function (l) { return l.techInspection ? ('კი' + (l.techInspectionDate ? ' (' + l.techInspectionDate + ')' : '')) : 'არა'; }]
];

function renderDetail(id) {
  topbarActions.innerHTML = '<a href="#/" class="btn btn-sm btn-ghost">← უკან</a>';
  app.innerHTML = '<div class="empty-state">🔄 იტვირთება...</div>';

  apiGet('listing', { id: id }).then(function (res) {
    if (!res.ok) {
      app.innerHTML = '<div class="empty-state">❌ განცხადება ვერ ჩაიტვირთა (' + escapeHtml(res.error || '') + ')<br><br>' +
        '<button class="btn btn-primary" onclick="renderDetail(\'' + escapeHtml(id) + '\')">🔄 თავიდან სცადე</button> ' +
        '<a href="#/" class="btn btn-ghost">← სიაში დაბრუნება</a></div>';
      return;
    }
    var l = res.data;
    var photos = l.photos && l.photos.length ? l.photos : [mainPhoto(l)];
    var mainIdx = Number(l.mainPhotoIndex) || 0;

    var specsHtml = SPEC_FIELDS.map(function (f) {
      var val = typeof f[1] === 'function' ? f[1](l) : l[f[1]];
      if (!val) return '';
      return '<div class="spec-item"><div class="spec-label">' + f[0] + '</div><div class="spec-value">' + escapeHtml(val) + '</div></div>';
    }).join('');

    var featuresHtml = (l.features || []).map(function (f) {
      return '<span class="feature-pill">✓ ' + escapeHtml(f) + '</span>';
    }).join('');

    var descLangs = [];
    if (l.descriptionGe) descLangs.push({ label: '🇬🇪 ქართული', text: l.descriptionGe });
    if (l.descriptionEn) descLangs.push({ label: '🇬🇧 English', text: l.descriptionEn });
    if (l.descriptionRu) descLangs.push({ label: '🇷🇺 Русский', text: l.descriptionRu });
    window.__descLangs = descLangs;

    var shareUrl = location.href;
    var actionsHtml =
      (l.contactPhone ? '<a class="btn btn-blue" href="tel:' + escapeHtml(l.contactPhone) + '">📞 დარეკვა</a>' : '') +
      (l.contactWhatsapp ? '<a class="btn btn-green" target="_blank" href="https://wa.me/' + escapeHtml(String(l.contactWhatsapp).replace(/[^0-9]/g, '')) + '">💬 WhatsApp</a>' : '') +
      (l.sourceLink ? '<a class="btn btn-ghost" target="_blank" href="' + escapeHtml(l.sourceLink) + '">🔗 ნახე ' + escapeHtml(l.sourceSite || 'საიტზე') + '</a>' : '') +
      '<button class="btn btn-ghost" onclick="shareListing()">📤 გაზიარება</button>' +
      '<button class="btn btn-ghost" onclick="copyLink()">🔗 ლინკის კოპირება</button>';

    app.innerHTML =
      '<div style="max-width:900px;margin:0 auto;padding-bottom:60px;">' +
        '<div class="detail-gallery" id="mainPhotoWrap">' +
          (l.sold ? '<div class="sold-badge" style="font-size:15px;">გაყიდულია</div>' : '') +
          '<img id="mainPhotoImg" src="' + escapeHtml(photos[mainIdx] || photos[0]) + '" onclick="openLightbox(' + mainIdx + ')" onerror="this.onerror=null;this.src=NO_PHOTO;">' +
        '</div>' +
        (photos.length > 1 ? '<div class="thumb-row" id="thumbRow">' + photos.map(function (p, i) {
          return '<img src="' + escapeHtml(p) + '" class="' + (i === mainIdx ? 'active' : '') + '" onclick="setMainPhoto(' + i + ')" onerror="this.onerror=null;this.src=NO_PHOTO;">';
        }).join('') + '</div>' : '') +

        '<h1 style="margin:18px 0 4px;font-size:26px;">' + escapeHtml(l.make) + ' ' + escapeHtml(l.model) + (l.year ? ', ' + escapeHtml(l.year) : '') + '</h1>' +
        '<div style="font-size:22px;font-weight:800;color:var(--accent);margin-bottom:6px;">' + fmtPrice(l) + (l.tradeIn ? ' · 🔁 გაცვლა შესაძლებელია' : '') + '</div>' +

        '<div class="action-bar">' + actionsHtml + '</div>' +

        '<div class="spec-grid">' + specsHtml + '</div>' +

        (featuresHtml ? '<h3>დამატებითი აღჭურვილობა</h3><div>' + featuresHtml + '</div>' : '') +

        (descLangs.length ?
          '<h3 style="margin-top:24px;">აღწერა</h3>' +
          (descLangs.length > 1 ? '<div class="desc-tabs" id="descTabs">' + descLangs.map(function (d, i) {
            return '<button class="desc-tab' + (i === 0 ? ' active' : '') + '" onclick="setDescLang(' + i + ')">' + d.label + '</button>';
          }).join('') + '</div>' : '') +
          '<p id="descText" style="line-height:1.6;color:var(--text);white-space:pre-wrap;">' + escapeHtml(descLangs[0].text) + '</p>'
        : '') +

        (l.video ? '<h3 style="margin-top:24px;">ვიდეო</h3><div style="aspect-ratio:16/9;border-radius:var(--radius-md);overflow:hidden;">' + videoEmbed(l.video) + '</div>' : '') +
      '</div>' +

      '<div class="lightbox" id="lightbox" style="display:none;" onclick="closeLightbox(event)">' +
        '<button class="lightbox-close" onclick="closeLightbox(event)">✕</button>' +
        (photos.length > 1 ? '<button class="lightbox-nav lightbox-prev" onclick="lightboxNav(-1, event)">‹</button>' : '') +
        '<img id="lightboxImg" src="">' +
        (photos.length > 1 ? '<button class="lightbox-nav lightbox-next" onclick="lightboxNav(1, event)">›</button>' : '') +
      '</div>';

    window.__photos = photos;
    window.__mainPhotoIndex = mainIdx;

    setupSwipe(document.getElementById('mainPhotoWrap'),
      function () { setMainPhoto((window.__mainPhotoIndex + 1) % photos.length); },
      function () { setMainPhoto((window.__mainPhotoIndex - 1 + photos.length) % photos.length); }
    );
    setupSwipe(document.getElementById('lightboxImg'),
      function () { lightboxNav(1); },
      function () { lightboxNav(-1); }
    );
  });
}

function videoEmbed(url) {
  var yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/' + yt[1] + '" frameborder="0" allowfullscreen></iframe>';
  return '<a class="btn btn-ghost" target="_blank" href="' + escapeHtml(url) + '">▶️ ვიდეოს ნახვა</a>';
}

function setMainPhoto(i) {
  window.__mainPhotoIndex = i;
  document.getElementById('mainPhotoImg').src = window.__photos[i];
  document.getElementById('mainPhotoImg').setAttribute('onclick', 'openLightbox(' + i + ')');
  document.querySelectorAll('#thumbRow img').forEach(function (img, idx) {
    img.classList.toggle('active', idx === i);
  });
}

function setDescLang(i) {
  var d = window.__descLangs[i];
  if (!d) return;
  document.getElementById('descText').textContent = d.text;
  document.querySelectorAll('#descTabs .desc-tab').forEach(function (btn, idx) {
    btn.classList.toggle('active', idx === i);
  });
}

function openLightbox(i) {
  window.__lightboxIndex = i;
  document.getElementById('lightboxImg').src = window.__photos[i];
  document.getElementById('lightbox').style.display = 'flex';
}

function setupSwipe(el, onLeft, onRight) {
  if (!el) return;
  var startX = null, startY = null;
  el.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onLeft(); else onRight();
    }
    startX = null; startY = null;
  }, { passive: true });
}
function closeLightbox(e) {
  document.getElementById('lightbox').style.display = 'none';
}
function lightboxNav(delta, e) {
  if (e) e.stopPropagation();
  var photos = window.__photos || [];
  if (!photos.length) return;
  window.__lightboxIndex = ((window.__lightboxIndex || 0) + delta + photos.length) % photos.length;
  document.getElementById('lightboxImg').src = photos[window.__lightboxIndex];
}
document.addEventListener('keydown', function (e) {
  var lb = document.getElementById('lightbox');
  if (!lb || lb.style.display !== 'flex') return;
  if (e.key === 'ArrowLeft') lightboxNav(-1);
  else if (e.key === 'ArrowRight') lightboxNav(1);
  else if (e.key === 'Escape') closeLightbox();
});

function shareListing() {
  var title = document.title;
  if (navigator.share) {
    navigator.share({ title: title, url: location.href }).catch(function () {});
  } else {
    var menu = '📤 გააზიარე:\n1. WhatsApp\n2. Facebook\n3. Telegram\n(ან გამოიყენე "ლინკის კოპირება")';
    var choice = window.confirm(menu + '\n\nOK = WhatsApp, Cancel = Facebook');
    var url = encodeURIComponent(location.href);
    if (choice) window.open('https://wa.me/?text=' + url, '_blank');
    else window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank');
  }
}

function copyLink() {
  navigator.clipboard.writeText(location.href).then(function () {
    showToast('ლინკი დაკოპირდა ✅');
  });
}

function showToast(msg) {
  var t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 2200);
}

router();
