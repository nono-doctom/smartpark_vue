<template>
  <div class="page">

    <header>SmartPark - Réservation</header>

    <div class="layout">

      <div class="panel">

        <div class="title">Détails</div>

        <div class="info">
          <div><span>Parking</span> {{ idParking }}</div>
          <div><span>Place</span> {{ selectedPlace || "—" }}</div>
          <div><span>Réservée</span> {{ myReservedPlace || "—" }}</div>
          <div><span>Véhicule</span> {{ idVehicule || "—" }}</div>

          <div v-if="remainingTime > 0">
            <span>Temps</span> {{ formattedTime }}
          </div>
        </div>

      </div>

      <div class="grid">

        <div
          v-for="p in places"
          :key="p.num_place"
          class="spot"
          :class="spotClass(p)"
          @click="selectPlace(p)"
        >
          <div>{{ p.num_place }}</div>

          <div class="type">
            {{ typeLabel(p) }}
          </div>

        </div>

      </div>

    </div>

    <div class="actions">

      <button class="btn primary"
        :disabled="!selectedPlace || !idVehicule"
        @click="reserve">
        Réserver
      </button>

      <button class="btn danger"
        :disabled="!lastReservationId"
        @click="cancelReservation">
        Annuler
      </button>

    </div>

    <div class="message">{{ message }}</div>

  </div>
</template>

<script>
import { io } from "socket.io-client";
const socket = io("http://localhost:3000");

export default {
  data() {
    return {
      idParking: null,
      places: [],
      selectedPlace: null,
      myReservedPlace: null,
      idVehicule: null,
      lastReservationId: null,
      message: "",
      remainingTime: 0,
      timer: null
    };
  },

  computed: {
    formattedTime() {
      const m = Math.floor(this.remainingTime / 60);
      const s = this.remainingTime % 60;
      return `${m}m ${s < 10 ? "0" : ""}${s}s`;
    }
  },

  mounted() {
    this.idParking = this.$route.query.id;

    this.loadPlaces();
    this.loadVehicule();

    socket.emit("subscribeParking", this.idParking);
    socket.on("update", () => this.loadPlaces());
  },

  methods: {

    getHeaders() {
      return {
        Authorization: "Bearer " + localStorage.getItem("token"),
        "Content-Type": "application/json"
      };
    },

    async loadPlaces() {
      const r = await fetch(
        `http://localhost:3000/api/places?id=${this.idParking}`
      );
      this.places = await r.json();
    },

    async loadVehicule() {
      const r = await fetch("http://localhost:3000/api/vehicules", {
        headers: this.getHeaders()
      });

      const list = await r.json();
      this.idVehicule = list?.[0]?.id_vehicule;
    },

    selectPlace(p) {
      if (p.etat_place === 1) return;
      this.selectedPlace = p.num_place;
    },

    async reserve() {

      const r = await fetch("http://localhost:3000/api/reservation", {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          id_parking: this.idParking,
          num_place: this.selectedPlace,
          id_vehicule: this.idVehicule
        })
      });

      const data = await r.json();

      if (!r.ok) {
        this.message = data.error;
        return;
      }

      this.lastReservationId = data.id_reservation;
      this.myReservedPlace = this.selectedPlace;

      this.message = "✔ Réservation confirmée";

      this.startTimer(30);
      this.loadPlaces();
    },

    async cancelReservation() {

      await fetch("http://localhost:3000/api/reservation/annuler", {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          id_reservation: this.lastReservationId
        })
      });

      this.message = "✔ Réservation annulée";

      clearInterval(this.timer);

      this.lastReservationId = null;
      this.myReservedPlace = null;
      this.selectedPlace = null;

      this.loadPlaces();
    },

    startTimer(min = 30) {
      clearInterval(this.timer);

      this.remainingTime = min * 60;

      this.timer = setInterval(() => {
        if (this.remainingTime > 0) {
          this.remainingTime--;
        }
      }, 1000);
    },

    typeLabel(p) {
      const t = (p.type_place || "").toLowerCase();

      if (t === "voiture") return " Voiture";
      if (t === "moto") return " Moto";
      if (t === "handicap") return " Handicap";

      return "❓ Inconnu";
    },

    spotClass(p) {
      const t = (p.type_place || "").toLowerCase();

      return {
        free: p.etat_place === 0,
        busy: p.etat_place === 1,
        selected: this.selectedPlace === p.num_place,
        mine: this.myReservedPlace === p.num_place,
        voiture: t === "voiture",
        moto: t === "moto",
        handicap: t === "handicap"
      };
    }
  }
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #0f172a;
  color: white;
  font-family: system-ui;
}

header {
  text-align: center;
  padding: 16px;
  background: #111827;
  font-weight: bold;
}

.layout {
  display: flex;
  gap: 20px;
  padding: 20px;
}

.panel {
  width: 260px;
  background: #111827;
  padding: 16px;
  border-radius: 10px;
}

.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

.spot {
  background: #1f2937;
  padding: 12px;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
}

.free { background: #22c55e; }
.busy { background: #ef4444; }
.selected { outline: 2px solid #38bdf8; }
.mine { border: 2px solid gold; }

.actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 15px;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
}

.primary { background: #38bdf8; }
.danger { background: #ef4444; }

.message {
  text-align: center;
}
</style>
