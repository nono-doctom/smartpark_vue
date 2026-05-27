<template>
  <div class="page">

    <div class="card">

      <h2>Inscription</h2>

      <input v-model="nom" placeholder="Nom" />
      <input v-model="prenom" placeholder="Prénom" />
      <input v-model="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Mot de passe" />

      <button @click="register" :disabled="loading">
        {{ loading ? "Création..." : "Créer un compte" }}
      </button>

      <p v-if="success" class="success">{{ success }}</p>
      <p v-if="error" class="error">{{ error }}</p>

      <p class="link" @click="goLogin">
        Déjà un compte ? Connexion
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

      if (this.loading) return;

      this.error = "";
      this.success = "";
      this.loading = true;

      try {

        const res = await fetch("http://localhost:3000/api/inscrire", {
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

        const data = await res.json();

        if (!res.ok) {
          this.error = data.error || "Erreur inscription";
          return;
        }

        this.success = "Compte créé ✔";

        setTimeout(() => {
          this.$router.push("/login");
        }, 1000);

      } catch (err) {

        console.error(err);
        this.error = "Erreur serveur";

      } finally {

        this.loading = false;

      }
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
  color: white;
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
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}

button:hover {
  background: #5b9bab;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success {
  color: #b7ffbf;
  font-size: 13px;
  text-align: center;
  margin-top: 10px;
}

.error {
  color: #ffb3c1;
  font-size: 13px;
  text-align: center;
  margin-top: 10px;
}

.link {
  text-align: center;
  margin-top: 14px;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}
</style>