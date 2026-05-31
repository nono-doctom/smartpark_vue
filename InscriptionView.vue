<template>
  <div class="page">

    <div class="card">

      <h2>Créer un compte</h2>

      <!-- Formulaire -->
      <form @submit.prevent="register">

        <input
          v-model="nom"
          type="text"
          placeholder="Nom"
        >

        <input
          v-model="prenom"
          type="text"
          placeholder="Prénom"
        >

        <input
          v-model="email"
          type="email"
          placeholder="Email"
        >

        <input
          v-model="password"
          type="password"
          placeholder="Mot de passe"
        >

        <button type="submit" :disabled="loading">
          {{ loading ? "Création..." : "S'inscrire" }}
        </button>

      </form>

      <!-- Messages -->
      <p v-if="error" class="error">
        {{ error }}
      </p>

      <p v-if="success" class="success">
        {{ success }}
      </p>

      <!-- Lien vers login -->
      <p class="link">
        Déjà inscrit ?
        <span @click="goLogin">
          Connexion
        </span>
      </p>

    </div>

  </div>
</template>

<script>
export default {
  name: "InscriptionView",

  data() {
    return {
      nom: "",
      prenom: "",
      email: "",
      password: "",
      error: "",
      success: "",
      loading: false
    };
  },

  methods: {

    async register() {

      // reset messages
      this.error = "";
      this.success = "";

      // vérifie champs vides
      if (!this.nom || !this.prenom || !this.email || !this.password) {
        this.error = "Tous les champs sont obligatoires";
        return;
      }

      this.loading = true;

      try {

        // appel API backend
        const response = await fetch("http://localhost:3000/api/inscrire", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            nom: this.nom,
            prenom: this.prenom,
            email: this.email,
            password: this.password
          })
        });

        const data = await response.json();

        // si erreur backend
        if (!response.ok) {
          this.error = data.error || "Erreur inscription";
          return;
        }

        // succès
        this.success = "Compte créé";

        // redirection vers login
        setTimeout(() => {
          this.$router.push("/login");
        }, 1000);

      } catch (err) {
        this.error = "Erreur serveur";
      }

      this.loading = false;
    },

    goLogin() {
      this.$router.push("/login");
    }

  }
};
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #74b0bf, #0b6380);
  color: black;
}

.card {
  background: rgba(255, 255, 255, 0.12);
  padding: 28px;
  border-radius: 18px;
  width: 340px;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

input,
button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border: none;
  border-radius: 10px;
  box-sizing: border-box;
}

input {
  outline: none;
}

button {
  background: #74b0bf;
  color: black;
  font-weight: bold;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success {
  color: #b7ffbf;
  text-align: center;
  margin-top: 10px;
}

.error {
  color: #ffb3c1;
  text-align: center;
  margin-top: 10px;
}

.link {
  text-align: center;
  margin-top: 15px;
  font-weight: bold;

}

.link span {
  cursor: pointer;
  text-decoration: underline;
}
</style>
