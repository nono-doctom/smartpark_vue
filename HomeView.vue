<template>
  <div id="app">

    <header>
      SmartPark - Trouver et réserver votre place
    </header>

    <div class="container">

      <!-- SIDEBAR -->
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
          <button @click="loadNearby">Parkings proches</button>
          <button @click="findBest">Meilleur</button>
          <button @click="showSubscribedOnly">Mes abonnements</button>
        </div>

      </div>

      <!-- MAP -->
      <div id="map"></div>

    </div>

    <!-- NOTIFICATIONS -->
    <div class="notifications">
      <div v-for="n in notifications" :key="n.id" class="toast">
        {{ n.msg }}
      </div>
    </div>

  </div>
</template>

<script>
import { io } from "socket.io-client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

const socket = io("http://localhost:3000");

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

      allParkings: [],
      viewParkings: [],

      placesByParking: {},

      notifications: [],

      subscribedParkings: JSON.parse(
        localStorage.getItem("subscribedParkings") || "[]"
      )
    };
  },

  mounted() {
    this.initMap();
    this.getLocation();
    this.loadAllParkings();

    socket.on("update", () => {
      this.loadAllParkings();
    });

    socket.on("placeFree", data => {
      const id = Number(data?.parkingId || data?.parking_id);

      if (this.subscribedParkings.includes(id)) {
        this.addNotification("🔔 Une place vient de se libérer !");
      }
    });
  },

  methods: {

    // =====================
    // NOTIFICATIONS
    // =====================
    addNotification(msg) {
      const id = Date.now();
      this.notifications.push({ id, msg });

      setTimeout(() => {
        this.notifications = this.notifications.filter(n => n.id !== id);
      }, 4000);
    },

    // =====================
    // MAP
    // =====================
    initMap() {
      this.map = L.map("map").setView([this.lat, this.lng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);
    },

    getLocation() {
      navigator.geolocation?.getCurrentPosition(pos => {
        this.lat = pos.coords.latitude;
        this.lng = pos.coords.longitude;
        this.map.setView([this.lat, this.lng], 14);
      });
    },

    // =====================
    // DATA
    // =====================
    async loadAllParkings() {
      const res = await fetch("http://localhost:3000/api/parkings");
      const data = await res.json();

      this.allParkings = data;
      this.viewParkings = data;

      this.placesByParking = {};

      for (const p of data) {
        const r = await fetch(
          `http://localhost:3000/api/places?id=${p.id_parking}`
        );
        const places = await r.json();

        this.placesByParking[p.id_parking] = {
          occupied: places.filter(x => x.etat_place === 1).length,
          total: places.length
        };
      }

      this.renderMarkers();
    },

    // =====================
    // MARKERS + POPUP RESTAURÉ
    // =====================
    renderMarkers() {
      if (!this.markersLayer) return;

      this.markersLayer.clearLayers();

      this.viewParkings.forEach(p => {

        const stats = this.placesByParking[p.id_parking];
        if (!stats) return;

        const free = stats.total - stats.occupied;
        const ratio = stats.occupied / stats.total;

        let color = "green";
        if (ratio >= 0.7) color = "red";
        else if (ratio >= 0.5) color = "orange";

        const subscribed =
          this.subscribedParkings.includes(Number(p.id_parking));

        const icon = L.icon({
          iconUrl: subscribed
            ? "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            : `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
          iconSize: [32, 32]
        });

        const marker = L.marker([p.latitude, p.longitude], { icon });

        // 🔥 POPUP COMPLET RESTAURÉ
        marker.bindPopup(`
          <b>${p.nom}</b><br>
          ${stats.occupied}/${stats.total}<br>
          ${free} libres<br><br>

          <button id="go-${p.id_parking}">Y aller</button>
          <button id="r-${p.id_parking}">Réserver</button>
          <button id="s-${p.id_parking}">
            ${subscribed ? "Désabonner" : "S'abonner"}
          </button>
        `);

        marker.on("popupopen", () => {
          this.$nextTick(() => {

            document.getElementById(`go-${p.id_parking}`).onclick =
              () => this.goToParking(p);

            document.getElementById(`r-${p.id_parking}`).onclick =
              () => this.$router.push({
                name: "reservation",
                query: { id: p.id_parking }
              });

            document.getElementById(`s-${p.id_parking}`).onclick =
              () => this.toggleSubscription(p.id_parking);
          });
        });

        this.markersLayer.addLayer(marker);
      });
    },

    // =====================
    // ROUTE PARKING
    // =====================
    goToParking(p) {

      if (this.routeControl) {
        this.map.removeControl(this.routeControl);
      }

      this.routeControl = L.Routing.control({
        waypoints: [
          L.latLng(this.lat, this.lng),
          L.latLng(p.latitude, p.longitude)
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        language: "fr",
        lineOptions: {
          styles: [{ color: "#0b6380", weight: 6 }]
        }
      }).addTo(this.map);

      this.addNotification("🚗 Itinéraire vers parking");
    },

    // =====================
    // 🔥 ITINÉRAIRE ADRESSE FIXÉ
    // =====================
    async searchDestination() {

      if (!this.destination) {
        this.addNotification("⚠️ Adresse vide");
        return;
      }

      this.addNotification("🔎 Recherche...");

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.destination)}`
        );

        const data = await res.json();

        if (!data.length) {
          this.addNotification("❌ Adresse introuvable");
          return;
        }

        const dest = data[0];
        const destLat = parseFloat(dest.lat);
        const destLng = parseFloat(dest.lon);

        this.map.setView([destLat, destLng], 14);

        if (this.routeControl) {
          this.map.removeControl(this.routeControl);
        }

        this.routeControl = L.Routing.control({
          waypoints: [
            L.latLng(this.lat, this.lng),
            L.latLng(destLat, destLng)
          ],
          routeWhileDragging: false,
          addWaypoints: false,
          language: "fr",
          lineOptions: {
            styles: [{ color: "#0b6380", weight: 6 }]
          }
        }).addTo(this.map);

        this.addNotification("🚗 Itinéraire affiché !");
      }
      catch (e) {
        console.error(e);
        this.addNotification("❌ Erreur itinéraire");
      }
    },

    // =====================
    goProfil() {
      this.$router.push("/profil");
    },

    loadNearby() {
      this.viewParkings = this.allParkings.filter(p =>
        Math.hypot(this.lat - p.latitude, this.lng - p.longitude) < 0.02
      );
      this.renderMarkers();
    },

    findBest() {
      let best = null;
      let bestScore = Infinity;

      this.allParkings.forEach(p => {
        const s = this.placesByParking[p.id_parking];
        if (!s) return;

        const score =
          Math.hypot(this.lat - p.latitude, this.lng - p.longitude) +
          (1 - (s.total - s.occupied) / s.total);

        if (score < bestScore) {
          bestScore = score;
          best = p;
        }
      });

      if (best) {
        this.map.setView([best.latitude, best.longitude], 16);
      }
    },

    showSubscribedOnly() {
      this.viewParkings = this.allParkings.filter(p =>
        this.subscribedParkings.includes(Number(p.id_parking))
      );
      this.renderMarkers();
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
  font-size: 20px;
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
}

.card {
  background: rgba(255,255,255,0.92);
  padding: 16px;
  margin-top: 16px;
  border-radius: 14px;
}

input {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: none;
}

button {
  width: 100%;
  padding: 10px;
  margin-top: 8px;
  background: #0b6380;
  color: white;
  border: none;
  border-radius: 10px;
}

#map {
  flex: 1;
}

.notifications {
  position: fixed;
  top: 100px;
  right: 20px;
}

.toast {
  background: #0b6380;
  color: white;
  padding: 12px;
  margin-top: 10px;
  border-radius: 12px;
}
</style>
