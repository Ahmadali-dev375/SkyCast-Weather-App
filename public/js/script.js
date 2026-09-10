// =============================================
// SkyCast Weather App - script.js
// =============================================

// API key is loaded from config.js (gitignored). Copy config.example.js → config.js and add your key.
const API_KEY = window.APP_CONFIG?.OPENWEATHER_API_KEY;
if (!API_KEY) {
  console.error(
    'OpenWeather API key is missing. Create public/js/config.js from config.example.js.'
  );
}

const GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct';

// Default city to load on page open
const DEFAULT_CITY = 'Karachi';

// =============================================
// FETCH REAL WEATHER DATA FROM OPENWEATHERMAP
// =============================================
async function fetchWeather(city) {
  // Loading pulse
  ['tempVal','humidVal','windVal','visVal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = '...'; el.classList.add('loading'); }
  });

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      alert(`City "${city}" not found. Please try another.`);
      return;
    }
    const data = await response.json();

    const temp     = Math.round(data.main.temp);
    const humidity = data.main.humidity;
    const wind     = Math.round(data.wind.speed * 3.6);
    const vis      = data.visibility ? (data.visibility / 1000).toFixed(1) : '--';
    const desc     = data.weather[0].description;
    const cityName = data.name;
    const country  = data.sys.country;

    const updates = { tempVal: temp+'°C', humidVal: humidity+'%', windVal: wind+'km/h', visVal: vis+'km' };
    Object.entries(updates).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) { el.textContent = val; el.classList.remove('loading'); }
    });

    const descEl = document.getElementById('weatherDesc');
    if (descEl) {
      descEl.textContent = `📍 ${cityName}, ${country} — ${desc.charAt(0).toUpperCase() + desc.slice(1)}`;
    }

  } catch (error) {
    console.error('Weather fetch error:', error);
    alert('Could not connect to weather service. Check your internet or API key.');
  }
}

/* ============================================
   THEME SWITCHER — persists via localStorage
   ============================================ */
(function () {
  const STORAGE_KEY = 'skycast-theme';
  const body        = document.body;
  const btn         = document.getElementById('themeToggle');
  const icon        = document.getElementById('themeIcon');

  // Apply saved theme immediately on page load (before paint)
  const savedTheme = localStorage.getItem(STORAGE_KEY) || 'light';
  applyTheme(savedTheme);

  // Button click handler
  if (btn) {
    btn.addEventListener('click', function () {
      const current = body.getAttribute('data-theme') || 'light';
      const next    = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
    });
  }

  function applyTheme(theme) {
    body.setAttribute('data-theme', theme);
    if (icon) {
      if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
      } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
      }
    }
  }
})();

// =============================================
// DOM READY
// =============================================
document.addEventListener('DOMContentLoaded', function () {

  // Load default city weather on page open
  fetchWeather(DEFAULT_CITY);

  // =============================================
  // ANALYZE BUTTON — search by city input
  // =============================================
  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', function () {
      const cityInput = document.getElementById('cityInput');
      const city = cityInput ? cityInput.value.trim() : '';
      if (city) {
        fetchWeather(city);
      } else {
        alert('Please enter a city name.');
      }
    });
  }

  // =============================================
  // ENTER KEY support on search input
  // =============================================
  const cityInput = document.getElementById('cityInput');
  if (cityInput) {
    cityInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        const city = this.value.trim();
        if (city) fetchWeather(city);
      }
    });
  }

  // =============================================
  // AUTOCOMPLETE — live city suggestions
  // =============================================
  const suggestionBox = document.getElementById('suggestionBox');
  let activeIndex = -1;

  if (cityInput && suggestionBox) {

    // Fetch suggestions as user types
    cityInput.addEventListener('input', async function () {
      const query = this.value.trim();
      activeIndex = -1;

      if (query.length < 2) {
        suggestionBox.innerHTML = '';
        suggestionBox.classList.remove('open');
        return;
      }

      try {
        const res = await fetch(`${GEO_URL}?q=${encodeURIComponent(query)}&limit=6&appid=${API_KEY}`);
        const cities = await res.json();

        if (!cities.length) {
          suggestionBox.classList.remove('open');
          return;
        }

        // Build list items
        suggestionBox.innerHTML = cities.map((c) => {
          const label = [c.name, c.state, c.country].filter(Boolean).join(', ');
          return `<li data-city="${c.name}" data-label="${label}">
                    <i class="fas fa-location-dot"></i> ${label}
                  </li>`;
        }).join('');

        suggestionBox.classList.add('open');

        // Click on a suggestion
        suggestionBox.querySelectorAll('li').forEach(li => {
          li.addEventListener('click', function () {
            cityInput.value = this.dataset.label;
            suggestionBox.classList.remove('open');
            fetchWeather(this.dataset.city);
          });
        });

      } catch (e) {
        console.error('Autocomplete error:', e);
      }
    });

    // Keyboard navigation (↑ ↓ Enter Escape)
    cityInput.addEventListener('keydown', function (e) {
      const items = suggestionBox.querySelectorAll('li');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        items[activeIndex].click();
        return;
      } else if (e.key === 'Escape') {
        suggestionBox.classList.remove('open');
        return;
      }

      // Highlight active item
      items.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
    });

    // Close when clicking outside
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-bar-big')) {
        suggestionBox.classList.remove('open');
      }
    });
  }

  // =============================================
  // CITY CHIPS — click to auto-search
  // =============================================
  document.querySelectorAll('.city-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.city-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');

      const city = this.textContent.trim().split(',')[0];
      if (cityInput) cityInput.value = this.textContent.trim();

      fetchWeather(city);

      const strip = document.querySelector('.weather-strip');
      if (strip) strip.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  // =============================================
  // Gallery Filter Tabs (UI only)
  // =============================================
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // =============================================
  // Navbar active link
  // =============================================
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });

});

// =============================================
// CONTACT FORM — sends data to XAMPP PHP API
// =============================================
document.getElementById('contactForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();

  const payload = {
    full_name: document.getElementById('contactName').value.trim(),
    email:     document.getElementById('contactEmail').value.trim(),
    subject:   document.getElementById('contactSubject').value,
    message:   document.getElementById('contactMessage').value.trim(),
  };

  try {
    const res = await fetch('http://localhost/skycast-api/contact.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      // Show existing Bootstrap success modal
      const modal = new bootstrap.Modal(document.getElementById('successModal'));
      modal.show();
      this.reset();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (err) {
    alert('Could not reach the server. Make sure XAMPP is running.');
  }
});