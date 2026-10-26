(function () {
  'use strict';

  var CHAR_IMAGES = ['chiikawa.png', 'hachiware.png', 'usagi.png', 'momonga.png', 'kurimanju.png', 'shisa.png'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var TYPE_INFO = {
    flight: { label: 'Flight', cls: 'tg-trans' },
    transport: { label: 'Transport', cls: 'tg-trans' },
    activity: { label: 'Sightseeing', cls: 'tg-sight' },
    hotel: { label: 'Stay', cls: 'tg-stay' },
    meal: { label: 'Food', cls: 'tg-food' }
  };

  var state = {
    pal: 'pastel',
    mode: 'light',
    filter: 'all',
    tab: 'overview'
  };
  var DATA = null;

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function charFor(dayNumber) {
    return CHAR_IMAGES[(dayNumber - 1) % CHAR_IMAGES.length];
  }

  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00Z');
    return { day: d.getUTCDate(), mo: MO[d.getUTCMonth()], wd: WD[d.getUTCDay()] };
  }

  function fmtDateLong(iso) {
    var f = fmtDate(iso);
    return f.wd + ' ' + f.day + ' ' + f.mo;
  }

  function typeInfo(type) {
    return TYPE_INFO[type] || { label: type || 'Other', cls: 'tg-trans' };
  }

  function badgeClass(status) {
    if (!status || status === 'TBD') return 'badge-tbd';
    var key = String(status).toLowerCase().replace(/[^a-z]/g, '');
    if (key === 'booked') return 'badge-booked';
    if (key === 'needsbooking') return 'badge-needsbooking';
    if (key === 'notbooked') return 'badge-notbooked';
    if (key === 'nobookingneeded') return 'badge-nobookingneeded';
    return 'badge-neutral';
  }

  function badgeHtml(status) {
    var text = status ? status : 'TBD';
    return '<span class="badge ' + badgeClass(status) + '">' + esc(text) + '</span>';
  }

  // ---------- photos ----------
  function photoLib(key) {
    return DATA.photo_library && DATA.photo_library[key];
  }

  function photoCreditHtml(p) {
    return '<figcaption class="photo-credit">Photo: <a href="' + esc(p.source_url) + '" target="_blank" rel="noopener">' +
      esc(p.author) + '</a> · <a href="' + esc(p.licence_url) + '" target="_blank" rel="noopener">' + esc(p.licence) + '</a></figcaption>';
  }

  function photoFigure(key, cls) {
    var p = photoLib(key);
    if (!p) return '';
    return '' +
      '<figure class="photo' + (cls ? ' ' + cls : '') + '">' +
      '<button type="button" class="photo-btn" data-action="open-lightbox" data-key="' + esc(key) + '" aria-label="View full-size photo: ' + esc(p.caption) + '">' +
      '<img src="' + esc(p.src_800) + '" srcset="' + esc(p.src_800) + ' 800w, ' + esc(p.src_1800) + ' 1800w" ' +
      'sizes="(min-width: 900px) 420px, 92vw" width="' + p.w_800 + '" height="' + p.h_800 + '" ' +
      'loading="lazy" decoding="async" alt="' + esc(p.caption) + '">' +
      '</button>' +
      photoCreditHtml(p) +
      '</figure>';
  }

  function stopPhotosHtml(stop) {
    var photos = stop.photos || [];
    if (!photos.length) return '';
    var figs = photos.map(function (ph) { return photoFigure(ph.key); }).join('');
    return '<div class="photogrid pg-' + photos.length + '">' + figs + '</div>';
  }

  function dayHeroPhotoHtml(day) {
    if (!day.hero_photo || !day.hero_photo.key) return '';
    var p = photoLib(day.hero_photo.key);
    if (!p) return '';
    return '' +
      '<figure class="photo dayhero-photo">' +
      '<button type="button" class="photo-btn" data-action="open-lightbox" data-key="' + esc(day.hero_photo.key) + '" aria-label="View full-size photo: ' + esc(p.caption) + '">' +
      '<img src="' + esc(p.src_800) + '" srcset="' + esc(p.src_800) + ' 800w, ' + esc(p.src_1800) + ' 1800w" ' +
      'sizes="(min-width: 900px) 760px, 94vw" width="' + p.w_800 + '" height="' + p.h_800 + '" ' +
      'loading="lazy" decoding="async" alt="' + esc(p.caption) + '">' +
      '</button>' +
      photoCreditHtml(p) +
      '</figure>';
  }

  function renderPhotoCredits() {
    var lib = DATA.photo_library || {};
    var keys = Object.keys(lib);
    if (!keys.length) return '';
    var items = keys.map(function (key) {
      var p = lib[key];
      return '' +
        '<li class="credititem">' +
        '<span class="cc-cap">' + esc(p.caption) + '</span>' +
        '<span class="cc-meta">' + esc(p.author) + ' · <a href="' + esc(p.licence_url) + '" target="_blank" rel="noopener">' + esc(p.licence) + '</a> · ' +
        '<a href="' + esc(p.source_url) + '" target="_blank" rel="noopener">Source ↗</a></span>' +
        '</li>';
    }).join('');
    return '' +
      '<section class="card sec">' +
      '<h2>📷 Photo credits</h2>' +
      '<p class="note">All photos are freely licensed, sourced from Wikimedia Commons.</p>' +
      '<ul class="creditlist">' + items + '</ul>' +
      '</section>';
  }

  function emptyState(title, text, charIdx) {
    var img = CHAR_IMAGES[((charIdx % CHAR_IMAGES.length) + CHAR_IMAGES.length) % CHAR_IMAGES.length];
    return '' +
      '<div class="empty">' +
      '<div class="slot slot-empty"><img class="charimg" src="img/' + img + '" alt=""></div>' +
      '<div class="txt"><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p></div>' +
      '</div>';
  }

  function sumCost(stops) {
    var min = 0, max = 0, count = 0;
    stops.forEach(function (s) {
      if (s.cost_krw && (s.cost_krw.min != null || s.cost_krw.max != null)) {
        min += s.cost_krw.min != null ? s.cost_krw.min : s.cost_krw.max;
        max += s.cost_krw.max != null ? s.cost_krw.max : s.cost_krw.min;
        count++;
      }
    });
    return { min: min, max: max, count: count };
  }

  function krwToSgdText(krw, rate) {
    return (krw / rate).toFixed(2);
  }

  function costRangeText(sum, rate) {
    if (!sum.count) return null;
    var k = sum.min === sum.max ?
      '₩' + sum.min.toLocaleString('en-US') :
      '₩' + sum.min.toLocaleString('en-US') + '–' + sum.max.toLocaleString('en-US');
    var s = sum.min === sum.max ?
      'S$' + krwToSgdText(sum.min, rate) :
      'S$' + krwToSgdText(sum.min, rate) + '–' + krwToSgdText(sum.max, rate);
    return k + ' (' + s + ')';
  }

  // ---------- persistence ----------
  function loadTheme() {
    try {
      var pal = localStorage.getItem('kr2026-pal');
      var mode = localStorage.getItem('kr2026-mode');
      if (pal === 'pastel' || pal === 'winter' || pal === 'hanok') state.pal = pal;
      if (mode === 'light' || mode === 'dark') state.mode = mode;
    } catch (e) { /* localStorage unavailable */ }
  }
  function saveTheme() {
    try {
      localStorage.setItem('kr2026-pal', state.pal);
      localStorage.setItem('kr2026-mode', state.mode);
    } catch (e) { /* ignore */ }
  }

  // ---------- header ----------
  function renderHeader() {
    var meta = DATA.meta, ov = DATA.overview;
    var start = fmtDate(ov.dates.start), end = fmtDate(ov.dates.end);
    var metaLine = start.day + ' ' + start.mo + ' (' + start.wd + ') – ' + end.day + ' ' + end.mo + ' (' + end.wd + ') · ' +
      ov.travellers + ' travellers · ' + esc((ov.interests || []).join(', '));

    var cityLegs = (ov.route || []).filter(function (r) { return r.nights; });
    var pills = cityLegs.map(function (leg, i) {
      var sub = '';
      if (leg.from && leg.to) {
        sub = fmtDate(leg.from).day + ' ' + fmtDate(leg.from).mo + ' – ' + fmtDate(leg.to).day + ' ' + fmtDate(leg.to).mo;
      }
      var piece = '<span class="rpill"><b>' + esc(leg.leg) + '</b><span>' + esc(sub) + '</span></span>';
      if (i < cityLegs.length - 1) {
        piece += '<span class="rline"></span><span class="rtrain">🚆</span><span class="rline"></span>';
      }
      return piece;
    }).join('');

    var pals = [
      { id: 'pastel', label: 'Pastel', sw: '#FFD65A' },
      { id: 'winter', label: 'Winter', sw: '#8EC5FF' },
      { id: 'hanok', label: 'Hanok', sw: '#A9C7A0' }
    ];
    var palBtns = pals.map(function (p) {
      return '<button class="btn" type="button" aria-pressed="' + (state.pal === p.id) + '" data-action="set-pal" data-pal="' + p.id + '">' +
        '<span class="dotsw" style="background:' + p.sw + '"></span>' + p.label + '</button>';
    }).join('');

    return '' +
      '<header class="card hd">' +
      '<div class="hero-row" aria-hidden="true">' +
      '<img class="charimg" src="img/chiikawa.png" alt="">' +
      '<img class="charimg" src="img/hachiware.png" alt="">' +
      '<img class="charimg" src="img/usagi.png" alt="">' +
      '</div>' +
      '<div class="hd-main">' +
      '<span class="eyebrow">🔒 Private trip page · unlisted</span>' +
      '<h1 class="ttl">' + esc(meta.title) + '</h1>' +
      '<p class="meta-line">' + metaLine + '</p>' +
      '<div class="route">' + pills + '</div>' +
      '</div>' +
      '<div class="tools">' +
      '<button class="btn" type="button" aria-pressed="' + (state.mode === 'dark') + '" data-action="toggle-mode">' +
      (state.mode === 'dark' ? '🌙 Dark mode' : '☀️ Light mode') +
      '</button>' +
      '<div class="seg" role="group" aria-label="Colour theme">' + palBtns + '</div>' +
      '</div>' +
      '</header>';
  }

  // ---------- tabs ----------
  function renderTabs() {
    var out = '<nav class="tabs" aria-label="Trip days">';
    out += '<a class="tab" href="#overview" aria-pressed="' + (state.tab === 'overview') + '">' +
      '<span class="tslot solid">🗺️</span><span class="tt"><b>Overview</b><span>' + DATA.days.length + ' days</span></span></a>';
    DATA.days.forEach(function (d) {
      var on = state.tab === d.id;
      out += '<a class="tab" href="#' + d.id + '" aria-pressed="' + on + '">' +
        '<span class="tslot"><img src="img/' + charFor(d.day) + '" alt=""></span>' +
        '<span class="tt"><b>Day ' + d.day + '</b><span>' + esc(d.date_label) + '</span></span></a>';
    });
    out += '</nav>';
    return out;
  }

  // ---------- overview: summary, flights, hotels ----------
  function renderCaveats() {
    var meta = DATA.meta;
    if (!meta.caveats || !meta.caveats.length) return '';
    var items = meta.caveats.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
    return '<section class="card notice"><strong>Good to know</strong><ul>' + items + '</ul></section>';
  }

  function renderRouteLeg(leg) {
    var bits = [];
    if (leg.nights) bits.push(leg.nights + ' nights');
    if (leg.from && leg.to) bits.push(fmtDateLong(leg.from) + ' – ' + fmtDateLong(leg.to));
    if (leg.date) bits.push(fmtDateLong(leg.date) + (leg.weekday ? ' (' + esc(leg.weekday) + ')' : ''));
    if (leg.time) bits.push('Time: ' + esc(leg.time));
    if (leg.duration) bits.push('Duration: ' + esc(leg.duration));
    if (leg.fare) bits.push('Fare: ' + esc(leg.fare));
    var badge = leg.booking_status ? badgeHtml(leg.booking_status) : '';
    return '<div class="routeitem"><b>' + esc(leg.leg) + '</b>' + badge +
      (bits.length ? '<span class="sub">' + bits.join(' · ') + '</span>' : '') + '</div>';
  }

  function renderSummary() {
    var ov = DATA.overview;
    var legs = (ov.route || []).map(renderRouteLeg).join('');
    return '' +
      '<section class="card sec">' +
      '<h2>Trip summary</h2>' +
      '<p>' + esc(ov.summary) + '</p>' +
      '<p class="note">' + esc(ov.traveller_note || '') + '</p>' +
      '<h3>Route</h3>' +
      '<div class="routelist">' + legs + '</div>' +
      '</section>';
  }

  function renderFlights() {
    var fl = DATA.flights;
    if (!fl) return '';
    var opts = (fl.options || []).map(function (o) {
      var link = o.link ? '<a class="extlink" href="' + esc(o.link) + '" target="_blank" rel="noopener">Check flights ↗</a>' : '';
      return '' +
        '<div class="opt">' +
        '<b>Option ' + esc(o.option) + ': ' + esc(o.airline) + '</b>' +
        '<span class="note">' + esc(o.type || '') + '</span>' +
        '<div class="kvs">' +
        '<div><span>Outbound</span>' + esc(o.outbound && (o.outbound.dep + ' → ' + o.outbound.arr) || 'TBD') + '</div>' +
        '<div><span>Return</span>' + esc(o.return && (o.return.dep + ' → ' + o.return.arr) || 'TBD') + '</div>' +
        '<div><span>Total for 2</span>' + esc(o.total_for_2 || 'TBD') + '</div>' +
        '<div><span>Per person</span>' + esc(o.per_person || 'TBD') + '</div>' +
        '</div>' +
        '<span class="note">Included: ' + esc(o.included || 'TBD') + '</span>' +
        (o.note ? '<span class="note">' + esc(o.note) + '</span>' : '') +
        link +
        '</div>';
    }).join('');
    return '' +
      '<section class="card sec">' +
      '<div class="row" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">' +
      '<h2 style="margin:0;">Flights</h2>' + badgeHtml(fl.booking_status) +
      '</div>' +
      '<div class="subcard">' +
      '<span class="note">Airline decision: ' + esc(fl.airline_decision || 'TBD') + ' · Budget cap: ' + esc(fl.budget_cap || 'TBD') + '</span>' +
      '<div class="optlist">' + (opts || emptyState('No flight options yet', 'Flight search results will show up here.', 0)) + '</div>' +
      '<span class="note">' + esc(fl.source || '') + '</span>' +
      '</div>' +
      '</section>';
  }

  function renderHotelGroup(label, g) {
    if (!g) return '';
    var shortlist = (g.shortlist || []);
    var cards = shortlist.length ? shortlist.map(function (h) {
      var link = h.link ? '<a class="extlink" href="' + esc(h.link) + '" target="_blank" rel="noopener">Hotel page ↗</a>' : '';
      return '' +
        '<div class="hotelcard">' +
        '<div class="row" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">' +
        '<b>' + esc(h.name) + '</b>' + badgeHtml(h.booking_status) +
        '</div>' +
        '<span class="note">' + esc(h.area || '') + ' · ' + esc(h.stars_room || '') + '</span>' +
        '<div class="kvs">' +
        '<div><span>Per person / night</span>' + esc(h.pp_per_night || 'TBD') + '</div>' +
        '<div><span>Room / night</span>' + esc(h.room_per_night || 'TBD') + '</div>' +
        '<div><span>Whole stay (room)</span>' + esc(h.whole_stay_room || 'TBD') + '</div>' +
        '</div>' +
        (h.note ? '<span class="note">' + esc(h.note) + '</span>' : '') +
        link +
        '</div>';
    }).join('') : emptyState('No hotel shortlist yet', 'Hotel options for ' + label + ' will show up here.', 2);
    return '' +
      '<div class="subcard">' +
      '<div class="row" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">' +
      '<h3 style="margin:0;">' + esc(label) + '</h3>' + badgeHtml(g.decision) +
      '</div>' +
      '<span class="note">Provisional base: ' + esc(g.provisional_base || 'TBD') + ' · ' + esc(g.nights || '?') + ' nights (' +
      (g.check_in ? fmtDateLong(g.check_in) : '?') + ' – ' + (g.check_out ? fmtDateLong(g.check_out) : '?') + ')</span>' +
      '<div class="optlist">' + cards + '</div>' +
      '</div>';
  }

  function renderHotels() {
    var h = DATA.hotels;
    if (!h) return '';
    return '' +
      '<section class="card sec">' +
      '<div class="row" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">' +
      '<h2 style="margin:0;">Hotels</h2>' + badgeHtml(h.booking_status) +
      '</div>' +
      '<span class="note">' + esc(h.price_basis || '') + '</span>' +
      renderHotelGroup('Seoul', h.seoul) +
      renderHotelGroup('Busan', h.busan) +
      (h.links_note ? '<span class="note">' + esc(h.links_note) + '</span>' : '') +
      '</section>';
  }

  // ---------- overview: day-map board ----------
  function renderBoard() {
    var rate = DATA.meta.exchange_rate.krw_per_sgd;
    var typeCounts = {};
    DATA.days.forEach(function (d) {
      d.stops.forEach(function (s) { typeCounts[s.type] = (typeCounts[s.type] || 0) + 1; });
    });
    var chipTypes = Object.keys(typeCounts);
    var chips = chipTypes.map(function (t) {
      var info = typeInfo(t);
      return '<button class="chip ' + info.cls + '" type="button" aria-pressed="' + (state.filter === t) + '" data-action="set-filter" data-filter="' + t + '">' +
        esc(info.label) + '<span class="cnt">' + typeCounts[t] + '</span></button>';
    }).join('');

    var allSum = sumCost(DATA.days.reduce(function (a, d) { return a.concat(d.stops); }, []));
    var totalText = costRangeText(allSum, rate);

    var cols = DATA.days.map(function (d) {
      var stopsHtml = d.stops.map(function (s, i) {
        var info = typeInfo(s.type);
        var dim = (state.filter !== 'all' && state.filter !== s.type) ? ' dim' : '';
        var conn = i > 0 ? '<span class="cconn" aria-hidden="true"></span>' : '';
        return '' +
          conn +
          '<div class="cstop' + dim + '">' +
          '<span class="node ' + info.cls + '" aria-hidden="true">' + (s.emoji || '') + '</span>' +
          '<span class="csname">' + esc(s.place) + '</span>' +
          '<span class="csmeta"><b>' + esc(s.time || '') + '</b></span>' +
          (s.cost_text ? '<span class="csmeta">' + esc(s.cost_text) + '</span>' : '') +
          '<span class="tag ' + info.cls + '">' + esc(info.label) + '</span>' +
          '</div>';
      }).join('');
      return '' +
        '<div class="col">' +
        '<a class="dayh" href="#' + d.id + '" aria-label="Open Day ' + d.day + '">' +
        '<span class="slot slot-day"><img class="charimg" src="img/' + charFor(d.day) + '" alt=""></span>' +
        '<span class="dayno">Day ' + d.day + '</span>' +
        '<span class="dtitle">' + esc(d.title) + '</span>' +
        '<span class="ddate">' + esc(d.date_label) + '</span>' +
        '<span class="city-chip">' + esc(d.city) + '</span>' +
        '</a>' +
        '<div class="colstops">' + stopsHtml + '</div>' +
        '</div>';
    }).join('');

    return '' +
      '<section class="card sec">' +
      '<h2>⭐ Seoul to Busan: your ' + DATA.days.length + '-day food, shopping &amp; sightseeing map ⭐</h2>' +
      '<div class="toolrow">' +
      '<div class="chips" role="group" aria-label="Highlight a group">' +
      '<button class="chip" type="button" aria-pressed="' + (state.filter === 'all') + '" data-action="set-filter" data-filter="all">All groups</button>' +
      chips +
      '</div>' +
      (totalText ? '<span class="total">Est. ' + totalText + ' · excludes flights &amp; stays, estimate</span>' : '') +
      '</div>' +
      '<span class="swipe">Swipe sideways to see all ' + DATA.days.length + ' days. Tap a day header to open it.</span>' +
      '<div class="board">' + cols + '</div>' +
      '</section>';
  }

  // ---------- overview: phrases + emergency ----------
  function renderPhrases() {
    var phrases = DATA.phrases || [];
    var cats = phrases.length ? phrases.map(function (cat) {
      var items = (cat.items || []).length ? cat.items.map(function (p) {
        return '<div class="phrase"><span class="ko">' + esc(p.korean) + '</span><span class="say">' + esc(p.say) + '</span><span class="en">' + esc(p.english) + '</span></div>';
      }).join('') : emptyState('No phrases yet', 'Phrases for ' + cat.category + ' will show up here.', 4);
      return '<div class="phrasecat"><h3>' + (cat.emoji ? cat.emoji + ' ' : '') + esc(cat.category) + '</h3><div class="phraselist">' + items + '</div></div>';
    }).join('') : emptyState('No phrases yet', 'Useful Korean phrases will show up here.', 4);

    var em = DATA.emergency_numbers || {};
    var emItems = Object.keys(em).map(function (key) {
      var label = key.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      return '<div class="emitem"><a href="tel:' + esc(em[key]) + '">' + esc(em[key]) + '</a><span>' + esc(label) + '</span></div>';
    }).join('');

    return '' +
      '<section class="card sec">' +
      '<h2>🗣️ Phrases &amp; emergency numbers</h2>' +
      '<div class="phrasegrid">' + cats + '</div>' +
      '<h3>Emergency numbers</h3>' +
      '<div class="emlist">' + (emItems || emptyState('No emergency numbers yet', 'Emergency contact numbers will show up here.', 5)) + '</div>' +
      '</section>';
  }

  // ---------- overview page ----------
  function renderOverview() {
    return renderCaveats() + renderSummary() + renderFlights() + renderHotels() + renderBoard() + renderPhrases() + renderPhotoCredits();
  }

  // ---------- day view ----------
  function renderDirection(dir) {
    var steps = (dir.steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    var links = '';
    if (dir.kakao_url) links += '<a class="btn" href="' + esc(dir.kakao_url) + '" target="_blank" rel="noopener">🗺️ KakaoMap</a>';
    if (dir.naver_url) links += '<a class="btn" href="' + esc(dir.naver_url) + '" target="_blank" rel="noopener">🗺️ Naver Map</a>';
    return '' +
      '<div class="tcard">' +
      '<div class="dirhead"><span class="dirlabel">' + esc(dir.label) + '</span>' + esc(dir.from) + ' → ' + esc(dir.to) + '</div>' +
      '<span class="note">Modes: ' + esc((dir.modes || []).join(', ')) + '</span>' +
      (steps ? '<ol class="dirsteps">' + steps + '</ol>' : '') +
      '<div class="dirmeta">' +
      (dir.time ? '<span>⏱ ' + esc(dir.time) + '</span>' : '') +
      (dir.fare ? '<span>💰 ' + esc(dir.fare) + '</span>' : '') +
      '</div>' +
      (dir.check ? '<span class="dircheck">' + esc(dir.check) + '</span>' : '') +
      (links ? '<div class="dirlinks">' + links + '</div>' : '') +
      '</div>';
  }

  function renderContingency(c) {
    if (!c) return '';
    return '' +
      '<details class="planb">' +
      '<summary>🔀 Plan B</summary>' +
      '<div class="planb-body">' +
      '<p><b>If this happens:</b> ' + esc(c.if_this_happens) + '</p>' +
      '<p><b>Contingency 1:</b> ' + esc(c.contingency_1) + '</p>' +
      (c.contingency_1_caution ? '<p class="planb-caution">⚠️ ' + esc(c.contingency_1_caution) + '</p>' : '') +
      '<p><b>Contingency 2:</b> ' + esc(c.contingency_2) + '</p>' +
      (c.easy_onward ? '<p><b>Easy onward?</b> ' + esc(c.easy_onward) + '</p>' : '') +
      '</div>' +
      '</details>';
  }

  function renderStop(s, i, isLast) {
    var info = typeInfo(s.type);
    return '' +
      '<div class="tli' + (isLast ? ' last' : '') + '">' +
      '<div class="ttime">' + esc(s.time || '') + '</div>' +
      '<div class="rail"><span class="dot ' + info.cls + '"></span><span class="rln"></span></div>' +
      '<div class="tcard">' +
      '<div class="trow"><span class="node sm ' + info.cls + '" aria-hidden="true">' + (s.emoji || '') + '</span><h4>' + esc(s.place) + '</h4>' + badgeHtml(s.booking_status) + '</div>' +
      (s.restaurant ? '<span class="restaurant">🍽️ ' + esc(s.restaurant) + '</span>' : '') +
      stopPhotosHtml(s) +
      (s.description ? '<p class="note">' + esc(s.description) + '</p>' : '') +
      '<div class="trow2">' +
      '<span class="tag ' + info.cls + '">' + esc(info.label) + '</span>' +
      (s.cost_text ? '<span class="cost">' + esc(s.cost_text) + '</span>' : '') +
      (s.vs_singapore ? '<span class="vs">vs Singapore: ' + esc(s.vs_singapore) + '</span>' : '') +
      '</div>' +
      (s.booking_note ? '<span class="bnote">' + esc(s.booking_note) + '</span>' : '') +
      renderContingency(s.contingency) +
      '</div>' +
      '</div>';
  }

  function renderDay(day) {
    var rate = DATA.meta.exchange_rate.krw_per_sgd;
    var total = sumCost(day.stops);
    var totalText = costRangeText(total, rate) || 'No priced stops';

    var idx = DATA.days.findIndex(function (d) { return d.id === day.id; });
    var prev = idx > 0 ? DATA.days[idx - 1] : null;
    var next = idx < DATA.days.length - 1 ? DATA.days[idx + 1] : null;

    var stopsHtml = day.stops.length ?
      day.stops.map(function (s, i) { return renderStop(s, i, i === day.stops.length - 1); }).join('') :
      emptyState('Nothing planned yet', 'Stops for ' + day.date_label + ' will show up here.', day.day - 1);

    var dirsHtml = (day.directions && day.directions.length) ?
      day.directions.map(renderDirection).join('') :
      emptyState('No directions yet', 'Getting-around steps for ' + day.date_label + ' will show up here.', day.day - 1);

    return '' +
      '<section class="card dayhead">' +
      '<div class="slot slot-dayhero"><img class="charimg" src="img/' + charFor(day.day) + '" alt=""></div>' +
      '<div class="dh-main">' +
      '<h2>Day ' + day.day + ': ' + esc(day.title) + '</h2>' +
      '<p>' + esc(day.weekday) + ' ' + esc(day.date_label) + ' · ' + esc(day.city) + ' · ' + esc(day.area || '') + ' · ' + day.stops.length + ' stops</p>' +
      '<p>' + esc(day.walking || '') + (day.walking && day.rides ? ' · ' : '') + esc(day.rides || '') + '</p>' +
      '</div>' +
      dayHeroPhotoHtml(day) +
      (day.note ? '<div class="daynote">' + esc(day.note) + '</div>' : '') +
      (day.time_sensitive ? '<div class="daynote daytimesensitive">⏰ Time-sensitive: ' + esc(day.time_sensitive) + '</div>' : '') +
      '<div class="daytotal">Day total<b>' + esc(totalText) + '</b>' + (total.count ? 'estimate from priced stops' : '') + '</div>' +
      '<div class="navrow">' +
      (prev ? '<a class="btn" href="#' + prev.id + '">← Day ' + prev.day + '</a>' : '') +
      (next ? '<a class="btn" href="#' + next.id + '">Day ' + next.day + ' →</a>' : '') +
      '</div>' +
      '</section>' +
      (day.planning_summary ? '<section class="card sec"><h3>Planning notes</h3><p>' + esc(day.planning_summary) + '</p></section>' : '') +
      '<section class="card tlcard">' +
      '<h3>Timeline</h3>' +
      '<div>' + stopsHtml + '</div>' +
      '</section>' +
      '<section class="card dircard">' +
      '<h3>Getting around</h3>' +
      '<div>' + dirsHtml + '</div>' +
      '</section>';
  }

  // ---------- footer ----------
  function renderFooter() {
    var meta = DATA.meta;
    return '' +
      '<footer class="foot">' +
      'Personal, unlisted trip page · ₩' + meta.exchange_rate.krw_per_sgd.toLocaleString('en-US') + ' = S$1 (' + esc(meta.exchange_rate.as_of) + ')<br>' +
      'Chiikawa characters © nagano / chiikawa committee; used for a personal page only' +
      '</footer>';
  }

  // ---------- main render ----------
  function currentDay() {
    return DATA.days.find(function (d) { return d.id === state.tab; });
  }

  function render() {
    var hash = (location.hash || '').replace('#', '');
    if (hash === 'overview' || !hash) {
      state.tab = 'overview';
    } else if (/^d([1-9]|10)$/.test(hash) && DATA.days.some(function (d) { return d.id === hash; })) {
      state.tab = hash;
    } else {
      state.tab = 'overview';
    }

    var app = document.getElementById('app');
    app.className = 'kp p-' + state.pal + ' m-' + state.mode;
    document.body.className = 'p-' + state.pal + ' m-' + state.mode;

    var main = state.tab === 'overview' ? renderOverview() : renderDay(currentDay());

    app.innerHTML = '<div class="wrap">' + renderHeader() + renderTabs() + main + renderFooter() + '</div>';
  }

  // ---------- lightbox ----------
  var lightboxEl = null;
  var lightboxLastFocus = null;

  function setupLightbox() {
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox';
    lightboxEl.hidden = true;
    lightboxEl.innerHTML = '' +
      '<div class="lightbox-backdrop" data-action="close-lightbox"></div>' +
      '<div class="lightbox-panel" role="dialog" aria-modal="true" aria-label="Photo">' +
      '<button type="button" class="lightbox-close" data-action="close-lightbox" aria-label="Close photo">✕</button>' +
      '<img class="lightbox-img" alt="">' +
      '<div class="lightbox-caption"></div>' +
      '</div>';
    document.body.appendChild(lightboxEl);
  }

  function openLightbox(key) {
    var p = photoLib(key);
    if (!p || !lightboxEl) return;
    lightboxLastFocus = document.activeElement;
    var img = lightboxEl.querySelector('.lightbox-img');
    img.src = p.src_1800;
    img.width = p.w_1800;
    img.height = p.h_1800;
    img.alt = p.caption || '';
    var cap = lightboxEl.querySelector('.lightbox-caption');
    cap.innerHTML = esc(p.caption) + ' — Photo: <a href="' + esc(p.source_url) + '" target="_blank" rel="noopener">' +
      esc(p.author) + '</a> · <a href="' + esc(p.licence_url) + '" target="_blank" rel="noopener">' + esc(p.licence) + '</a>';
    lightboxEl.hidden = false;
    document.body.classList.add('lb-open');
    lightboxEl.querySelector('.lightbox-close').focus();
  }

  function closeLightbox() {
    if (!lightboxEl || lightboxEl.hidden) return;
    lightboxEl.hidden = true;
    document.body.classList.remove('lb-open');
    if (lightboxLastFocus && lightboxLastFocus.focus) lightboxLastFocus.focus();
    lightboxLastFocus = null;
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-action]') : null;
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    if (action === 'toggle-mode') {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
      saveTheme();
      render();
    } else if (action === 'set-pal') {
      state.pal = btn.getAttribute('data-pal');
      saveTheme();
      render();
    } else if (action === 'set-filter') {
      var f = btn.getAttribute('data-filter');
      state.filter = (f === 'all' || state.filter === f) ? 'all' : f;
      render();
    } else if (action === 'open-lightbox') {
      openLightbox(btn.getAttribute('data-key'));
    } else if (action === 'close-lightbox') {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightboxEl && !lightboxEl.hidden) closeLightbox();
  });

  window.addEventListener('hashchange', render);

  setupLightbox();

  loadTheme();
  fetch('data.json')
    .then(function (r) { return r.json(); })
    .then(function (json) {
      DATA = json;
      render();
    })
    .catch(function (err) {
      var app = document.getElementById('app');
      app.textContent = 'Could not load trip data: ' + err.message;
    });
})();
