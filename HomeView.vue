const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true
})
<template>
  <div id="app">
    <header>SmartPark - Trouver et réserver votre place</header>

    <div class="message">{{ message }}</div>

    <div class="container">
      <div class="sidebar">
        <div class="card">
          <h3>Recherche itinéraire</h3>
          <input v-model="destination" placeholder="Adresse" />
          <button @click="searchDestination">
            Afficher itinéraire
          </button>
        </div>

        <button @click="goProfil">Profil</button>

        <div class="card">
          <h3>Filtres</h3>
          <button @click="loadAllParkings">Tous</button>
          <button @click="loadNearby">Proches</button>
          <button @click="findBest">Meilleur</button>
        </div>
      </div>

      <div id="map"></div>
    </div>
  </div>
</template>

<script>
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";

export default {
  name: "HomeView",

  data() {
    return {
      map: null,
      markersLayer: null,
      routeControl: null,

      lat: 43.3,
      lng: 5.4,

      destination: "",
      parkings: [],
      allParkings: [],
      placesByParking: {},
      message: "Chargement..."
    };
  },

  mounted() {
    this.initMap();
    this.getLocation();
    this.loadAllParkings();

    setInterval(() => {
      this.loadAllParkings();
    }, 10000);
  },
  methods: {

    initMap() {
      this.map = L.map("map").setView([this.lat, this.lng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);
    },

    getLocation() {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(pos => {
        this.lat = pos.coords.latitude;
        this.lng = pos.coords.longitude;

        L.marker([this.lat, this.lng])
          .addTo(this.map)
          .bindPopup("Vous êtes ici");

        this.map.setView([this.lat, this.lng], 14);
      });
    },

    // =====================
    // FAKE DATA (LIVE SIMULATION)
    // =====================
    generateFakeOccupancy(parkingId, total) {
      // simulation réaliste : entre 30% et 95% occupé
      const min = Math.floor(total * 0.3);
      const max = Math.floor(total * 0.95);

      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // =====================
    // LOAD PARKINGS
    // =====================
    async loadAllParkings() {
      try {
        const res = await fetch("http://localhost:3000/api/parkings");
        this.parkings = await res.json();
        this.allParkings = [...this.parkings];

        this.placesByParking = {};

        this.parkings.forEach(p => {
          const fakeOccupied = this.generateFakeOccupancy(
            p.id_parking,
            p.capacite_totale
          );

          this.placesByParking[p.id_parking] = {
            occupied: fakeOccupied,
            total: p.capacite_totale
          };
        });

        this.renderMarkers();

        const totalOcc = Object.values(this.placesByParking)
          .reduce((a, b) => a + b.occupied, 0);

        const totalPlaces = this.parkings
          .reduce((a, p) => a + p.capacite_totale, 0);

        this.message = `${totalOcc} places occupées sur ${totalPlaces}`;

      } catch (e) {
        console.log(e);
        this.message = "Erreur API";
      }
    },

    // =====================
    // MAP MARKERS
    // =====================
renderMarkers() {
  if (!this.map || !this.markersLayer) return;

  this.markersLayer.clearLayers();

  this.parkings.forEach((p) => {

    const stats = this.placesByParking[p.id_parking] || {
      occupied: 0,
      total: p.capacite_totale
    };

    const free = Math.max(0, stats.total - stats.occupied);

    let color = "green";
    if (free <= 10) color = "orange";
    if (free <= 0) color = "red";

    const icon = L.icon({
      iconUrl: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
      iconSize: [32, 32]
    });

    const marker = L.marker(
      [p.latitude, p.longitude],
      { icon }
    );

    marker.bindPopup(`
      <div style="text-align:center">
        <b>${p.nom}</b><br><br>
        ${stats.occupied} places occupées sur ${stats.total}<br>
        ${free} places libres<br><br>

        <button id="reserve-${p.id_parking}">
          Réserver
        </button>
      </div>
    `);

    marker.on("popupopen", () => {
      this.$nextTick(() => {
        const btn = document.getElementById(`reserve-${p.id_parking}`);

        if (btn) {
          btn.onclick = () => {
            this.$router.push({
              name: "reservation",
              query: {
                id: p.id_parking
              }
            });
          };
        }
      });
    });

    this.markersLayer.addLayer(marker);
  });
},

    // =====================
    // FILTERS
    // =====================
    loadNearby() {
      this.parkings = this.allParkings.filter(p => {
        const d = Math.hypot(
          this.lat - p.latitude,
          this.lng - p.longitude
        );
        return d < 0.02;
      });

      this.renderMarkers();
      this.message = "Parkings proches";
    },

    findBest() {
      let best = null;
      let bestScore = Infinity;

      this.allParkings.forEach(p => {
        const stats = this.placesByParking[p.id_parking];
        if (!stats) return;

        const dist = Math.hypot(
          this.lat - p.latitude,
          this.lng - p.longitude
        );

        const dispo = 1 - stats.occupied / stats.total;

        const score = dist + (1 - dispo);

        if (score < bestScore) {
          bestScore = score;
          best = p;
        }
      });

      if (best) {
        this.map.setView([best.latitude, best.longitude], 16);
        this.message = "Meilleur parking trouvé";
      }
    },

    searchDestination() {
      if (!this.destination) return;

      this.message = "Recherche...";
    },

    goProfil() {
      this.$router.push("/profil");
    }
  }
};
</script>

<style>
body {
  margin: 0;
  font-family: "Segoe UI", Arial;
  background: #74b0bf;
}

header {
  background: #0b6380;
  color: white;
  padding: 30px;
  text-align: center;
  font-weight: bold;
  font-size: 18px;
}

.container {
  display: flex;
  height: 90vh;
}

.sidebar {
  width: 320px;
  background: #74b0bf;
  padding: 10px;
  overflow: auto;
  border-right: 1px solid #ddd;
}

.card {
  background: rgba(255,255,255,0.92);
  padding: 16px;
  margin-top: 16px;
  margin-bottom: 12px;
  border-radius: 14px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.12);
}

input {
  width: 100%;
  padding: 10px 12px;
  margin-top: 6px;
  border: 1px solid rgba(0,0,0,0.15);
  border-radius: 10px;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 10px;
  margin-top: 5px;
  background: #0b6380;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}

#map {
  flex: 1;
}

.message {
  text-align: center;
  padding: 10px;
  font-weight: bold;
}
</style>