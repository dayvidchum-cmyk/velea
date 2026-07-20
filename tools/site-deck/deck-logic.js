(function () {
  var PW = 1440, PH = 810;
  var deck = document.getElementById('deck');
  var toast = document.getElementById('toast');
  var KEY = 'velea-deck-notes-v2';
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { saved = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }
  function show(m) { toast.textContent = m; toast.classList.add('show'); setTimeout(function () { toast.classList.remove('show'); }, 1800); }

  // ── Shared assets: decoded ONCE, reused by every page ──
  var assetMap = {};
  (function () {
    var raw = JSON.parse(document.getElementById('deck-assets').textContent);
    Object.keys(raw).forEach(function (path) {
      var bin = atob(raw[path].b);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      assetMap[path] = URL.createObjectURL(new Blob([arr], { type: raw[path].m }));
    });
  })();

  var index = JSON.parse(document.getElementById('deck-index').textContent);
  var paths = Object.keys(assetMap).sort(function (a, b) { return b.length - a.length; });

  function pageUrl(i) {
    var src = document.getElementById('src-' + i).textContent;
    for (var k = 0; k < paths.length; k++) src = src.split(paths[k]).join(assetMap[paths[k]]);
    return URL.createObjectURL(new Blob([src], { type: 'text/html;charset=utf-8' }));
  }

  var probe = document.createElement('iframe');
  probe.style.cssText = 'position:fixed;left:-99999px;top:0;width:' + PW + 'px;height:' + PH + 'px;border:0;visibility:hidden';
  document.body.appendChild(probe);

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var host = en.target;
      if (host.dataset.loaded) return;
      host.dataset.loaded = '1';
      var f = document.createElement('iframe');
      f.className = 'shot';
      f.setAttribute('scrolling', 'no');
      f.setAttribute('tabindex', '-1');
      f.setAttribute('aria-hidden', 'true');
      f.src = host.dataset.url;
      // Scale at creation: frames are added lazily, long after the last fit(),
      // so a shot that waits for one renders at full 1440 and gets clipped.
      scaleShot(host, f);
      f.addEventListener('load', function () {
        scaleShot(host, f);
        var off = +host.dataset.off;
        try { f.contentWindow.scrollTo(0, off); } catch (e) {}
        setTimeout(function () { try { f.contentWindow.scrollTo(0, off); } catch (e) {} }, 600);
        var ph = host.querySelector('.ph');
        if (ph) ph.remove();
      });
      host.appendChild(f);
      io.unobserve(host);
    });
  }, { rootMargin: '1200px 0px' });

  // ── Measure one page at 1440 wide, then cut it into 810px landscape screens ──
  function measurePage(i) {
    return new Promise(function (resolve) {
      var url = pageUrl(i), done = false, tries = 0, poll;
      function finish() {
        if (done) return;
        var d;
        try { d = probe.contentDocument; } catch (e) {
          done = true; clearInterval(poll); return resolve({ url: url, total: PH, err: 1 });
        }
        if (!d || !d.body) return;
        var h = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight);
        if (h <= PH && tries < 25) return;
        done = true; clearInterval(poll);
        resolve({ url: url, total: h });
      }
      probe.addEventListener('load', function onl() {
        probe.removeEventListener('load', onl);
        var w = probe.contentWindow;
        var ready = w && w.document && w.document.fonts ? w.document.fonts.ready : Promise.resolve();
        Promise.resolve(ready).then(function () { setTimeout(finish, 400); });
      });
      poll = setInterval(function () {
        tries++;
        try {
          var d = probe.contentDocument;
          if (d && d.readyState === 'complete') finish();
        } catch (e) {}
        if (tries > 60 && !done) { done = true; clearInterval(poll); resolve({ url: url, total: PH, err: 1 }); }
      }, 150);
      probe.src = url;
    });
  }

  function renderPage(meta, i, info) {
    var pages = Math.max(1, Math.ceil(info.total / PH));

    var head = document.createElement('div');
    head.className = 'route';
    head.innerHTML = '<span class="rpath">velealor.com' + (meta.route === '/' ? '/' : meta.route) + '</span>' +
                     '<span class="rname">' + meta.title + '</span>' +
                     '<span class="rmeta">' + pages + (pages === 1 ? ' screen' : ' screens') + ' &middot; ' + info.total + 'px tall</span>';
    deck.appendChild(head);

    if (info.err) {
      var warn = document.createElement('p');
      warn.className = 'warn';
      warn.textContent = 'This page could not be measured in this browser. Tell me and I will send it as a file.';
      deck.appendChild(warn);
      return;
    }

    for (var n = 0; n < pages; n++) {
      var id = 'r' + i + 'p' + n;
      var page = document.createElement('div');
      page.className = 'page';

      var lab = document.createElement('div');
      lab.className = 'plabel';
      lab.innerHTML = '<span class="pnum">' + (n + 1) + ' / ' + pages + '</span>';
      page.appendChild(lab);

      var frame = document.createElement('div');
      frame.className = 'frame';
      frame.dataset.off = n * PH;
      frame.dataset.url = info.url;
      frame.innerHTML = '<div class="ph">loading</div>';
      page.appendChild(frame);

      var ta = document.createElement('textarea');
      ta.id = 'n-' + id;
      ta.placeholder = 'Notes on this screen...';
      ta.dataset.page = meta.title + ' (' + meta.route + ') - screen ' + (n + 1) + ' of ' + pages;
      if (saved[ta.id]) ta.value = saved[ta.id];
      page.appendChild(ta);

      deck.appendChild(page);
      io.observe(frame);

      (function (ta, page) {
        function sync() {
          saved[ta.id] = ta.value;
          page.dataset.marked = ta.value.trim() ? '1' : '';
          ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px';
          save();
        }
        ta.addEventListener('input', sync);
        page.dataset.marked = ta.value.trim() ? '1' : '';
        ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px';
      })(ta, page);
    }
  }

  (function run() {
    var i = 0, totalScreens = 0;
    function next() {
      if (i >= index.length) {
        document.getElementById('count').textContent = index.length + ' routes &middot; ' + totalScreens + ' screens';
        document.getElementById('count').innerHTML = index.length + ' routes &middot; ' + totalScreens + ' screens';
        fit();
        return;
      }
      var meta = index[i];
      measurePage(i).then(function (info) {
        totalScreens += Math.max(1, Math.ceil(info.total / PH));
        renderPage(meta, i, info);
        fit();
        i++;
        setTimeout(next, 60);
      });
    }
    next();
  })();

  function scaleShot(host, shot) {
    var w = host.clientWidth || host.parentElement.clientWidth;
    if (!w) return;
    shot.style.transform = 'scale(' + (w / PW) + ')';
  }

  function fit() {
    var frames = document.querySelectorAll('.frame');
    for (var i = 0; i < frames.length; i++) {
      var w = frames[i].clientWidth || frames[i].parentElement.clientWidth;
      if (!w) continue;
      var s = w / PW;
      frames[i].style.height = Math.round(PH * s) + 'px';
      var shot = frames[i].querySelector('.shot');
      if (shot) shot.style.transform = 'scale(' + s + ')';
    }
  }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fit, 120); });

  var notesBtn = document.getElementById('toggle-notes');
  notesBtn.addEventListener('click', function () {
    var on = notesBtn.getAttribute('aria-pressed') !== 'true';
    notesBtn.setAttribute('aria-pressed', String(on));
    document.querySelectorAll('#deck textarea').forEach(function (t) { t.style.display = on ? '' : 'none'; });
  });

  var markedBtn = document.getElementById('only-marked');
  markedBtn.addEventListener('click', function () {
    var on = markedBtn.getAttribute('aria-pressed') !== 'true';
    markedBtn.setAttribute('aria-pressed', String(on));
    document.querySelectorAll('.page').forEach(function (p) {
      p.style.display = (on && !p.dataset.marked) ? 'none' : '';
    });
    fit();
  });

  document.getElementById('copy').addEventListener('click', function () {
    var out = [];
    document.querySelectorAll('#deck textarea').forEach(function (t) {
      if (t.value.trim()) out.push('## ' + t.dataset.page + '\n' + t.value.trim());
    });
    var text = out.length ? "David's notes - velealor.com deck\n\n" + out.join('\n\n') : 'No notes written yet.';
    navigator.clipboard.writeText(text).then(
      function () { show(out.length ? 'Copied ' + out.length + ' note' + (out.length === 1 ? '' : 's') : 'Nothing to copy yet'); },
      function () { show('Copy blocked - select the text instead'); }
    );
  });
})();
