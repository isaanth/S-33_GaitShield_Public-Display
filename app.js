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

const HINT = '<p class="hint">Tap a numbered marker on the photo to see what it is.</p>';

const pinLayer = document.getElementById('pins');
const detail = document.getElementById('detail');
const tabs = [...document.querySelectorAll('.tab')];

let activeId = null;

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

function showDetail(part, number) {
  if (!part) {
    detail.dataset.open = 'false';
    detail.innerHTML = HINT;
    return;
  }

  const count = part.points.length;
  detail.dataset.open = 'true';
  detail.innerHTML =
    '<p class="badge">' + String(number).padStart(2, '0') +
      (count > 1 ? ' <span>&times;' + count + '</span>' : '') + '</p>' +
    '<h4 class="name">' + part.name + '</h4>' +
    '<p class="spec">' + part.spec + '</p>' +
    '<button class="close" type="button">Close</button>';

  detail.querySelector('.close').addEventListener('click', () => setActive(null));
}

function setActive(id) {
  activeId = activeId === id ? null : id;

  for (const pin of pinLayer.children) {
    pin.setAttribute('aria-pressed', String(pin.dataset.id === activeId));
  }

  const index = PARTS.findIndex((p) => p.id === activeId);
  showDetail(index === -1 ? null : PARTS[index], index + 1);
}

PARTS.forEach((part, index) => {
  for (const point of part.points) {
    const pin = document.createElement('button');
    pin.className = point.x > 55 ? 'pin flip' : 'pin';
    pin.type = 'button';
    pin.dataset.id = part.id;
    pin.style.left = point.x + '%';
    pin.style.top = point.y + '%';
    pin.setAttribute('aria-pressed', 'false');
    pin.setAttribute('aria-label', part.name + '. ' + part.spec);
    pin.innerHTML =
      '<span class="disc" aria-hidden="true">' + (index + 1) + '</span>' +
      '<span class="chip" aria-hidden="true">' + part.name + '</span>';

    pin.addEventListener('click', () => setActive(part.id));
    pinLayer.appendChild(pin);
  }
});

showDetail(null);
