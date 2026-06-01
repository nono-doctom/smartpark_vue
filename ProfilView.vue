<template>
  <div class="page">

    <header>SmartPark - Mon Profil</header>

    <div class="container">

      <!-- 👤 PROFIL -->
      <div class="card">
        <h3>Profil</h3>

        <input v-model="user.nom" placeholder="Nom">
        <input v-model="user.prenom" placeholder="Prénom">
        <input v-model="user.email" placeholder="Email">

        <button class="primary" @click="saveUser">
          Sauvegarder
        </button>

        <p v-if="success" class="success">{{ success }}</p>
      </div>

      <!-- 🚗 VEHICULES -->
      <div class="card">
        <h3>Mes véhicules</h3>

        <p>Nombre : {{ vehicules.length }}</p>

        <input v-model="newPlaque" placeholder="AB-123-CD">

        <select v-model="newType">
          <option disabled value="">Type de véhicule</option>
          <option value="voiture">🚗 Voiture</option>
          <option value="moto">🏍 Moto</option>
          <option value="handicap">♿ Handicapé</option>
        </select>

        <button class="primary" @click="addVehicule">
          Ajouter
        </button>

        <p v-if="vehiculeSuccess" class="success">{{ vehiculeSuccess }}</p>
        <p v-if="vehiculeError" class="error">{{ vehiculeError }}</p>

        <!-- LISTE -->
        <div v-for="v in vehicules" :key="v.id_vehicule" class="plate">

          <div class="plaque">
            {{ v.plaque_immatriculation }}
          </div>

          <div class="type">
            {{ formatType(v.type_vehicule) }}
          </div>

          <button class="danger" @click="deleteVehicule(v.id_vehicule)">
            Supprimer
          </button>

        </div>

      </div>

      <!-- 🗺️ NAVIGATION -->
      <div class="card">
        <button
          class="primary"
          :disabled="!isProfileComplete"
          @click="goHome"
        >
          Carte des parkings et leur disponibilités
        </button>

        <p v-if="!isProfileComplete" class="error">
          ⚠️ Complète ton profil avant d’accéder à la carte
        </p>
      </div>

    </div>

  </div>
</template>

<script>
export default {
  name: "ProfilView",

  data() {
    return {
      user: JSON.parse(localStorage.getItem("user")) || {},
      vehicules: [],
      newPlaque: "",
      newType: "",
      success: "",
      vehiculeError: "",
      vehiculeSuccess: ""
    };
  },

  computed: {
    isProfileComplete() {
      return this.user.nom && this.user.prenom && this.user.email;
    }
  },

  mounted() {
    this.loadVehicules();
  },

  methods: {

    getHeaders() {
      const token = localStorage.getItem("token");

      return {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      };
    },

    goHome() {
      this.$router.push("/map");
    },

    async loadVehicules() {
      try {
        const res = await fetch("http://localhost:3000/api/vehicules", {
          headers: this.getHeaders()
        });

        const data = await res.json();

        if (!res.ok) {
          this.vehiculeError = data.error || "Erreur API";
          return;
        }

        this.vehicules = data;

      } catch (err) {
        this.vehiculeError = "Erreur chargement véhicules";
      }
    },

    async addVehicule() {
      try {
        const res = await fetch("http://localhost:3000/api/vehicules", {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({
            plaque: this.newPlaque,
            type: this.newType
          })
        });

        const data = await res.json();

        if (!res.ok) {
          this.vehiculeError = data.error || "Erreur ajout";
          return;
        }

        this.vehiculeSuccess = "Véhicule ajouté ✔";
        this.newPlaque = "";
        this.newType = "";

        this.loadVehicules();

      } catch (err) {
        this.vehiculeError = "Erreur serveur";
      }
    },

    async deleteVehicule(id) {
      try {
        const res = await fetch(
          `http://localhost:3000/api/vehicules/${id}`,
          {
            method: "DELETE",
            headers: this.getHeaders()
          }
        );

        const data = await res.json();

        if (!res.ok) {
          this.vehiculeError = data.error || "Erreur suppression";
          return;
        }

        this.loadVehicules();

      } catch (err) {
        this.vehiculeError = "Erreur suppression";
      }
    },

    saveUser() {
      localStorage.setItem("user", JSON.stringify(this.user));
      this.success = "Profil sauvegardé ✔";
    },

    formatType(type) {
      if (!type) return "🚗 Voiture";

      const t = type.toLowerCase();

      if (t.includes("moto")) return "🏍 Moto";
      if (t.includes("handicap")) return "♿ Handicapé";
      return "🚗 Voiture";
    }
  }
};
</script>

<style scoped>
* { box-sizing: border-box; }

.page {
  min-height: 100vh;
  font-family: "Segoe UI", sans-serif;
  background: linear-gradient(135deg,#74b0bf,#0b6380);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
}

.container {
  width: 480px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

header {
  text-align: center;
  font-size: 26px;
  font-weight: 700;
  padding: 20px;
  border-radius: 20px;
  background: rgba(255,255,255,0.1);
  color: white;
}

.card {
  background: rgba(255,255,255,0.08);
  padding: 16px;
  border-radius: 20px;
  color: white;
}

input, select {
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  border-radius: 12px;
  border: none;
}

button {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-weight: bold;
}

.primary {
  background: #74b0bf;
  color: white;
}

.danger {
  background: #ef4444;
  color: white;
}

.plate {
  background: white;
  color: black;
  padding: 12px;
  border-radius: 12px;
  text-align: center;
  margin-top: 12px;
}

.success { color: #22c55e; }
.error { color: #f87171; }
.type { font-size: 12px; color: gray; margin-top: 4px; }
</style>
