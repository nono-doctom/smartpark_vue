<template>
  <div class="page">

    <div class="card">

      <h2>Créer un compte</h2>

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

      <p v-if="error" class="error">
        {{ error }}
      </p>

      <p v-if="success" class="success">
        {{ success }}
      </p>

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
// Importation du fichier de configuration pour cibler la bonne URL du serveur backend Node.js
import config from "@/config";

export default {
  // Nom d'identification unique pour ce composant Vue.js
  name: "InscriptionView",

  // Mémoire réactive locale pour stocker les données du formulaire
  data() {
    return {
      nom: "",      // Stocke le nom saisi
      prenom: "",   // Stocke le prénom saisi
      email: "",    // Stocke l'adresse email saisie
      password: "", // Stocke le mot de passe en clair avant chiffrement côté serveur
      error: "",    // Message d'erreur textuel à afficher en cas de problème
      success: "",  // Message de réussite textuel à afficher en cas de succès
      loading: false // État de chargement (vrai/faux) pour bloquer les doubles clics accidentels
    };
  },

  // Espace dédié aux fonctions exécutables par le composant
  methods: {

    // Fonction principale gérant l'appel réseau pour enregistrer un nouvel utilisateur
    async register() {

      // Réinitialise les anciens messages de notification à chaque nouvelle tentative
      this.error = "";
      this.success = "";

      // Vérification locale : s'assure qu'aucun des quatre champs obligatoires n'est resté vide
      if (!this.nom || !this.prenom || !this.email || !this.password) {
        this.error = "Tous les champs sont obligatoires";
        return; // Interrompt la fonction immédiatement
      }

      // Active l'état de chargement et verrouille le bouton de validation
      this.loading = true;

      try {

        // Envoie une requête POST asynchrone vers l'adresse d'inscription de notre API backend
        const response = await fetch(
          `${config.API_URL}/api/inscrire`,
          {
            method: "POST", // Méthode HTTP recommandée pour la soumission de formulaires
            headers: {
              "Content-Type": "application/json" // Indique au serveur que le format des données est du JSON
            },
            // Convertit l'objet JavaScript contenant les variables en une chaîne de texte JSON standard
            body: JSON.stringify({
              nom: this.nom,
              prenom: this.prenom,
              email: this.email,
              password: this.password
            })
          }
        );

        // Récupère et décode le résultat JSON renvoyé par le serveur
        const data = await response.json();

        // Si le serveur backend refuse l'inscription (ex: adresse email déjà prise, mot de passe non sécurisé, etc.)
        if (!response.ok) {
          // Affiche le message d'erreur précis renvoyé par l'API, ou applique un texte générique par défaut
          this.error = data.error || "Erreur inscription";
          return; // Sort de la fonction
        }

        // Si l'inscription réussit en base de données
        this.success = "Compte créé ✔";

        // Déclenche un compte à rebours d'une seconde (1000 millisecondes) pour laisser le temps de lire le message
        setTimeout(() => {
          // Redirige automatiquement le nouvel inscrit vers la page de connexion (`/login`)
          this.$router.push("/login");
        }, 1000);

      } catch (err) {
        // Intercepte les pannes de connexion réseau ou les serveurs éteints
        this.error = "Erreur serveur";
      } finally {
        // S'exécute quoi qu'il arrive (succès ou échec) pour déverrouiller le bouton de soumission
        this.loading = false;
      }
    },

    // Redirige manuellement l'utilisateur vers l'écran de connexion si demandé
    goLogin() {
      this.$router.push("/login");
    }

  }
};
</script>

<style scoped>
/* Conteneur principal qui s'étend sur 100% de la hauteur de l'écran visible */
.page {
  height: 100vh;
  display: flex;
  justify-content: center; /* Alignement horizontal au centre */
  align-items: center;     /* Alignement vertical au centre */
  background: linear-gradient(135deg, #74b0bf, #0b6380); /* Fond avec dégradé bleu/cyan */
  color: black;
}

/* Style de la carte de formulaire (effet visuel de verre dépoli moderne) */
.card {
  background: rgba(255, 255, 255, 0.12); /* Fond blanc ultra-léger et transparent */
  padding: 28px;
  border-radius: 18px;
  width: 340px; /* Largeur fixe de la boîte */
  backdrop-filter: blur(6px); /* Floute le fond derrière la carte */
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2); /* Ombre externe douce */
}

/* Formatage global pour tous les champs d'entrée de texte et le bouton */
input,
button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border: none;
  border-radius: 10px;
  box-sizing: border-box; /* Évite les débordements de taille avec les paddings */
}

/* Supprime la bordure d'accentuation d'origine des navigateurs lors du clic sur un input */
input {
  outline: none;
}

/* Configuration esthétique du bouton d'inscription */
button {
  background: #74b0bf;
  color: black;
  font-weight: bold;
  cursor: pointer; /* Curseur en forme de main au survol */
}

/* Style appliqué lorsque le bouton est bloqué pendant le temps de chargement */
button:disabled {
  opacity: 0.6; /* Devient plus opaque */
  cursor: not-allowed; /* Curseur en forme de panneau interdit */
}

/* Couleur distinctive pour les messages de validation positive */
.success {
  color: #b7ffbf; /* Vert pastel */
  text-align: center;
  margin-top: 10px;
}

/* Couleur distinctive pour les alertes et les blocages */
.error {
  color: #ffb3c1; /* Rouge/rose pastel */
  text-align: center;
  margin-top: 10px;
}

/* Bloc contenant le texte d'aide à la navigation */
.link {
  text-align: center;
  margin-top: 15px;
  font-weight: bold;
}

/* Transforme le bouton textuel de connexion en lien cliquable */
.link span {
  cursor: pointer;
  text-decoration: underline; /* Ajoute un soulignement graphique */
}

/* =========================================================================
   MEDIA QUERIES : Règles d'adaptation responsive pour Tablettes et Mobiles
   ========================================================================= */

/*  ADAPTATION TABLETTE (Écrans inférieurs à 1024px) */
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

/* ADAPTATION PETIT TÉLÉPHONE (Écrans inférieurs à 480px) */
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
