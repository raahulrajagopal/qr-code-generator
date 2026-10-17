(function () {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  // ---------- helpers ----------
  var digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  var phone = function (s) { s = String(s || '').trim(); return (s[0] === '+' ? '+' : '') + digits(s); };
  var wifiEsc = function (s) { return String(s).replace(/([\\;,:"])/g, '\\$1'); };
  var vcEsc = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([;,])/g, '\\$1'); };
  var enc = encodeURIComponent;

  // ---------- types ----------
  // f: fields, req: required field ids, build: values -> string
  var TYPES = [
    { id: 'url', label: 'URL', req: ['url'],
      f: [{ id: 'url', label: 'Website address', type: 'url', ph: 'https://example.com' }],
      build: function (v) { var u = v.url.trim(); return /^[a-z][a-z0-9+.\-]*:/i.test(u) ? u : 'https://' + u; } },

    { id: 'text', label: 'Text', req: ['text'],
      f: [{ id: 'text', label: 'Text', type: 'textarea', ph: 'Any text' }],
      build: function (v) { return v.text; } },

    { id: 'whatsapp', label: 'WhatsApp', req: ['phone'],
      f: [{ id: 'phone', label: 'Phone number with country code', type: 'tel', ph: '919876543210', hint: 'Digits only, country code first, no + or spaces.' },
          { id: 'msg', label: 'Message (optional)', type: 'textarea', ph: 'Hi, I would like to know more' }],
      build: function (v) { return 'https://wa.me/' + digits(v.phone) + (v.msg.trim() ? '?text=' + enc(v.msg) : ''); } },

    { id: 'call', label: 'Call', req: ['phone'],
      f: [{ id: 'phone', label: 'Phone number', type: 'tel', ph: '+919876543210' }],
      build: function (v) { return 'tel:' + phone(v.phone); } },

    { id: 'sms', label: 'SMS', req: ['phone'],
      f: [{ id: 'phone', label: 'Phone number', type: 'tel', ph: '+919876543210' },
          { id: 'msg', label: 'Message (optional)', type: 'textarea', ph: 'Message text' }],
      build: function (v) { return 'SMSTO:' + phone(v.phone) + ':' + v.msg; } },

    { id: 'email', label: 'Email', req: ['to'],
      f: [{ id: 'to', label: 'Email address', type: 'email', ph: 'name@example.com' },
          { id: 'subject', label: 'Subject (optional)', type: 'text' },
          { id: 'body', label: 'Message (optional)', type: 'textarea' }],
      build: function (v) {
        var q = [];
        if (v.subject.trim()) q.push('subject=' + enc(v.subject));
        if (v.body.trim()) q.push('body=' + enc(v.body));
        return 'mailto:' + v.to.trim() + (q.length ? '?' + q.join('&') : '');
      } },

    { id: 'wifi', label: 'Wi-Fi', req: ['ssid'],
      f: [{ id: 'ssid', label: 'Network name (SSID)', type: 'text' },
          { id: 'pass', label: 'Password', type: 'text' },
          { id: 'sec', label: 'Security', type: 'select', opts: [['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP'], ['nopass', 'No password']] },
          { id: 'hidden', label: 'Hidden network', type: 'checkbox' }],
      build: function (v) {
        var s = 'WIFI:T:' + v.sec + ';S:' + wifiEsc(v.ssid) + ';';
        if (v.sec !== 'nopass') s += 'P:' + wifiEsc(v.pass) + ';';
        if (v.hidden === 'true') s += 'H:true;';
        return s + ';';
      } },

    { id: 'contact', label: 'Contact card', req: ['first'],
      f: [{ id: 'first', label: 'First name', type: 'text', row: 'two' },
          { id: 'last', label: 'Last name', type: 'text', row: 'two' },
          { id: 'tel', label: 'Phone', type: 'tel', row: 'two' },
          { id: 'mail', label: 'Email', type: 'email', row: 'two' },
          { id: 'org', label: 'Company', type: 'text', row: 'two' },
          { id: 'title', label: 'Job title', type: 'text', row: 'two' },
          { id: 'web', label: 'Website', type: 'url' },
          { id: 'adr', label: 'Address', type: 'text' }],
      build: function (v) {
        var L = ['BEGIN:VCARD', 'VERSION:3.0',
          'N:' + vcEsc(v.last) + ';' + vcEsc(v.first) + ';;;',
          'FN:' + vcEsc((v.first + ' ' + v.last).trim())];
        if (v.org.trim()) L.push('ORG:' + vcEsc(v.org));
        if (v.title.trim()) L.push('TITLE:' + vcEsc(v.title));
        if (v.tel.trim()) L.push('TEL;TYPE=CELL:' + phone(v.tel));
        if (v.mail.trim()) L.push('EMAIL:' + v.mail.trim());
        if (v.web.trim()) L.push('URL:' + v.web.trim());
        if (v.adr.trim()) L.push('ADR;TYPE=WORK:;;' + vcEsc(v.adr) + ';;;;');
        L.push('END:VCARD');
        return L.join('\n');
      } },

    { id: 'upi', label: 'UPI payment', req: ['pa'],
      f: [{ id: 'pa', label: 'UPI ID', type: 'text', ph: 'name@bank' },
          { id: 'pn', label: 'Payee name', type: 'text' },
          { id: 'am', label: 'Amount in INR (optional)', type: 'number', ph: '500', hint: 'Leave empty to let the payer enter the amount.' },
          { id: 'tn', label: 'Note (optional)', type: 'text' }],
      build: function (v) {
        var s = 'upi://pay?pa=' + v.pa.trim();
        if (v.pn.trim()) s += '&pn=' + enc(v.pn.trim());
        if (v.am.trim()) s += '&am=' + enc(v.am.trim());
        s += '&cu=INR';
        if (v.tn.trim()) s += '&tn=' + enc(v.tn.trim());
        return s;
      } },

    { id: 'location', label: 'Location', req: ['lat', 'lng'],
      f: [{ id: 'lat', label: 'Latitude', type: 'text', ph: '11.2588', row: 'two' },
          { id: 'lng', label: 'Longitude', type: 'text', ph: '75.7804', row: 'two',
            hint: 'In Google Maps, right-click a spot and click the coordinates to copy them.' }],
      build: function (v) { return 'https://www.google.com/maps?q=' + enc(v.lat.trim()) + ',' + enc(v.lng.trim()); } }
  ];

  // ---------- build UI ----------
  var tabsEl = document.getElementById('tabs');
  var panelsEl = document.getElementById('panels');
  var current = TYPES[0].id;

  TYPES.forEach(function (t, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tab'; b.id = 'tab-' + t.id;
    b.setAttribute('role', 'tab'); b.textContent = t.label;
    b.setAttribute('aria-controls', 'panel-' + t.id);
    b.addEventListener('click', function () { select(t.id); });
    tabsEl.appendChild(b);

    var p = document.createElement('div');
    p.id = 'panel-' + t.id; p.setAttribute('role', 'tabpanel');
    p.setAttribute('aria-labelledby', 'tab-' + t.id);
    var row = null;
    t.f.forEach(function (f) {
      var wrap = document.createElement('div'); wrap.className = 'field';
      var inputId = t.id + '-' + f.id, input;
      if (f.type === 'textarea') input = document.createElement('textarea');
      else if (f.type === 'select') {
        input = document.createElement('select');
        f.opts.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; input.appendChild(op); });
      } else { input = document.createElement('input'); input.type = f.type === 'checkbox' ? 'checkbox' : f.type; }
      input.id = inputId; input.dataset.key = f.id;
      if (f.ph) input.placeholder = f.ph;
      if (f.type === 'number') { input.min = '0'; input.step = '0.01'; }
      input.addEventListener('input', update); input.addEventListener('change', update);

      var label = document.createElement('label'); label.htmlFor = inputId; label.textContent = f.label;
      if (f.type === 'checkbox') {
        wrap.className = 'field check'; wrap.appendChild(input); wrap.appendChild(label);
      } else {
        wrap.appendChild(label); wrap.appendChild(input);
        if (f.hint) { var h = document.createElement('span'); h.className = 'hint'; h.textContent = f.hint; wrap.appendChild(h); }
      }
      if (f.row) {
        if (!row || row.children.length >= 2) { row = document.createElement('div'); row.className = 'row two'; p.appendChild(row); }
        row.appendChild(wrap);
      } else { row = null; p.appendChild(wrap); }
    });
    panelsEl.appendChild(p);
  });

  function select(id) {
    current = id;
    TYPES.forEach(function (t) {
      var on = t.id === id;
      document.getElementById('tab-' + t.id).setAttribute('aria-selected', on);
      document.getElementById('tab-' + t.id).tabIndex = on ? 0 : -1;
      document.getElementById('panel-' + t.id).hidden = !on;
    });
    update();
  }

  // ---------- QR ----------
  var previewEl = document.getElementById('preview');
  var msgEl = document.getElementById('msg');
  var pngBtn = document.getElementById('dlPng');
  var svgBtn = document.getElementById('dlSvg');
  var qr = null;

  function values() {
    var out = {}, panel = document.getElementById('panel-' + current);
    panel.querySelectorAll('[data-key]').forEach(function (el) {
      out[el.dataset.key] = el.type === 'checkbox' ? String(el.checked) : el.value;
    });
    return out;
  }

  function svgString(px) {
    var n = qr.getModuleCount(), q = 4, d = '';
    for (var r = 0; r < n; r++) {
      var c = 0;
      while (c < n) {
        if (qr.isDark(r, c)) {
          var s = c; while (c < n && qr.isDark(r, c)) c++;
          d += 'M' + (s + q) + ' ' + (r + q) + 'h' + (c - s) + 'v1h-' + (c - s) + 'z';
        } else c++;
      }
    }
    var size = n + q * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '"' +
      (px ? ' width="' + px + '" height="' + px + '"' : '') + ' shape-rendering="crispEdges">' +
      '<rect width="' + size + '" height="' + size + '" fill="#ffffff"/><path d="' + d + '" fill="#000000"/></svg>';
  }

  function update() {
    var t = TYPES.filter(function (x) { return x.id === current; })[0];
    var v = values();
    var ready = t.req.every(function (k) { return String(v[k] || '').trim() !== ''; });
    qr = null; msgEl.textContent = '';
    if (ready) {
      try {
        var q = qrcode(0, document.getElementById('ecl').value);
        q.addData(t.build(v), 'Byte'); q.make(); qr = q;
      } catch (e) { msgEl.textContent = 'Too much data for one QR code. Shorten the text or lower the error correction.'; }
    }
    if (qr) previewEl.innerHTML = svgString();
    else previewEl.innerHTML = '<p class="empty">Fill in the details and your QR code appears here.</p>';
    pngBtn.disabled = svgBtn.disabled = !qr;
  }

  function save(blob, ext) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'qr-code-' + current + '.' + ext;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  svgBtn.addEventListener('click', function () {
    if (qr) save(new Blob([svgString(1024)], { type: 'image/svg+xml' }), 'svg');
  });

  pngBtn.addEventListener('click', function () {
    if (!qr) return;
    var n = qr.getModuleCount(), q = 4, total = n + q * 2;
    var scale = Math.max(1, Math.round(parseInt(document.getElementById('size').value, 10) / total));
    var cv = document.createElement('canvas'); cv.width = cv.height = total * scale;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = '#000000';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++)
      if (qr.isDark(r, c)) ctx.fillRect((c + q) * scale, (r + q) * scale, scale, scale);
    cv.toBlob(function (b) { save(b, 'png'); }, 'image/png');
  });

  document.getElementById('ecl').addEventListener('change', update);
  select(TYPES[0].id);
})();
