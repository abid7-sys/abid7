(function(){
  const container = document.getElementById('headerClock');
  if (!container) return;

  const face = document.createElement('div');
  face.className = 'clock-face';

  const hourHand = document.createElement('div');
  hourHand.className = 'hand hour';
  hourHand.id = 'header-hour-hand';

  const minuteHand = document.createElement('div');
  minuteHand.className = 'hand minute';
  minuteHand.id = 'header-minute-hand';

  const secondHand = document.createElement('div');
  secondHand.className = 'hand second';
  secondHand.id = 'header-second-hand';

  const dot = document.createElement('div');
  dot.className = 'center-dot';

  face.appendChild(hourHand);
  face.appendChild(minuteHand);
  face.appendChild(secondHand);
  face.appendChild(dot);
  container.appendChild(face);

  const romanNumerals = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

  function placeNumerals() {
    // clear any existing numerals
    face.querySelectorAll('.roman').forEach(n => n.remove());
    const size = face.offsetWidth || 120;
    const center = size / 2;

    // place numerals near the rim (adjusted for better geometry)
    const radius = Math.max(20, Math.floor(center - size * 0.18));

    // size hands proportionally (thinner and shorter)
    const hourLen = Math.floor(size * 0.26);
    const minuteLen = Math.floor(size * 0.38);
    const secondLen = Math.floor(size * 0.42);

    const hourW = Math.max(4, Math.floor(size * 0.04));
    const minuteW = Math.max(3, Math.floor(size * 0.03));
    const secondW = Math.max(2, Math.floor(size * 0.015));

    hourHand.style.height = `${hourLen}px`;
    hourHand.style.width = `${hourW}px`;
    hourHand.style.zIndex = 2;
    minuteHand.style.height = `${minuteLen}px`;
    minuteHand.style.width = `${minuteW}px`;
    minuteHand.style.zIndex = 2;
    secondHand.style.height = `${secondLen}px`;
    secondHand.style.width = `${secondW}px`;
    secondHand.style.zIndex = 2;

    dot.style.width = `${Math.max(8, Math.floor(size * 0.06))}px`;
    dot.style.height = dot.style.width;

    romanNumerals.forEach((num, i) => {
      const angle = (i * 30) * (Math.PI / 180);
      const x = center + radius * Math.sin(angle);
      const y = center - radius * Math.cos(angle);
      const span = document.createElement('span');
      span.className = 'roman';
      span.style.position = 'absolute';
      span.style.left = `${x}px`;
      span.style.top = `${y}px`;
      span.style.transform = 'translate(-50%, -50%)';
      span.style.fontSize = `${Math.max(10, Math.floor(size * 0.08))}px`;
      span.style.zIndex = 1;
      span.textContent = num;
      face.appendChild(span);
    });
  }

  function updateClock() {
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;

    const hourDeg = (hours + minutes / 60) * 30;
    const minuteDeg = (minutes + seconds / 60) * 6;
    const secondDeg = seconds * 6;

    hourHand.style.transform = `translate(-50%, -100%) rotate(${hourDeg}deg)`;
    minuteHand.style.transform = `translate(-50%, -100%) rotate(${minuteDeg}deg)`;
    secondHand.style.transform = `translate(-50%, -100%) rotate(${secondDeg}deg)`;

    requestAnimationFrame(updateClock);
  }

  // initial layout
  placeNumerals();
  updateClock();

  // reposition numerals on resize
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(placeNumerals, 120);
  });
})();
