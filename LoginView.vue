<template>
  <div class="page">

    <div class="card">

      <h2>Connexion</h2>

      <input v-model="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Mot de passe" />

      <button @click="login" :disabled="loading">
        {{ loading ? "Connexion..." : "Se connecter" }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>

    </div>

  </div>
</template>

<script>
export default {
  name: "LoginView",

  data() {
    return {
      email: "",
      password: "",
      error: "",
      loading: false
    };
  },

  methods: {

    async login() {
      this.error = "";
      this.loading = true;

      try {

        const res = await fetch("http://localhost:3000/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: this.email,
            password: this.password
          })
        });

        const data = await res.json();

        if (!res.ok) {
          this.error = data.error || "Email ou mot de passe incorrect";
          return;
        }

        // 🔐 STOCKAGE TOKEN + USER
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // 🚀 redirection
        this.$router.push("/profil");

      } catch (err) {
        console.error(err);
        this.error = "Erreur serveur";
      }

      this.loading = false;
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
  background: linear-gradient(135deg,#74b0bf, #0b6380);
  color: white;
}

.card {
  background: rgba(255,255,255,0.12);
  padding: 28px;
  border-radius: 18px;
  width: 340px;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

input, button {
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

.error {
  color: #ffb3c1;
  font-size: 13px;
  text-align: center;
  margin-top: 10px;
}
</style>