/* ==========================================================================
   REGRET MAP — GEOGRAPHIC HEATMAP & RADAR ENGINE
   High-contrast monochromatic base map with #FF3B30 and #FFD600 heat blobs
   ========================================================================== */

(function () {
  'use strict';

  // Regret Hotspots Dataset
  const REGRET_HOTSPOTS = [
    {
      id: 'bromo-sunset',
      title: 'Missing the sunset at Mount Bromo due to a traffic jam',
      city: 'Mount Bromo, East Java, ID',
      lat: -7.9425,
      lng: 112.9530,
      intensity: 0.98, // 0 to 1 heat scale
      radius: 45,
      regretsCount: 4812,
      hoursLost: '4h 45m',
      category: 'TRAFFIC / LOGISTICS',
      color: '#FF3B30'
    },
    {
      id: 'louvre-tuesday',
      title: 'Arrived at the Louvre on a Tuesday (it was closed)',
      city: 'Paris, FR',
      lat: 48.8606,
      lng: 2.3376,
      intensity: 0.85,
      radius: 40,
      regretsCount: 3290,
      hoursLost: '3h 10m',
      category: 'TIMING / CLOSURE',
      color: '#FF3B30'
    },
    {
      id: 'preikestolen-fog',
      title: 'Hiked 8 hours up Preikestolen to stand in a literal fog wall',
      city: 'Ryfylke, Rogaland, NO',
      lat: 58.9870,
      lng: 6.1887,
      intensity: 0.76,
      radius: 35,
      regretsCount: 2140,
      hoursLost: '8h 00m',
      category: 'WEATHER DISASTER',
      color: '#FF7A00'
    },
    {
      id: 'shibuya-train',
      title: 'Missed Shibuya crossing last train by 90s, slept in karaoke booth',
      city: 'Tokyo, JP',
      lat: 35.6595,
      lng: 139.7004,
      intensity: 0.92,
      radius: 42,
      regretsCount: 4105,
      hoursLost: '6h 30m',
      category: 'TIMING / CLOSURE',
      color: '#FF3B30'
    },
    {
      id: 'venice-gondola',
      title: 'Paid $120 for a romantic gondola ride during high-tide garbage barge route',
      city: 'Venice, IT',
      lat: 45.4387,
      lng: 12.3271,
      intensity: 0.68,
      radius: 30,
      regretsCount: 1820,
      hoursLost: '1h 15m',
      category: 'TOURIST TRAP',
      color: '#FFD600'
    },
    {
      id: 'grand-canyon-smoke',
      title: 'Drove 14 hours to Grand Canyon during wildfire smoke inversion',
      city: 'Arizona, US',
      lat: 36.0544,
      lng: -112.1401,
      intensity: 0.81,
      radius: 38,
      regretsCount: 2640,
      hoursLost: '14h 00m',
      category: 'WEATHER DISASTER',
      color: '#FF3B30'
    },
    {
      id: 'machu-picchu-strike',
      title: 'Ollantaytambo train strike blocked PeruRail access to Machu Picchu',
      city: 'Cusco, PE',
      lat: -13.1631,
      lng: -72.5450,
      intensity: 0.88,
      radius: 40,
      regretsCount: 3450,
      hoursLost: '9h 30m',
      category: 'TRAFFIC / LOGISTICS',
      color: '#FF3B30'
    },
    {
      id: 'taj-mahal-scaffolding',
      title: 'Visited Taj Mahal during year-long mudpack dome restoration',
      city: 'Agra, IN',
      lat: 27.1751,
      lng: 78.0421,
      intensity: 0.72,
      radius: 32,
      regretsCount: 2210,
      hoursLost: '5h 00m',
      category: 'BAD LUCK',
      color: '#FF7A00'
    }
  ];

  let mainMap = null;
  let splitMap = null;
  let heatmapLayer = null;

  // Initialize main map
  function initMainMap(containerId = 'leaflet-map-container') {
    const el = document.getElementById(containerId);
    if (!el || typeof L === 'undefined') return null;

    // Center on Mount Bromo default or world view
    const map = L.map(containerId, {
      center: [-7.9425, 112.9530],
      zoom: 4,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false
    });

    // Neo-Brutalist Zoom Control in top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Stark monochromatic / Carto Positron or Toner B&W tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO &copy; OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19,
      className: 'brutal-map-tile'
    }).addTo(map);

    // Stark English Labels on top
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      className: 'brutal-label-tile'
    }).addTo(map);

    // Add Heat Blobs & Markers
    renderHeatBlobs(map);
    renderBrutalPins(map);

    return map;
  }

  // Draw vivid #FF3B30 and #FFD600 Heat Blobs with SVG/Canvas Circles
  function renderHeatBlobs(map) {
    REGRET_HOTSPOTS.forEach(spot => {
      // Outer heat glow circle (#FFD600 to #FF3B30)
      const outerRadius = spot.radius * 18000;
      const innerRadius = (spot.radius * 0.45) * 18000;

      // Outer yellow/orange heat aura
      L.circle([spot.lat, spot.lng], {
        radius: outerRadius,
        stroke: false,
        fillColor: '#FFD600',
        fillOpacity: 0.38,
        interactive: false
      }).addTo(map);

      // Core intense red regret blob
      L.circle([spot.lat, spot.lng], {
        radius: innerRadius,
        stroke: true,
        weight: 1.5,
        color: '#000000',
        fillColor: '#FF3B30',
        fillOpacity: 0.85,
        interactive: false
      }).addTo(map);
    });
  }

  // Render Stark Neo-Brutalist HTML Markers
  function renderBrutalPins(map) {
    REGRET_HOTSPOTS.forEach(spot => {
      const pinIcon = L.divIcon({
        className: 'brutal-pin-marker',
        iconSize: [140, 36],
        iconAnchor: [70, 18],
        html: `
          <div class="brutal-pin-inner" onclick="window.regretApp.onMapPinClick('${spot.id}')">
            <span>🔥 ${spot.regretsCount.toLocaleString()}</span>
            <span style="font-size: 10px; background: #000; color: #FFF; padding: 1px 4px;">${spot.city.split(',')[0]}</span>
          </div>
        `
      });

      const marker = L.marker([spot.lat, spot.lng], { icon: pinIcon }).addTo(map);

      // Brutalist Popup
      const popupContent = `
        <div style="font-family: var(--font-body); padding: 4px;">
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            <span class="badge-brutal badge-yellow" style="font-size: 10px;">${spot.category}</span>
            <span class="mono-meta" style="font-size: 10px;">${spot.hoursLost} lost</span>
          </div>
          <h4 style="font-family: var(--font-display); font-size: 0.95rem; margin-bottom: 8px; line-height: 1.3;">${spot.title}</h4>
          <button class="btn-brutal btn-sm btn-yellow btn-pill" style="width: 100%;" onclick="window.regretApp.openThreadView('${spot.id}')">
            View Post (${spot.regretsCount.toLocaleString()} upvotes) →
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: true,
        autoPan: true
      });
    });
  }

  // Focus map on specific spot
  function flyToSpot(spotId) {
    const spot = REGRET_HOTSPOTS.find(s => s.id === spotId);
    if (!spot) return;

    if (mainMap) {
      mainMap.flyTo([spot.lat, spot.lng], 9, { duration: 1.2 });
    }
    if (splitMap) {
      splitMap.flyTo([spot.lat, spot.lng], 9, { duration: 1.2 });
    }
  }

  // Export functions to global window
  window.regretMapEngine = {
    initMainMap,
    flyToSpot,
    hotspots: REGRET_HOTSPOTS,
    setMainMapInstance: (instance) => { mainMap = instance; },
    setSplitMapInstance: (instance) => { splitMap = instance; }
  };

})();
