/* =======================================================================
   旅行计划网站 — 数据驱动的单页应用
   数据源：data/itinerary.json
   ======================================================================= */
(function () {
  'use strict';

  var DATA = null;
  var LS_KEY = 'travel-todos-v1';
  var doneSet = loadDone();

  /* ------------------------- 工具函数 ------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parseDate(s) {
    if (!s) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  function fmtDate(s) {
    var d = parseDate(s);
    if (!d) return s || '待确认';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function fmtDateFull(s) {
    var d = parseDate(s);
    if (!d) return s || '待确认';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function daysFromToday(s) {
    var d = parseDate(s);
    if (!d) return null;
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 86400000);
  }
  function statusClass(s) {
    if (!s) return 'st-none';
    if (s.indexOf('已购买') >= 0 || s.indexOf('已完成') >= 0 || s === '已核实') return 'st-done';
    if (s.indexOf('待购买') >= 0 || s.indexOf('待预订') >= 0 || s.indexOf('待完成') >= 0 || s.indexOf('待预约') >= 0) return 'st-buy';
    if (s.indexOf('待核实') >= 0 || s.indexOf('待确认') >= 0 || s.indexOf('待官方确认') >= 0) return 'st-check';
    if (s.indexOf('暂未开放') >= 0 || s === '不适用') return 'st-none';
    return 'st-none';
  }
  function statusPill(s) { return '<span class="st ' + statusClass(s) + '">' + esc(s || '待确认') + '</span>'; }

  /* ------------------------- 地图链接 ------------------------- */
  var MAP = {
    amap: function (name) { return 'https://www.amap.com/search?query=' + encodeURIComponent(name); },
    baidu: function (name) { return 'https://map.baidu.com/search/' + encodeURIComponent(name) + '/@0,0,12'; },
    qq: function (name) { return 'https://map.qq.com/?type=poi&keyword=' + encodeURIComponent(name); },
    amapRoute: function (from, to, mode) {
      var t = (mode === 'car' || mode === 'train' || mode === 'plane') ? 'car' : (mode === 'walk' ? 'walk' : 'bus');
      return 'https://www.amap.com/dir?from%5Bname%5D=' + encodeURIComponent(from) +
             '&to%5Bname%5D=' + encodeURIComponent(to) + '&type=' + t;
    },
    baiduRoute: function (from, to) {
      return 'https://map.baidu.com/dir/?origin=' + encodeURIComponent(from) +
             '&destination=' + encodeURIComponent(to) + '&mode=driving';
    }
  };
  function placeLinks(name, extra) {
    var h = '<div class="tl-links">';
    h += '<a href="' + MAP.amap(name) + '" target="_blank" rel="noopener">高德定位</a>';
    h += '<a href="' + MAP.baidu(name) + '" target="_blank" rel="noopener">百度定位</a>';
    h += '<a href="' + MAP.qq(name) + '" target="_blank" rel="noopener">腾讯定位</a>';
    if (extra) h += extra;
    h += '</div>';
    return h;
  }
  function routeLinks(from, to, mode, label) {
    var h = '<div class="tl-links">';
    h += '<a href="' + MAP.amapRoute(from, to, mode) + '" target="_blank" rel="noopener">高德路线导航</a>';
    h += '<a href="' + MAP.baiduRoute(from, to) + '" target="_blank" rel="noopener">百度路线导航</a>';
    h += '<a href="' + MAP.amap(from) + '" target="_blank" rel="noopener">起点定位</a>';
    h += '<a href="' + MAP.amap(to) + '" target="_blank" rel="noopener">终点定位</a>';
    h += '</div>';
    return h;
  }

  /* ------------------------- 待办本地存储 ------------------------- */
  function loadDone() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function saveDone() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(doneSet)); } catch (e) {}
  }

  /* ------------------------- 购票日历数据构建 ------------------------- */
  function buildTickets() {
    var list = [];
    DATA.transports.forEach(function (t) {
      list.push({
        kind: '交通', cat: '交通',
        title: t.from + ' → ' + t.to + ' 车票',
        sub: (t.fromStation || '') + ' → ' + (t.toStation || '') + '　' + (t.seat || '') +
             (t.price != null ? '　¥' + t.price : ''),
        travelDate: t.date,
        saleDate: t.saleDate,
        saleTime: t.saleTime,
        saleKnown: t.saleTime && t.saleTime !== '待核实',
        needReservation: false,
        status: t.status,
        verifyStatus: t.verifyStatus,
        officialUrl: t.officialUrl,
        extraUrls: t.queryUrl ? [{ label: '12306 车票查询', url: t.queryUrl }] : [],
        reminderDate: t.reminderDate, reminderTime: t.reminderTime,
        note: (t.saleStatus ? t.saleStatus + '。' : '') + (t.saleTimeNote || '') + (t.notes || ''),
        source: t.source
      });
    });
    DATA.attractions.forEach(function (a) {
      var isFree = a.ticketPrice && a.ticketPrice.indexOf('免费') === 0;
      list.push({
        kind: isFree ? '景点预约' : '景点门票', cat: '景点门票',
        title: a.name + (isFree ? '（免费预约）' : ' 门票'),
        sub: a.city + '　' + (a.ticketPrice || ''),
        travelDate: a.date,
        saleDate: a.bookingOpen && /^\d{4}-\d{2}-\d{2}/.test(a.bookingOpen) ? a.bookingOpen.slice(0, 10) : null,
        saleTime: a.bookingOpen && /00:10/.test(a.bookingOpen) ? '00:10' : (a.bookingOpen || '待核实'),
        saleKnown: !!(a.bookingOpen && /^\d{4}-\d{2}-\d{2}/.test(a.bookingOpen)),
        needReservation: !!a.needReservation,
        status: a.status,
        verifyStatus: a.verifyStatus,
        officialUrl: a.officialUrl,
        extraUrls: [],
        reminderDate: a.reminderDate, reminderTime: a.reminderDate ? '09:00' : null,
        note: (a.bookingRule || '') + (a.planPriceNote ? '｜' + a.planPriceNote : '') + (a.reminderNote ? '｜提醒：' + a.reminderNote : ''),
        source: a.source
      });
      (a.extraTransports || []).forEach(function (x) {
        var inc = x.included === true;
        list.push({
          kind: '观光车', cat: '观光车',
          title: a.name + ' · ' + x.name,
          sub: x.price + (inc ? '（已含在门票内）' : '（需单独购买）'),
          travelDate: a.date,
          saleDate: null,
          saleTime: inc ? '不适用（含在门票内）' : (x.bookingOpen || '待核实'),
          saleKnown: false,
          needReservation: !inc,
          status: inc ? '不适用' : (a.status === '不适用' ? '不适用' : '待购买'),
          verifyStatus: x.bookingOpen && x.bookingOpen.indexOf('待核实') < 0 ? '规则已核实' : '待官方确认',
          officialUrl: x.officialUrl || a.officialUrl,
          extraUrls: [],
          reminderDate: a.reminderDate, reminderTime: null,
          note: x.booking + (x.operatingHours ? '｜运营时间：' + x.operatingHours : '') + (x.note ? '｜' + x.note : ''),
          source: a.source
        });
      });
    });
    DATA.hotels.forEach(function (h) {
      list.push({
        kind: '酒店预订', cat: '住宿',
        title: h.name,
        sub: h.city + '　入住 ' + fmtDate(h.checkIn) + '　共 ' + h.nights + ' 晚',
        travelDate: h.checkIn,
        saleDate: null,
        saleTime: '随时可预订',
        saleKnown: false,
        needReservation: true,
        status: h.status,
        verifyStatus: h.verifyStatus,
        officialUrl: h.bookingUrl,
        extraUrls: [{ label: '地图定位', url: MAP.amap(h.mapQuery || h.name) }],
        reminderDate: h.checkIn, reminderTime: null,
        note: h.priceNote + (h.note ? '｜' + h.note : ''),
        source: { name: '手写行程计划', url: '', date: DATA.meta.lastVerified }
      });
    });
    list.sort(function (a, b) {
      if (a.saleDate && b.saleDate) return a.saleDate < b.saleDate ? -1 : (a.saleDate > b.saleDate ? 1 : 0);
      if (a.saleDate) return -1;
      if (b.saleDate) return 1;
      return 0;
    });
    return list;
  }

  /* ======================= 渲染：头部 ======================= */
  function renderHeader() {
    $('#siteTitle').textContent = DATA.meta.title;
    $('#siteSubtitle').textContent = DATA.meta.subtitle;
    var totalTickets = buildTickets().length;
    var h = '<b>' + fmtDate(DATA.meta.startDate) + ' — ' + fmtDate(DATA.meta.endDate) + '</b>' +
            '共 ' + DATA.meta.totalDays + ' 天<br>' +
            '待办 ' + DATA.todos.length + ' 项 · 购票/预订 ' + totalTickets + ' 项';
    $('#headerMeta').innerHTML = h;
  }

  /* ======================= 渲染：总览 ======================= */
  function renderOverview() {
    var m = DATA.meta;
    var d = daysFromToday(m.startDate);
    var stats = [
      { k: '出行日期', v: fmtDate(m.startDate) + ' — ' + fmtDate(m.endDate), sm: true },
      { k: '行程天数', v: m.totalDays + ' 天' },
      { k: '出行人数', v: m.travelers ? m.travelers + ' 人' : '待确认' },
      { k: '起点 / 终点', v: m.origin + ' → ' + m.destination, sm: true },
      { k: '主要途经城市', v: m.viaCities.join(' · '), sm: true },
      { k: '距出发', v: d == null ? '待确认' : (d > 0 ? d + ' 天' : (d === 0 ? '今天出发' : '已过期 ' + (-d) + ' 天')) },
      { k: '计划预算', v: m.plannedBudget ? '¥' + m.plannedBudget : '待确认' },
      { k: '交通段数', v: DATA.transports.length + ' 段' }
    ];
    var sg = $('#statGrid'); sg.innerHTML = '';
    stats.forEach(function (s) {
      sg.appendChild(el('div', 'stat',
        '<div class="k">' + esc(s.k) + '</div><div class="v' + (s.sm ? ' sm' : '') + '">' + esc(s.v) + '</div>'));
    });

    // 路线链
    var chain = [m.origin].concat(m.viaCities).concat([m.destination]);
    var rc = $('#routeChain'); rc.innerHTML = '';
    chain.forEach(function (c, i) {
      if (i > 0) rc.appendChild(el('span', 'route-arrow', '→'));
      rc.appendChild(el('span', 'route-node', esc(c)));
    });
    var ma = $('#overviewMapActions'); ma.innerHTML = '';
    ma.appendChild(el('a', null, '🗺 查看路线地图'));
    $('a', ma).setAttribute('href', '#map');
    ma.appendChild(el('a', null, '📅 购票日历'));
    $all('a', ma)[1].setAttribute('href', '#tickets');
    ma.appendChild(el('a', null, '✅ 待办清单'));
    $all('a', ma)[2].setAttribute('href', '#todos');

    // 夜宿
    var ns = $('#nightStrip'); ns.innerHTML = '';
    var nightMap = {};
    DATA.hotels.forEach(function (h) { h.nightDates.forEach(function (d) { nightMap[d] = h; }); });
    DATA.days.forEach(function (day) {
      var isNight = true;
      var hotel = nightMap[day.date];
      var text, type;
      if (hotel) { text = hotel.name; type = '酒店'; }
      else {
        var tr = (day.transportIds || []).map(function (id) { return DATA.transports.filter(function (t) { return t.id === id; })[0]; })
          .filter(function (t) { return t && /23:/.test(t.depTime || '') || (t && /2[0-3]:/.test(t.depTime || '')); })[0];
        if (day.id === 'day5') { text = '不入住（洛阳站候车）'; type = '候车'; }
        else if (tr) { text = '夜行列车：' + tr.from + ' → ' + tr.to; type = '车上'; }
        else { text = '—'; type = ''; }
      }
      if (!isNight) return;
      var row = el('div', 'night-row',
        '<div class="d">' + esc(day.date.slice(5).replace('-', '/')) + ' ' + esc(day.weekday) + '</div>' +
        '<div><div class="c">' + esc(text) + '</div><div class="t">' + esc(day.city) + (type ? ' · ' + type : '') + '</div></div>');
      ns.appendChild(row);
    });

    // 关键购票 + 最近待办
    var tickets = buildTickets().filter(function (t) { return t.status !== '不适用'; });
    var withSale = tickets.filter(function (t) { return t.saleDate; })
      .sort(function (a, b) { return a.saleDate < b.saleDate ? -1 : 1; });
    var upcoming = withSale.filter(function (t) { var n = daysFromToday(t.saleDate); return n != null && n >= -30; }).slice(0, 6);
    var kt = $('#overviewKeyTickets'); kt.innerHTML = '';
    if (!upcoming.length) {
      kt.appendChild(el('p', 'muted small', '暂无可推算开售日期的条目。'));
    } else {
      upcoming.forEach(function (t) {
        var n = daysFromToday(t.saleDate);
        var tag = n < 0 ? '<span class="st st-none">已开售 ' + (-n) + ' 天</span>'
                : (n <= 3 ? '<span class="st st-check">' + (n === 0 ? '今日开售' : n + ' 天后开售') + '</span>'
                          : '<span class="st st-buy">' + n + ' 天后开售</span>');
        kt.appendChild(el('div', 'tk' + (n >= 0 && n <= 3 ? ' urgent' : ''),
          '<div class="tk-top"><div><div class="tk-title">' + esc(t.title) + '</div>' +
          '<div class="tk-sub">' + esc(t.sub) + '</div></div>' + tag + '</div>' +
          '<div class="tk-grid">' +
            '<div><span>开售日期</span>' + esc(fmtDate(t.saleDate)) + '</div>' +
            '<div><span>开售时刻</span>' + esc(t.saleKnown ? t.saleTime : '待核实') + '</div>' +
            '<div><span>乘车/游览日</span>' + esc(fmtDate(t.travelDate)) + '</div>' +
            '<div><span>状态</span>' + statusPill(t.status) + '</div>' +
          '</div>'));
      });
    }
    var pending = DATA.todos.filter(function (t) { return !doneSet[t.id]; }).slice(0, 6);
    var pb = el('div', null, '<h3 style="font-size:14px;margin:14px 0 8px">最近的待办（未完成 ' + pending.length + ' 项）</h3>');
    pending.forEach(function (t) {
      pb.appendChild(el('div', 'todo',
        '<div class="body"><div class="ti">' + esc(t.title) + '</div>' +
        '<div class="meta"><span class="st st-info">' + esc(t.category) + '</span><span>' + esc(t.due) + '</span></div></div>'));
    });
    kt.appendChild(pb);

    // 进度
    var done = DATA.todos.filter(function (t) { return doneSet[t.id]; }).length;
    var pct = DATA.todos.length ? Math.round(done / DATA.todos.length * 100) : 0;
    $('#overviewProgress').innerHTML =
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<p class="muted small" style="margin-top:8px">待办完成 ' + done + ' / ' + DATA.todos.length + ' 项（' + pct + '%）。购票与预订状态：' +
      ['已购买', '待购买', '待核实', '暂未开放销售', '不适用'].map(function (s) {
        var c = tickets.concat(DATA.hotels.map(function (h) { return { status: h.status }; }))
          .filter(function (t) { return (t.status || '') === s; }).length;
        return s + ' ' + c;
      }).join(' · ') + '</p>';

    // 冲突
    var cf = $('#overviewConflicts'); cf.innerHTML = '';
    DATA.conflicts.forEach(function (c) {
      cf.appendChild(el('div', 'cf ' + c.level,
        '<div class="ct">' + (c.level === 'warning' ? '⚠️ ' : 'ℹ️ ') + esc(c.title) + '</div>' +
        '<div class="cd">' + esc(c.detail) + '</div>' +
        '<div class="cs"><b>建议：</b>' + esc(c.suggestion) + '</div>'));
    });

    // 数据说明
    $('#overviewMeta').innerHTML =
      '<p class="small"><b>年份推断：</b>' + esc(m.yearAssumption) + '</p>' +
      '<p class="small"><b>出行人数：</b>' + esc(m.travelersNote) + '</p>' +
      '<p class="small"><b>预算：</b>' + esc(m.budgetNote) + '</p>' +
      '<p class="small"><b>预售规则：</b>' + esc(m.presaleRule) + '</p>' +
      '<p class="small"><b>数据来源：</b>' + esc(m.sourceNote) + '</p>' +
      '<p class="small muted">最后核实日期：' + esc(m.lastVerified) + '</p>';
  }

  /* ======================= 渲染：每日行程 ======================= */
  var activeDay = null;
  function renderDayTabs() {
    var dt = $('#dayTabs'); dt.innerHTML = '';
    var ov = el('button', 'day-tab', '总览');
    ov.setAttribute('data-day', 'overview');
    if (activeDay === 'overview') ov.className = 'day-tab is-active';
    ov.addEventListener('click', function () { activeDay = 'overview'; renderDayTabs(); renderDayPanel(); });
    dt.appendChild(ov);
    DATA.days.forEach(function (d) {
      var b = el('button', 'day-tab' + (activeDay === d.id ? ' is-active' : ''), 'Day ' + d.index);
      b.setAttribute('data-day', d.id);
      b.addEventListener('click', function () { activeDay = d.id; renderDayTabs(); renderDayPanel(); });
      dt.appendChild(b);
    });
  }
  function findTransport(id) { return DATA.transports.filter(function (t) { return t.id === id; })[0]; }
  function findAttraction(id) { return DATA.attractions.filter(function (a) { return a.id === id; })[0]; }
  function findHotel(id) { return DATA.hotels.filter(function (h) { return h.id === id; })[0]; }

  function transportCard(t) {
    var alt = (t.altDepTime ? '　备选：' + t.altDepTime + ' → ' + t.altArrTime : '');
    return '<div class="tl-card">' +
      '<div class="tl-top"><span class="tl-time">' + esc(t.depTime) + '</span>' +
      '<span class="tl-title">' + esc(t.fromStation) + ' → ' + esc(t.toStation) + '</span>' +
      '<span class="st st-info">' + esc(t.type) + '</span></div>' +
      '<div class="tl-desc">车次：' + esc(t.trainNo) + '　席别：' + esc(t.seat) +
      (t.price != null ? '　¥' + t.price : '　金额待确认') + '　历时：' + esc(t.duration) + alt + '</div>' +
      '<div class="tl-desc">状态：' + statusPill(t.status) + ' ' + statusPill(t.verifyStatus) +
      '　开售：' + esc(fmtDate(t.saleDate)) + ' ' + esc(t.saleTime) + '</div>' +
      '<div class="tl-links">' +
        '<a href="' + esc(t.officialUrl) + '" target="_blank" rel="noopener">12306 官方购票</a>' +
        (t.queryUrl ? '<a href="' + esc(t.queryUrl) + '" target="_blank" rel="noopener">车次查询</a>' : '') +
        '<a href="' + MAP.amap(t.fromStation) + '" target="_blank" rel="noopener">出发站定位</a>' +
        '<a href="' + MAP.amap(t.toStation) + '" target="_blank" rel="noopener">到达站定位</a>' +
      '</div></div>';
  }
  function attractionCard(a) {
    var h = '<div class="tl-card">' +
      '<div class="tl-top"><span class="tl-title">' + esc(a.name) + '</span>' +
      '<span class="st st-purple">' + esc(a.city) + '</span>' + statusPill(a.status) + '</div>' +
      '<div class="tl-desc">' + esc(a.ticketPrice) + '</div>' +
      '<div class="tl-desc">开放：' + esc(a.openHours) + '　' + (a.needReservation ? '需提前预约' : '无需预约') + '</div>' +
      '<div class="tl-desc">预约/购票：' + esc(a.bookingRule) + '</div>' +
      '<div class="tl-desc">官方入口：' + esc(a.officialChannel) + '　' + statusPill(a.verifyStatus) + '</div>';
    if (a.extraTransports && a.extraTransports.length) {
      a.extraTransports.forEach(function (x) {
        h += '<div class="tl-desc">🚌 ' + esc(x.name) + '：' + esc(x.price) +
             (x.included ? '（已含）' : '（需另购）') + '｜' + esc(x.booking) +
             (x.operatingHours ? '｜运营 ' + esc(x.operatingHours) : '') + '</div>';
      });
    }
    h += '<div class="tl-links">' +
      '<a href="' + esc(a.officialUrl) + '" target="_blank" rel="noopener">官方入口 / 规则来源</a>' +
      '<a href="' + MAP.amap(a.name) + '" target="_blank" rel="noopener">地图定位</a>' +
      '<a href="' + MAP.baidu(a.name) + '" target="_blank" rel="noopener">百度定位</a>' +
      '</div></div>';
    return h;
  }
  function hotelCard(h) {
    return '<div class="tl-card">' +
      '<div class="tl-top"><span class="tl-title">' + esc(h.name) + '</span>' + statusPill(h.status) + '</div>' +
      '<div class="tl-desc">' + esc(h.city) + '　' + esc(h.address) + '</div>' +
      '<div class="tl-desc">入住 ' + esc(fmtDateFull(h.checkIn)) + '　退房 ' + esc(fmtDateFull(h.checkOut)) +
      '　共 ' + h.nights + ' 晚' + (h.price != null ? '　¥' + h.price + '/晚' : '　金额待确认') + '</div>' +
      '<div class="tl-links">' +
        '<a href="' + esc(h.bookingUrl) + '" target="_blank" rel="noopener">酒店预订平台</a>' +
        '<a href="' + MAP.amap(h.mapQuery || h.name) + '" target="_blank" rel="noopener">高德定位</a>' +
        '<a href="' + MAP.baidu(h.mapQuery || h.name) + '" target="_blank" rel="noopener">百度定位</a>' +
      '</div></div>';
  }
  function renderDayPanel() {
    var p = $('#dayPanel'); p.innerHTML = '';
    if (activeDay === 'overview' || !activeDay) {
      p.appendChild(el('div', 'card',
        '<h2>每日行程总览</h2><p class="muted small">点击上方 Day 1—Day 15 标签查看每天的完整时间轴；也可在总览页查看全程概览。</p>'));
      DATA.days.forEach(function (d) {
        var card = el('div', 'card');
        card.innerHTML =
          '<div class="day-head"><div><div class="t">Day ' + d.index + '　' + esc(d.city) + '</div>' +
          '<div class="c">' + esc(fmtDateFull(d.date)) + ' ' + esc(d.weekday) + '　·　' + esc(d.theme) + '</div></div>' +
          '<span class="badge day">' + d.items.length + ' 个节点</span></div>' +
          '<div class="map-actions"><button class="btn btn-ghost" data-goto="' + d.id + '">查看当天详情</button></div>';
        p.appendChild(card);
      });
      $all('button[data-goto]', p).forEach(function (b) {
        b.addEventListener('click', function () {
          activeDay = b.getAttribute('data-goto'); renderDayTabs(); renderDayPanel();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
      return;
    }
    var day = DATA.days.filter(function (d) { return d.id === activeDay; })[0];
    if (!day) return;
    var card = el('div', 'card');
    var head = '<div class="day-head"><div>' +
      '<div class="t">Day ' + day.index + '　' + esc(day.city) + '</div>' +
      '<div class="c">' + esc(fmtDateFull(day.date)) + ' ' + esc(day.weekday) + '　·　' + esc(day.theme) + '</div></div>' +
      '<span class="badge day">' + esc(day.date) + '</span></div>';
    head += '<div class="day-meta">' +
      '<div><span>起床</span>' + esc(day.wakeUp || '—') + '</div>' +
      '<div><span>早餐</span>' + esc(day.breakfast || '—') + '</div>' +
      '<div><span>退房</span>' + esc(day.checkout || '—') + '</div>' +
      '<div><span>住宿</span>' + (day.hotelId && findHotel(day.hotelId) ? esc(findHotel(day.hotelId).name) : '无（见说明）') + '</div>' +
      '</div>';
    card.innerHTML = head;

    var tl = el('div', 'timeline');
    day.items.forEach(function (it) {
      var wrap = el('div', 'tl-item t-' + it.type);
      var inner = '<div class="tl-card">' +
        '<div class="tl-top"><span class="tl-time">' + esc(it.time) + '</span>' +
        '<span class="tl-title">' + esc(it.title) + '</span></div>' +
        (it.desc ? '<div class="tl-desc">' + esc(it.desc) + '</div>' : '');
      if (it.ref) {
        var t = findTransport(it.ref);
        var a = findAttraction(it.ref);
        var hh = findHotel(it.ref);
        if (t) {
          inner += '<div class="tl-desc">车次 ' + esc(t.trainNo) + '　' + esc(t.seat) + '　' + (t.price != null ? '¥' + t.price : '金额待确认') +
                   '　开售 ' + esc(fmtDate(t.saleDate)) + ' ' + esc(t.saleTime) + '</div>' +
                   '<div class="tl-links"><a href="' + esc(t.officialUrl) + '" target="_blank" rel="noopener">12306 购票入口</a></div>';
        } else if (a) {
          inner += '<div class="tl-desc">' + esc(a.ticketPrice) + '</div>' +
                   '<div class="tl-links"><a href="' + esc(a.officialUrl) + '" target="_blank" rel="noopener">官方购票/预约入口</a>' +
                   '<a href="' + MAP.amap(a.name) + '" target="_blank" rel="noopener">地图定位</a></div>';
        } else if (hh) {
          inner += '<div class="tl-links"><a href="' + esc(hh.bookingUrl) + '" target="_blank" rel="noopener">预订平台</a>' +
                   '<a href="' + MAP.amap(hh.mapQuery || hh.name) + '" target="_blank" rel="noopener">地图定位</a></div>';
        }
      }
      inner += '</div>';
      wrap.innerHTML = inner;
      tl.appendChild(wrap);
    });
    card.appendChild(tl);

    // 当天路线导航
    if (day.mapRoute) {
      var nav = el('div', 'card', '<h2>当天路线导航</h2>' +
        '<p class="muted small">' + esc(day.mapRoute.label) + '</p>' +
        routeLinks(day.mapRoute.from, day.mapRoute.to, day.mapRoute.mode));
      card.appendChild(nav);
    }
    // 当天待办
    var td = DATA.todos.filter(function (t) { return t.dayId === day.id; });
    if (td.length) {
      var tdc = el('div', 'card', '<h2>当天待办</h2>');
      td.forEach(function (t) {
        var d = el('div', 'todo' + (doneSet[t.id] ? ' done' : ''));
        d.innerHTML = '<input type="checkbox"' + (doneSet[t.id] ? ' checked' : '') + '>' +
          '<div class="body"><div class="ti">' + esc(t.title) + '</div>' +
          '<div class="meta"><span class="st st-info">' + esc(t.category) + '</span><span>' + esc(t.due) + '</span></div></div>';
        $('input', d).addEventListener('change', function (e) {
          if (e.target.checked) doneSet[t.id] = true; else delete doneSet[t.id];
          saveDone(); d.className = 'todo' + (e.target.checked ? ' done' : '');
          renderHeader(); renderTodoProgress();
        });
        tdc.appendChild(d);
      });
      card.appendChild(tdc);
    }
    p.appendChild(card);
    p.appendChild(el('div', 'card', '<h2>快速跳转</h2><div class="map-actions" id="dayQuick"></div>'));
    var q = $('#dayQuick');
    if (day.index > 1) { var prev = el('button', 'btn btn-ghost', '← Day ' + (day.index - 1)); prev.addEventListener('click', function () { activeDay = 'day' + (day.index - 1); renderDayTabs(); renderDayPanel(); window.scrollTo({ top: 0, behavior: 'smooth' }); }); q.appendChild(prev); }
    if (day.index < DATA.meta.totalDays) { var next = el('button', 'btn btn-ghost', 'Day ' + (day.index + 1) + ' →'); next.addEventListener('click', function () { activeDay = 'day' + (day.index + 1); renderDayTabs(); renderDayPanel(); window.scrollTo({ top: 0, behavior: 'smooth' }); }); q.appendChild(next); }
  }

  /* ======================= 渲染：路线地图 ======================= */
  function renderMap() {
    // 每天路线
    var dr = $('#mapDayRoutes'); dr.innerHTML = '';
    DATA.days.forEach(function (d) {
      if (!d.mapRoute) return;
      var item = el('div', 'map-list-item',
        '<div><div class="n">Day ' + d.index + '　' + esc(d.mapRoute.label) + '</div>' +
        '<div class="s">' + esc(fmtDate(d.date)) + ' ' + esc(d.weekday) + '　' + esc(d.city) + '</div></div>' +
        '<div class="map-actions">' +
          '<a href="' + MAP.amapRoute(d.mapRoute.from, d.mapRoute.to, d.mapRoute.mode) + '" target="_blank" rel="noopener">高德导航</a>' +
          '<a href="' + MAP.baiduRoute(d.mapRoute.from, d.mapRoute.to) + '" target="_blank" rel="noopener">百度导航</a>' +
        '</div>');
      dr.appendChild(item);
    });

    // 全部地点
    var mp = $('#mapPlaces'); mp.innerHTML = '';
    var places = [];
    DATA.hotels.forEach(function (h) { places.push({ n: h.name, s: h.city + ' · 酒店', q: h.mapQuery || h.name }); });
    DATA.attractions.forEach(function (a) { places.push({ n: a.name, s: a.city + ' · 景点', q: a.name }); });
    DATA.transports.forEach(function (t) {
      places.push({ n: t.fromStation, s: t.from + ' · 车站', q: t.fromStation });
      places.push({ n: t.toStation, s: t.to + ' · 车站', q: t.toStation });
    });
    var seen = {};
    places.forEach(function (p) {
      if (seen[p.q]) return; seen[p.q] = 1;
      var item = el('div', 'map-list-item',
        '<div><div class="n">' + esc(p.n) + '</div><div class="s">' + esc(p.s) + '</div></div>' +
        '<div class="map-actions">' +
          '<a href="' + MAP.amap(p.q) + '" target="_blank" rel="noopener">高德</a>' +
          '<a href="' + MAP.baidu(p.q) + '" target="_blank" rel="noopener">百度</a>' +
          '<a href="' + MAP.qq(p.q) + '" target="_blank" rel="noopener">腾讯</a>' +
        '</div>');
      mp.appendChild(item);
    });

    // 供应商快捷入口
    var pa = $('#mapProviderActions'); pa.innerHTML = '';
    pa.appendChild(el('a', null, '高德地图 · 全程路线'));
    $('a', pa).setAttribute('href', MAP.amapRoute('长沙站', '郑州站', 'car'));
    $('a', pa).setAttribute('target', '_blank'); $('a', pa).setAttribute('rel', 'noopener');

    initTencentMap();
  }

  /* -------- 腾讯地图 GL JS（默认代理模式，失败自动降级） -------- */
  function initTencentMap() {
    var box = $('#tmapBox'), fb = $('#tmapFallback');
    if (!box) return;
    var fallback = function (msg) {
      var w = $('#tmapWrap'); if (w) w.classList.add('hidden');
      fb.classList.remove('hidden');
      fb.innerHTML = msg;
    };
    window._TMapSecurityConfig = {
      serviceHost: 'http://127.0.0.1:__WB_HTTP_PORT__/_TMapService/_wbt/__WB_TMAP_SECRET__'
    };
    var s = document.createElement('script');
    s.src = 'https://map.qq.com/api/gljs?v=1.exp';
    var done = false;
    s.onload = function () {
      try {
        if (!window.TMap) { fallback('腾讯地图组件未能加载，已自动切换为地图链接模式（下方所有地点与路线均可点击打开高德 / 百度 / 腾讯地图）。'); return; }
        var map = new TMap.Map('tmapBox', { zoom: 5, center: new TMap.LatLng(34.34, 108.94) });
        var pts = [
          { id: 'cs', name: '长沙', pos: new TMap.LatLng(28.2282, 112.9388) },
          { id: 'zz', name: '郑州', pos: new TMap.LatLng(34.7466, 113.6254) },
          { id: 'ly', name: '洛阳', pos: new TMap.LatLng(34.6197, 112.4540) },
          { id: 'xa', name: '西安', pos: new TMap.LatLng(34.3416, 108.9398) },
          { id: 'zy', name: '张掖', pos: new TMap.LatLng(38.9257, 100.4498) },
          { id: 'lz', name: '兰州', pos: new TMap.LatLng(36.0611, 103.8343) }
        ];
        new TMap.MultiMarker({
          map: map,
          styles: { d: new TMap.MarkerStyle({ width: 18, height: 26 }) },
          geometries: pts.map(function (p) { return { id: p.id, styleId: 'd', position: p.pos }; })
        });
        new TMap.MultiPolyline({
          map: map,
          styles: { l: new TMap.PolylineStyle({ color: '#0f6fff', width: 4, borderWidth: 1, borderColor: '#ffffff' }) },
          geometries: [{
            id: 'route', styleId: 'l',
            paths: [pts[0].pos, pts[1].pos, pts[2].pos, pts[3].pos, pts[4].pos, pts[5].pos, pts[3].pos, pts[0].pos]
          }]
        });
        done = true;
      } catch (e) {
        fallback('腾讯地图组件初始化失败（当前环境可能无法访问地图服务代理），已自动切换为地图链接模式。');
      }
    };
    s.onerror = function () { fallback('腾讯地图组件加载失败，已自动切换为地图链接模式。'); };
    document.head.appendChild(s);
    setTimeout(function () {
      if (!done) fallback('腾讯地图组件在当前环境不可用（代理未生效），已自动切换为地图链接模式。下方所有地点与路线链接均可正常打开高德 / 百度 / 腾讯地图。');
    }, 6000);
  }

  /* ======================= 渲染：购票日历 ======================= */
  var ticketFilter = '全部';
  function renderTicketFilters() {
    var cats = ['全部', '交通', '景点门票', '观光车', '住宿', '待确认', '已购买'];
    var f = $('#ticketFilters'); f.innerHTML = '';
    cats.forEach(function (c) {
      var b = el('button', 'chip' + (ticketFilter === c ? ' is-active' : ''), esc(c));
      b.addEventListener('click', function () { ticketFilter = c; renderTicketFilters(); renderTicketList(); });
      f.appendChild(b);
    });
  }
  function renderTicketList() {
    var list = buildTickets();
    if (ticketFilter === '待确认') list = list.filter(function (t) { return /待核实|待确认|待官方确认/.test(t.verifyStatus || '') || /待核实|待确认/.test(t.saleTime || ''); });
    else if (ticketFilter === '已购买') list = list.filter(function (t) { return /已购买/.test(t.status || ''); });
    else if (ticketFilter !== '全部') list = list.filter(function (t) { return t.cat === ticketFilter; });

    var box = $('#ticketList'); box.innerHTML = '';
    if (!list.length) { box.appendChild(el('p', 'muted small', '当前筛选条件下没有条目。')); return; }
    list.forEach(function (t) {
      var n = daysFromToday(t.saleDate);
      var cls = 'tk';
      if (n != null && n >= 0 && n <= 3 && !/已购买/.test(t.status)) cls += ' urgent';
      else if (n != null && n > 3 && n <= 7 && !/已购买/.test(t.status)) cls += ' soon';
      var card = el('div', cls);
      var saleTxt = t.saleDate ? (fmtDate(t.saleDate) + '　' + (t.saleKnown ? t.saleTime : '<span class="st st-check">时刻待核实</span>')) : '待核实';
      var h = '<div class="tk-top"><div>' +
        '<div class="tk-title">' + esc(t.title) + '</div>' +
        '<div class="tk-sub">' + esc(t.sub) + '</div></div>' +
        '<div style="text-align:right">' + statusPill(t.status) + '<br>' + statusPill(t.verifyStatus) + '</div></div>' +
        '<div class="tk-grid">' +
          '<div><span>类别</span>' + esc(t.kind) + '</div>' +
          '<div><span>乘车 / 游览日</span>' + esc(fmtDate(t.travelDate)) + '</div>' +
          '<div><span>开售日期</span>' + esc(t.saleDate ? fmtDate(t.saleDate) : '待核实') + '</div>' +
          '<div><span>开售时刻</span>' + (t.saleKnown ? esc(t.saleTime) : (t.saleTime ? esc(t.saleTime) : '<span class="st st-check">待核实</span>')) + '</div>' +
          '<div><span>是否需要预约</span>' + (t.needReservation ? '需要' : '不需要') + '</div>' +
          '<div><span>建议关注日</span>' + esc(t.reminderDate ? fmtDate(t.reminderDate) : '—') + '</div>' +
        '</div>';
      h += '<div class="tk-links">';
      if (t.officialUrl) h += '<a href="' + esc(t.officialUrl) + '" target="_blank" rel="noopener">官方购票 / 预约入口</a>';
      (t.extraUrls || []).forEach(function (u) { h += '<a href="' + esc(u.url) + '" target="_blank" rel="noopener">' + esc(u.label) + '</a>'; });
      if (t.source && t.source.url) h += '<a href="' + esc(t.source.url) + '" target="_blank" rel="noopener">来源 / 公告</a>';
      h += '</div>';
      h += '<div class="tk-note">' + esc(t.note || '') +
        (t.source ? '<br>来源：' + esc(t.source.name) + '（核实日期 ' + esc(t.source.date) + '）' : '') + '</div>';
      card.innerHTML = h;
      box.appendChild(card);
    });
  }
  function renderSaleTimeTable() {
    var t = '<table class="sale"><thead><tr><th>车站</th><th>起售时刻</th><th>核实状态</th><th>来源</th></tr></thead><tbody>';
    DATA.stationSaleTimes.forEach(function (s) {
      t += '<tr><td>' + esc(s.station) + '</td><td><b>' + esc(s.time) + '</b></td><td>' + statusPill(s.verifyStatus) + '</td><td class="muted">' + esc(s.source) + '</td></tr>';
    });
    t += '</tbody></table><p class="muted small" style="margin-top:8px">官方查询入口：<a href="https://kyfw.12306.cn/index/view/infos/sale_time.html" target="_blank" rel="noopener">12306 起售时间查询</a>　|　<a href="https://mobile.12306.cn/weixin/wxcore/ysqcx" target="_blank" rel="noopener">12306 预售期查询</a></p>';
    $('#saleTimeTable').innerHTML = t;
  }

  /* ======================= 渲染：住宿 ======================= */
  function renderHotels() {
    var box = $('#hotelList'); box.innerHTML = '';
    DATA.hotels.forEach(function (h) {
      var card = el('div', 'hotel');
      card.innerHTML =
        '<div class="hotel-top"><div><div class="hotel-name">' + esc(h.name) + '</div>' +
        '<div class="tk-sub">' + esc(h.city) + '</div></div>' + statusPill(h.status) + '</div>' +
        '<div class="hotel-grid">' +
          '<div><span>详细地址</span>' + esc(h.address) + '</div>' +
          '<div><span>入住 → 退房</span>' + esc(fmtDateFull(h.checkIn)) + ' → ' + esc(fmtDateFull(h.checkOut)) + '</div>' +
          '<div><span>连续入住</span>' + h.nights + ' 晚（' + h.nightDates.map(fmtDate).join('、') + '）</div>' +
          '<div><span>价格</span>' + (h.price != null ? '¥' + h.price + '（' + esc(h.priceNote) + '）' : esc(h.priceNote)) + '</div>' +
        '</div>' +
        '<div class="tk-note">' + esc(h.note) + '</div>' +
        '<div class="tl-links">' +
          '<a href="' + esc(h.bookingUrl) + '" target="_blank" rel="noopener">预订平台</a>' +
          '<a href="' + MAP.amap(h.mapQuery || h.name) + '" target="_blank" rel="noopener">高德导航</a>' +
          '<a href="' + MAP.baidu(h.mapQuery || h.name) + '" target="_blank" rel="noopener">百度导航</a>' +
          '<a href="' + MAP.qq(h.mapQuery || h.name) + '" target="_blank" rel="noopener">腾讯地图</a>' +
        '</div>';
      box.appendChild(card);
    });
  }

  /* ======================= 渲染：待办 ======================= */
  var todoFilter = '全部';
  function renderTodoFilters() {
    var cats = ['全部', '交通', '景点门票', '景点预约', '观光车', '酒店预订', '交通衔接', '出行准备'];
    var f = $('#todoFilters'); f.innerHTML = '';
    cats.forEach(function (c) {
      var b = el('button', 'chip' + (todoFilter === c ? ' is-active' : ''), esc(c));
      b.addEventListener('click', function () { todoFilter = c; renderTodoFilters(); renderTodoList(); });
      f.appendChild(b);
    });
  }
  function renderTodoProgress() {
    var done = DATA.todos.filter(function (t) { return doneSet[t.id]; }).length;
    var pct = DATA.todos.length ? Math.round(done / DATA.todos.length * 100) : 0;
    var box = $('#todoProgress');
    if (!box) return;
    box.innerHTML = '<div class="lbl">已完成 ' + done + ' / ' + DATA.todos.length + ' 项（' + pct + '%）</div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>';
  }
  function renderTodoList() {
    var list = DATA.todos.slice();
    if (todoFilter !== '全部') list = list.filter(function (t) { return t.category === todoFilter; });
    var box = $('#todoList'); box.innerHTML = '';
    if (!list.length) { box.appendChild(el('p', 'muted small', '当前筛选条件下没有待办。')); return; }
    list.forEach(function (t) {
      var day = DATA.days.filter(function (d) { return d.id === t.dayId; })[0];
      var d = el('div', 'todo' + (doneSet[t.id] ? ' done' : ''));
      d.innerHTML = '<input type="checkbox"' + (doneSet[t.id] ? ' checked' : '') + ' aria-label="' + esc(t.title) + '">' +
        '<div class="body"><div class="ti">' + esc(t.title) + '</div>' +
        '<div class="meta"><span class="st st-info">' + esc(t.category) + '</span>' +
        '<span>截止 / 关注：' + esc(t.due) + '</span>' +
        (day ? '<span>' + esc(fmtDate(day.date)) + ' ' + esc(day.city) + '</span>' : '') + '</div></div>';
      $('input', d).addEventListener('change', function (e) {
        if (e.target.checked) doneSet[t.id] = true; else delete doneSet[t.id];
        saveDone(); d.className = 'todo' + (e.target.checked ? ' done' : '');
        renderTodoProgress(); renderHeader(); renderOverview();
      });
      box.appendChild(d);
    });
  }

  /* ======================= 导出 ======================= */
  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function exportJson() {
    download('itinerary.json', JSON.stringify(DATA, null, 2), 'application/json;charset=utf-8');
  }
  function icsEscape(s) { return String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }
  function dtStamp(dateStr, timeStr) {
    var d = parseDate(dateStr); if (!d) return null;
    var hh = '09', mm = '00';
    if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) { var p = timeStr.split(':'); hh = pad(+p[0]); mm = p[1]; }
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + hh + mm + '00';
  }
  function exportIcs() {
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//travel-plan//CN', 'CALSCALE:GREGORIAN',
      'X-WR-CALNAME:' + icsEscape(DATA.meta.title), 'X-WR-TIMEZONE:Asia/Shanghai'
    ];
    var uid = 0;
    function push(summary, dateStr, timeStr, desc, durMin) {
      var dt = dtStamp(dateStr, timeStr); if (!dt) return;
      var end = dt; // 1 小时事件
      var d = parseDate(dateStr);
      var hh = +dt.slice(9, 11), mm = +dt.slice(11, 13);
      var e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm + (durMin || 60));
      end = e.getFullYear() + pad(e.getMonth() + 1) + pad(e.getDate()) + 'T' + pad(e.getHours()) + pad(e.getMinutes()) + '00';
      uid++;
      lines.push('BEGIN:VEVENT',
        'UID:travel-' + uid + '@travel-plan',
        'DTSTAMP:' + dt + 'Z',
        'DTSTART;TZID=Asia/Shanghai:' + dt,
        'DTEND;TZID=Asia/Shanghai:' + end,
        'SUMMARY:' + icsEscape(summary),
        'DESCRIPTION:' + icsEscape(desc),
        'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(summary), 'END:VALARM',
        'END:VEVENT');
    }
    buildTickets().forEach(function (t) {
      if (t.status === '不适用') return;
      if (t.saleDate && t.saleKnown) {
        push('【购票提醒】' + t.title + ' 开售', t.saleDate, t.saleTime,
          '开售时刻：' + t.saleTime + '（北京时间）\n乘车/游览日：' + t.travelDate + '\n官方入口：' + (t.officialUrl || '') + '\n' + (t.note || ''), 30);
      } else if (t.reminderDate) {
        push('【准备】' + t.title, t.reminderDate, t.reminderTime || '09:00',
          '开售时刻待核实，请前往 12306 / 官方渠道确认。\n' + (t.note || ''), 30);
      }
    });
    DATA.transports.forEach(function (t) {
      push('【乘车】' + t.fromStation + ' → ' + t.toStation + ' ' + (t.trainNo || ''), t.date, t.depTime,
        '席别：' + t.seat + '　历时：' + t.duration + '\n状态：' + t.status, 120);
    });
    lines.push('END:VCALENDAR');
    download('travel-reminders.ics', lines.join('\r\n'), 'text/calendar;charset=utf-8');
  }

  /* ======================= 路由 / 初始化 ======================= */
  function showView(name) {
    $all('.view').forEach(function (v) { v.hidden = true; });
    var v = $('#view-' + name); if (v) v.hidden = false;
    $all('.tab').forEach(function (t) { t.classList.toggle('is-active', t.getAttribute('data-view') === name); });
    if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function initTabs() {
    $all('.tab').forEach(function (b) {
      b.addEventListener('click', function () { showView(b.getAttribute('data-view')); });
    });
    $all('#overviewMapActions a, #overviewMapActions button').forEach(function (a) {
      var h = (a.getAttribute('href') || '').replace('#', '');
      if (h) a.addEventListener('click', function (e) { e.preventDefault(); showView(h); });
    });
    window.addEventListener('hashchange', function () {
      var n = (location.hash || '#overview').replace('#', '');
      if ($('#view-' + n)) showView(n);
    });
  }

  /* 兼容没有 fetch 的环境（老浏览器 / 部分内置 WebView） */
  function loadData(url) {
    if (typeof window.fetch === 'function') {
      return window.fetch(url, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch (e) { reject(new Error('JSON 解析失败：' + e.message)); }
        } else {
          reject(new Error('HTTP ' + xhr.status));
        }
      };
      xhr.onerror = function () { reject(new Error('网络请求失败')); };
      xhr.send();
    });
  }

  function boot() {
    loadData('data/itinerary.json')
      .then(function (json) {
        DATA = json;
        $('#loading').classList.add('hidden');
        renderHeader();
        renderOverview();
        activeDay = 'overview';
        renderDayTabs(); renderDayPanel();
        renderMap();
        renderTicketFilters(); renderTicketList(); renderSaleTimeTable();
        renderHotels();
        renderTodoFilters(); renderTodoProgress(); renderTodoList();
        $('#exportJson').addEventListener('click', exportJson);
        $('#exportIcs').addEventListener('click', exportIcs);
        $('#printPage').addEventListener('click', function () { window.print(); });
        $('#resetTodos').addEventListener('click', function () {
          if (confirm('确定清除全部已勾选的待办状态吗？')) { doneSet = {}; saveDone(); renderTodoList(); renderTodoProgress(); renderOverview(); renderHeader(); }
        });
        $('#icsNote').textContent = '说明：本网站是静态页面，无法在关闭后主动推送手机通知。请使用「购票提醒日历（ICS）」导入系统日历，或使用页面上方的购票日历清单自行设置提醒。';
        initTabs();
        var start = (location.hash || '#overview').replace('#', '');
        showView($('#view-' + start) ? start : 'overview');
      })
      .catch(function (e) {
        $('#loading').classList.add('hidden');
        var box = $('#loadError');
        box.classList.remove('hidden');
        box.innerHTML = '<b>行程数据加载失败</b>（' + esc(e.message) + '）。<br>' +
          '如果你是直接用浏览器打开本地 <code>index.html</code>，浏览器会因安全策略拦截读取 <code>data/itinerary.json</code>。<br>' +
          '请在本目录下启动一个本地服务器后再访问，例如：<br><code>python -m http.server 8080</code>，然后打开 <code>http://localhost:8080/</code>。';
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
