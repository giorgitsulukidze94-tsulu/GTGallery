/* ============================================================
   GT GALLERY — Public site logic
   ============================================================ */

var API_URL = window.GT_CONFIG.API_URL;
var app = document.getElementById('app');
var topbarActions = document.getElementById('topbarActions');
document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());

var cache = { listings: null, settings: null };

function apiGet(action, params) {
  var url = API_URL + '?action=' + action;
  for (var k in (params || {})) url += '&' + k + '=' + encodeURIComponent(params[k]);
  return fetch(url).then(function (r) { return r.json(); });
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
  return photos[idx] || photos[0] || 'https://via.placeholder.com/600x450?text=No+Photo';
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

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
      app.innerHTML = '<div class="empty-state">❌ მონაცემების ჩატვირთვა ვერ მოხერხდა</div>';
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
        '<img src="' + escapeHtml(mainPhoto(l)) + '" loading="lazy" alt="' + escapeHtml(l.make) + ' ' + escapeHtml(l.model) + '">' +
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
      app.innerHTML = '<div class="empty-state">❌ განცხადება ვერ მოიძებნა</div>';
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

    var desc = l.descriptionGe || l.descriptionEn || l.descriptionRu || '';

    var shareUrl = location.href;
    var actionsHtml =
      (l.contactPhone ? '<a class="btn btn-blue" href="tel:' + escapeHtml(l.contactPhone) + '">📞 დარეკვა</a>' : '') +
      (l.contactWhatsapp ? '<a class="btn btn-green" target="_blank" href="https://wa.me/' + escapeHtml(l.contactWhatsapp.replace(/[^0-9]/g, '')) + '">💬 WhatsApp</a>' : '') +
      (l.sourceLink ? '<a class="btn btn-ghost" target="_blank" href="' + escapeHtml(l.sourceLink) + '">🔗 ნახე ' + escapeHtml(l.sourceSite || 'საიტზე') + '</a>' : '') +
      '<button class="btn btn-ghost" onclick="shareListing()">📤 გაზიარება</button>' +
      '<button class="btn btn-ghost" onclick="copyLink()">🔗 ლინკის კოპირება</button>';

    app.innerHTML =
      '<div style="max-width:900px;margin:0 auto;padding-bottom:60px;">' +
        '<div class="detail-gallery" id="mainPhotoWrap">' +
          (l.sold ? '<div class="sold-badge" style="font-size:15px;">გაყიდულია</div>' : '') +
          '<img id="mainPhotoImg" src="' + escapeHtml(photos[mainIdx] || photos[0]) + '" onclick="openLightbox(' + mainIdx + ')">' +
        '</div>' +
        (photos.length > 1 ? '<div class="thumb-row" id="thumbRow">' + photos.map(function (p, i) {
          return '<img src="' + escapeHtml(p) + '" class="' + (i === mainIdx ? 'active' : '') + '" onclick="setMainPhoto(' + i + ')">';
        }).join('') + '</div>' : '') +

        '<h1 style="margin:18px 0 4px;font-size:26px;">' + escapeHtml(l.make) + ' ' + escapeHtml(l.model) + (l.year ? ', ' + escapeHtml(l.year) : '') + '</h1>' +
        '<div style="font-size:22px;font-weight:800;color:var(--accent);margin-bottom:6px;">' + fmtPrice(l) + (l.tradeIn ? ' · 🔁 გაცვლა შესაძლებელია' : '') + '</div>' +

        '<div class="action-bar">' + actionsHtml + '</div>' +

        '<div class="spec-grid">' + specsHtml + '</div>' +

        (featuresHtml ? '<h3>დამატებითი აღჭურვილობა</h3><div>' + featuresHtml + '</div>' : '') +

        (desc ? '<h3 style="margin-top:24px;">აღწერა</h3><p style="line-height:1.6;color:var(--text);white-space:pre-wrap;">' + escapeHtml(desc) + '</p>' : '') +

        (l.video ? '<h3 style="margin-top:24px;">ვიდეო</h3><div style="aspect-ratio:16/9;border-radius:var(--radius-md);overflow:hidden;">' + videoEmbed(l.video) + '</div>' : '') +
      '</div>' +

      '<div class="lightbox" id="lightbox" style="display:none;" onclick="closeLightbox(event)">' +
        '<button class="lightbox-close" onclick="closeLightbox(event)">✕</button>' +
        '<img id="lightboxImg" src="">' +
      '</div>';

    window.__photos = photos;
  });
}

function videoEmbed(url) {
  var yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/' + yt[1] + '" frameborder="0" allowfullscreen></iframe>';
  return '<a class="btn btn-ghost" target="_blank" href="' + escapeHtml(url) + '">▶️ ვიდეოს ნახვა</a>';
}

function setMainPhoto(i) {
  document.getElementById('mainPhotoImg').src = window.__photos[i];
  document.getElementById('mainPhotoImg').setAttribute('onclick', 'openLightbox(' + i + ')');
  document.querySelectorAll('#thumbRow img').forEach(function (img, idx) {
    img.classList.toggle('active', idx === i);
  });
}

function openLightbox(i) {
  document.getElementById('lightboxImg').src = window.__photos[i];
  document.getElementById('lightbox').style.display = 'flex';
}
function closeLightbox(e) {
  document.getElementById('lightbox').style.display = 'none';
}

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
