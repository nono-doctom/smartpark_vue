<template>
  <div class="page">

    <div class="card">

      <h2>Connexion</h2>

      <form @submit.prevent="login">

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
          {{ loading ? "Connexion..." : "Se connecter" }}
        </button>

      </form>

      <p v-if="error" class="error">
        {{ error }}
      </p>

    </div>

  </div>
</template>

<script>
// Importation du fichier de configuration pour cibler la bonne URL de notre API Node.js
import config from "@/config";

export default {
  // Nom unique du composant Vue.js
  name: "LoginView",

  // Mémoire réactive locale du formulaire
  data() {
    return {
      email: "",     // Stocke l'adresse email saisie par l'utilisateur
      password: "",  // Stocke le mot de passe saisi
      error: "",     // Stocke le texte du message d'erreur à afficher à l'écran
      loading: false // État vrai/faux permettant de savoir si la requête vers le serveur est en cours
    };
  },

  // Conteneur des fonctions exécutables depuis l'interface
  methods: {

    // Fonction asynchrone qui envoie les identifiants au serveur backend
    async login() {

      // Réinitialise l'affichage des erreurs à blanc à chaque tentative
      this.error = "";

      // Vérifie localement si l'un des deux champs est resté vide
      if (!this.email || !this.password) {
        this.error = "Remplis tous les champs";
        return; // Stoppe immédiatement la fonction
      }

      // Active l'état de chargement (désactive le bouton pour éviter les doubles clics)
      this.loading = true;

      try {

        // Envoie une requête réseau POST vers la route d'authentification du serveur Node.js
        const res = await fetch(
          `${config.API_URL}/api/login`,
          {
            method: "POST", // Méthode HTTP d'envoi et de création sécurisée
            headers: {
              "Content-Type": "application/json" // Indique au serveur qu'on lui envoie du format JSON
            },
            // Convertit l'email et le mot de passe en chaîne de caractères JSON brute pour l'envoi
            body: JSON.stringify({
              email: this.email,
              password: this.password
            })
          }
        );

        // Récupère et décode la réponse textuelle renvoyée par l'API
        const data = await res.json();

        // Si le serveur backend renvoie un code d'erreur (ex: 401 login incorrect ou 500 panne)
        if (!res.ok) {
          // Affiche le texte de l'erreur généré par le serveur ou un message passe-partout
          this.error = data.error || "Email ou mot de passe incorrect";
          return; // Quitte la fonction
        }

        //  AUTHENTIFICATION RÉUSSIE : Enregistrement des données de session
        // Enregistre les infos du profil de l'utilisateur dans le stockage du navigateur
        localStorage.setItem("user", JSON.stringify(data.user));
        // Enregistre le jeton de sécurité (Token JWT) indispensable pour les prochaines requêtes de l'API
        localStorage.setItem("token", data.token);

        // REDIRECTION
        // Redirige automatiquement l'utilisateur connecté vers l'écran du Profil (`/profil`)
        this.$router.push("/profil");

      } catch (err) {
        // En cas de panne de connexion réseau ou de serveur éteint
        console.error(err);
        this.error = "Erreur serveur";
      } finally {
        // S'exécute toujours à la fin, que la connexion ait réussi ou échoué, pour réactiver le bouton
        this.loading = false;
      }
    }

  }
};
</script>

<style scoped>
/* Conteneur global prenant toute la taille de la fenêtre */
.page {
  height: 100vh; /* 100% de la hauteur de l'écran */
  display: flex;
  justify-content: center; /* Centre la carte horizontalement */
  align-items: center;     /* Centre la carte verticalement */
  background: linear-gradient(135deg, #74b0bf, #0b6380); /* Dégradé de fond bleu/cyan */
  color: black;
}

/* Design de la boîte de connexion (effet de verre dépoli) */
.card {
  background: rgba(255, 255, 255, 0.12); /* Fond blanc très transparent */
  padding: 28px;
  border-radius: 18px;
  width: 340px; /* Largeur fixe de la boîte */
  backdrop-filter: blur(6px); /* Floute légèrement le dégradé de fond derrière la carte */
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2); /* Ombre portée douce pour donner du relief */
}

/* Style commun appliqué aux champs de saisie et au bouton */
input,
button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border: none;
  border-radius: 10px;
  box-sizing: border-box; /* Intègre le padding dans le calcul de la largeur */
}

/* Style de design spécifique du bouton de validation */
button {
  background: #74b0bf;
  font-weight: bold;
  cursor: pointer; /* Change le curseur en main au survol */
}

/* Style du bouton lorsqu'il est bloqué pendant le chargement */
button:disabled {
  opacity: 0.6; /* Devient légèrement transparent */
}

/* Style du texte d'alerte en cas d'erreur de saisie ou de connexion */
.error {
  color: red;
  text-align: center;
  margin-top: 10px;
}

/* =========================================================================
   MEDIA QUERIES : Règles d'adaptation responsive pour Tablettes et Mobiles
   ========================================================================= */

/* ADAPTATION TABLETTE (Écrans inférieurs à 1024px) */
@media (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .layout {
    flex-direction: row;
  }

  .panel {
    width: 220px;
  }
}

/*  ADAPTATION MOBILE (Écrans inférieurs à 768px) */
@media (max-width: 768px) {
  .layout {
    flex-direction: column;
  }

  .panel {
    width: 100%;
  }

  .grid {
    grid-template-columns: repeat(3, 1fr);
  }

  header {
    font-size: 16px;
    padding: 12px;
  }

  .spot {
    padding: 10px;
    font-size: 13px;
  }

  .btn {
    width: 100%;
  }

  .actions {
    flex-direction: column;
    align-items: stretch;
  }
}

/*  ADAPTATION PETIT TÉLÉPHONE (Écrans inférieurs à 480px) */
@media (max-width: 480px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .spot {
    padding: 8px;
  }

  .panel {
    font-size: 13px;
  }
}
</style>
