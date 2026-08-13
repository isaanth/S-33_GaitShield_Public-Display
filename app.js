const PARTS = [
  {
    id: 'fsr',
    name: 'FSR 402',
    spec: 'Force-sensitive resistors at heel, ball and toe, analog pressure 0 to 1023',
    points: [
      { x: 21.9, y: 15.2 },
      { x: 39.4, y: 14.3 },
      { x: 18.1, y: 66.3 }
    ]
  },
  {
    id: 'esp32',
    name: 'ESP32-C3 Mini',
    spec: 'Reads the sensors, scores fall risk, streams 28-byte packets over BLE',
    points: [{ x: 69.1, y: 64.3 }]
  },
  {
    id: 'mpu6050',
    name: 'MPU6050',
    spec: '6-axis IMU over I2C, sway, tilt and fall impact at 100 Hz',
    points: [{ x: 91.2, y: 51.8 }]
  },
  {
    id: 'lipo',
    name: '3.7 V LiPo cell',
    spec: 'Rechargeable pack, charge level reported over BLE',
    points: [{ x: 80.9, y: 41.8 }]
  },
  {
    id: 'charger',
    name: 'Type-C charging module',
    spec: 'Charges the cell in place, so the pod never has to be opened',
    points: [{ x: 80.1, y: 31.8 }]
  }
];

const STORE_KEY = 'gaitshield.pins.v3';

const stage = document.getElementById('stage');
const pinLayer = document.getElementById('pins');
const partList = document.getElementById('parts');
const calibToggle = document.getElementById('calib-toggle');
const coordsBox = document.getElementById('coords');
const status = document.getElementById('calib-status');

const tabs = [...document.querySelectorAll('.tab')];

function selectTab(tab) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  }
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));

  tab.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' ? 1 : tabs.length - 1;
    const next = tabs[(tabs.indexOf(tab) + step) % tabs.length];
    selectTab(next);
    next.focus();
  });
}

const markers = [];

PARTS.forEach((part, partIndex) => {
  part.points.forEach((point, i) => {
    markers.push({
      key: part.id + ':' + i,
      part: part,
      number: partIndex + 1,
      x: point.x,
      y: point.y
    });
  });
});

function loadSaved() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  } catch (err) {
    return;
  }
  if (!saved) return;

  for (const m of markers) {
    const pos = saved[m.key];
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      m.x = pos.x;
      m.y = pos.y;
    }
  }
}

function save() {
  const out = {};
  for (const m of markers) out[m.key] = { x: m.x, y: m.y };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(out));
  } catch (err) {
    status.textContent = 'Could not save to this browser.';
  }
}

loadSaved();

let activeId = null;
let suppressClick = false;
let drag = null;

function setActive(id) {
  activeId = id;
  for (const m of markers) {
    m.el.setAttribute('aria-pressed', String(m.part.id === id));
  }
  for (const li of partList.children) {
    li.dataset.active = String(li.dataset.id === id);
  }
}

function toggle(id) {
  setActive(activeId === id ? null : id);
}

function placePins() {
  for (const m of markers) {
    m.el.style.left = m.x + '%';
    m.el.style.top = m.y + '%';
    m.el.classList.toggle('flip', m.x > 55);
  }
}

for (const marker of markers) {
  const pin = document.createElement('button');
  pin.className = 'pin';
  pin.type = 'button';
  pin.dataset.key = marker.key;
  pin.setAttribute('aria-pressed', 'false');
  pin.setAttribute('aria-label', marker.part.name + '. ' + marker.part.spec);
  pin.innerHTML =
    '<span class="disc" aria-hidden="true">' + marker.number + '</span>' +
    '<span class="chip" aria-hidden="true">' + marker.part.name + '</span>';

  pin.addEventListener('click', () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    toggle(marker.part.id);
  });

  pinLayer.appendChild(pin);
  marker.el = pin;
}

PARTS.forEach((part, i) => {
  const count = part.points.length;
  const li = document.createElement('li');
  li.className = 'part';
  li.dataset.id = part.id;
  li.innerHTML =
    '<button type="button">' +
      '<span class="num">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span>' +
        '<span class="name">' + part.name + (count > 1 ? ' <em>&times;' + count + '</em>' : '') + '</span>' +
        '<span class="spec">' + part.spec + '</span>' +
      '</span>' +
    '</button>';

  li.firstChild.addEventListener('click', () => toggle(part.id));
  partList.appendChild(li);
});

placePins();

function coordsText() {
  return PARTS.map((part) => {
    const rows = markers
      .filter((m) => m.part.id === part.id)
      .map((m) => '  { x: ' + m.x.toFixed(1).padStart(5) + ', y: ' + m.y.toFixed(1).padStart(5) + ' },')
      .join('\n');
    return part.name + '\n' + rows;
  }).join('\n\n');
}

function refreshCoords() {
  coordsBox.textContent = coordsText();
}

refreshCoords();

calibToggle.addEventListener('change', () => {
  stage.classList.toggle('dragging', calibToggle.checked);
  status.textContent = calibToggle.checked ? 'Drag any marker to reposition it.' : '';
});

pinLayer.addEventListener('pointerdown', (e) => {
  if (!calibToggle.checked) return;

  const pin = e.target.closest('.pin');
  if (!pin) return;

  e.preventDefault();
  drag = { marker: markers.find((m) => m.key === pin.dataset.key), moved: false };
  pin.setPointerCapture(e.pointerId);
});

pinLayer.addEventListener('pointermove', (e) => {
  if (!drag) return;

  const box = stage.getBoundingClientRect();
  const x = ((e.clientX - box.left) / box.width) * 100;
  const y = ((e.clientY - box.top) / box.height) * 100;

  drag.marker.x = +Math.min(98, Math.max(2, x)).toFixed(1);
  drag.marker.y = +Math.min(98, Math.max(2, y)).toFixed(1);
  drag.moved = true;

  placePins();
  refreshCoords();
});

function endDrag() {
  if (!drag) return;

  if (drag.moved) {
    save();
    suppressClick = true;
    if (!status.textContent.startsWith('Could not')) {
      status.textContent = 'Saved in this browser.';
    }
  }
  drag = null;
}

pinLayer.addEventListener('pointerup', endDrag);
pinLayer.addEventListener('pointercancel', endDrag);

document.getElementById('copy-coords').addEventListener('click', () => {
  navigator.clipboard.writeText(coordsText()).then(
    () => { status.textContent = 'Coordinates copied.'; },
    () => { status.textContent = 'Copy blocked, select the text above instead.'; }
  );
});

document.getElementById('reset-coords').addEventListener('click', () => {
  for (const m of markers) {
    const [id, i] = m.key.split(':');
    const point = PARTS.find((p) => p.id === id).points[Number(i)];
    m.x = point.x;
    m.y = point.y;
  }

  try {
    localStorage.removeItem(STORE_KEY);
  } catch (err) {}

  placePins();
  refreshCoords();
  status.textContent = 'Back to the built-in positions.';
});
