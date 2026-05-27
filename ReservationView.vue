<template>
  <div class="page">

    <header>SmartPark - Réservation</header>

    <div class="container">

      <!-- INFOS -->
      <div class="card">
        <p><b>Parking :</b> {{ idParking }}</p>
        <p><b>Place choisie :</b> {{ selectedPlace || "Aucune" }}</p>
        <p><b>Véhicule :</b> {{ idVehicule || "Chargement..." }}</p>

        <p v-if="remainingTime > 0">
          <b>Temps restant :</b> {{ formattedTime }}
        </p>
      </div>

      <!-- NOTIFICATION -->
      <div v-if="notification" class="notif">
        🔔 {{ notification }}
      </div>

      <!-- PLACES -->
      <div class="grid">
        <div
          v-for="p in places"
          :key="p.num_place"
          class="place"
          :class="{
            free: !occupiedPlaces.includes(p.num_place),
            busy: occupiedPlaces.includes(p.num_place),
            selected: selectedPlace === p.num_place
          }"
          @click="selectPlace(p)"
        >
          {{ p.num_place }}

          <span class="badge">
            {{ occupiedPlaces.includes(p.num_place) ? "Occupée" : "Libre" }}
          </span>
        </div>
      </div>

      <!-- ACTIONS -->
      <button
        class="primary"
        :disabled="!canReserve"
        @click="reserve"
      >
        Réserver 30 min
      </button>

      <button class="danger" @click="cancelReservation">
        Annuler réservation
      </button>

      <!-- ACTIVITÉ -->
      <div class="card">
        <h3>Activité du parking</h3>

        <div
          v-for="r in allReservations"
          :key="r.id"
          class="res"
        >
          🚗 Place {{ r.num_place }} - {{ r.parking }}
          <small>• {{ r.source }}</small>
        </div>
      </div>

      <!-- MESSAGE -->
      <div
        v-if="message"
        class="message"
        :class="messageType"
      >
        {{ message }}
      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: "ReservationView",

  data() {
    return {
      idParking: null,
      places: [],
      selectedPlace: null,
      idVehicule: null,

      loading: false,
      message: "",
      messageType: "success",

      remainingTime: 0,
      timer: null,

      realReservations: [],
      fakeReservations: [],
      notification: ""
    };
  },

  computed: {
    formattedTime() {
      const m = Math.floor(this.remainingTime / 60);
      const s = this.remainingTime % 60;
      return `${m}m ${s < 10 ? "0" : ""}${s}s`;
    },

    allReservations() {
      return [...this.realReservations, ...this.fakeReservations];
    },

    occupiedPlaces() {
      return this.allReservations.map(r => r.num_place);
    },

    canReserve() {
      return this.selectedPlace && this.idVehicule;
    }
  },

  mounted() {
    this.idParking = this.$route.query.id;

    this.loadPlaces();
    this.loadVehicule();
    this.loadRealReservations();

    this.generateFakeReservations();

    setInterval(() => {
      this.generateFakeReservations();
      this.checkNotification();
    }, 20000);

    setInterval(() => {
      this.loadRealReservations();
    }, 15000);
  },

  methods: {

    getHeaders() {
      return {
        Authorization: "Bearer " + localStorage.getItem("token"),
        "Content-Type": "application/json"
      };
    },

    async loadPlaces() {
      const res = await fetch(
        `http://localhost:3000/api/places?id=${this.idParking}`
      );

      this.places = await res.json();
    },

    async loadVehicule() {
      const res = await fetch(
        "http://localhost:3000/api/vehicules",
        {
          headers: this.getHeaders()
        }
      );

      const data = await res.json();
      this.idVehicule = data?.[0]?.id_vehicule || null;
    },

    async loadRealReservations() {
      const res = await fetch(
        "http://localhost:3000/api/mes-reservations",
        {
          headers: this.getHeaders()
        }
      );

      const data = await res.json();

      this.realReservations = data.map(r => ({
        id: r.id_reservation,
        num_place: r.num_place,
        parking: r.parking,
        source: "Vous"
      }));
    },

    generateFakeReservations() {
      const names = [
        "Léa","Inès","Thomas","Lucas","Emma",
        "Mohamed","Chloé","Nina","Adam","Alex",
        "Manon","Hugo","Sofia","Yanis","Noah",
        "Eva","Paul","Lina","Julie","Enzo",
        "Sarah","Mehdi"
      ];

      const fake = [];
      const used = [];

      const count = 18 + Math.floor(Math.random() * 8);

      for (let i = 0; i < count; i++) {
        let place;

        do {
          place = Math.floor(Math.random() * 30) + 1;
        } while (used.includes(place));

        used.push(place);

        const name =
          names[Math.floor(Math.random() * names.length)];

        fake.push({
          id: "fake_" + Math.random(),
          num_place: place,
          parking: "Parking Central",
          source: `${name} a réservé`
        });
      }

      this.fakeReservations = fake;
    },

    selectPlace(p) {
      if (this.occupiedPlaces.includes(p.num_place)) return;

      this.selectedPlace = p.num_place;
    },

    async reserve() {
      if (!this.idVehicule) {
        this.message = "❌ Véhicule non trouvé";
        this.messageType = "error";
        return;
      }

      const res = await fetch(
        "http://localhost:3000/api/reservation",
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            id_parking: this.idParking,
            num_place: this.selectedPlace,
            id_vehicule: this.idVehicule
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        this.message = "❌ " + data.error;
        this.messageType = "error";
        return;
      }

      this.message = "✔ Réservation confirmée";
      this.messageType = "success";

      this.remainingTime = 1800;

      this.startTimer();
      this.loadRealReservations();
      this.loadPlaces();
    },

    async cancelReservation() {
      await fetch(
        "http://localhost:3000/api/reservation/annuler",
        {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            id_vehicule: this.idVehicule
          })
        }
      );

      this.message = "✔ Réservation annulée";

      this.loadRealReservations();
      this.loadPlaces();
    },

    startTimer() {
      clearInterval(this.timer);

      this.timer = setInterval(() => {
        if (this.remainingTime > 0) {
          this.remainingTime--;
        }
      }, 1000);
    },

    checkNotification() {
      const free =
        this.places.length - this.occupiedPlaces.length;

      if (free > 0 && free < 5) {
        this.notification =
          "⚠ Une place vient de se libérer !";

        setTimeout(() => {
          this.notification = "";
        }, 4000);
      }
    }
  }
};
</script>

<style scoped>
.page{
  min-height:100vh;
  font-family:"Segoe UI",sans-serif;
  background:linear-gradient(135deg,#74b0bf,#0b6380);
  display:flex;
  flex-direction:column;
  align-items:center;
  padding:30px;
}

.container{
  width:480px;
  display:flex;
  flex-direction:column;
  gap:15px;
}

header{
  text-align:center;
  font-size:24px;
  font-weight:700;
  padding:18px;
  border-radius:20px;
  background:rgba(255,255,255,.15);
  color:white;
}

.card{
  background:rgba(255,255,255,.92);
  padding:16px;
  border-radius:18px;
}

.grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:10px;
}

.place{
  padding:18px;
  border-radius:14px;
  text-align:center;
  font-weight:bold;
  cursor:pointer;
  position:relative;
}

.free{
  background:#22c55e;
  color:white;
}

.busy{
  background:#ef4444;
  color:white;
  cursor:not-allowed;
  opacity:.85;
}

.selected{
  outline:3px solid #0b6380;
}

.badge{
  position:absolute;
  top:4px;
  right:4px;
  font-size:9px;
  padding:3px 6px;
  border-radius:8px;
  background:rgba(0,0,0,.35);
  color:white;
}

button{
  padding:14px;
  border:none;
  border-radius:14px;
  width:100%;
  font-weight:bold;
}

.primary{
  background:#22c55e;
  color:white;
}

.danger{
  background:#ef4444;
  color:white;
}

.notif{
  background:#fff3cd;
  padding:10px;
  border-radius:10px;
  text-align:center;
  font-weight:bold;
}

.message{
  text-align:center;
  padding:10px;
}

.success{
  color:#16a34a;
}

.error{
  color:#dc2626;
}
</style>