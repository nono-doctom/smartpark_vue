<template>
  <div class="page">

    <header>SmartPark - Mon Profil</header>

    <div class="container">

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

        <div v-for="v in vehicules" :key="v.id_vehicule" class="plate">

          <div class="plaque">
            {{ v.plaque_immatriculation }}
          </div>

          <div class="type">
            {{ formatType(v.type_vehicule || v.nom_type || "voiture") }}
          </div>

          <button class="danger" @click="deleteVehicule(v.id_vehicule)">
            Supprimer
          </button>

        </div>

      </div>

      <div class="card">

        <button
          class="primary map-btn"
          :disabled="!isProfileComplete"
          @click="goHome"
        >
          Carte des parking et leur disponibilité
        </button>

        <p v-if="!isProfileComplete" class="error">
          ⚠️ Complète ton profil avant d’accéder à la carte
        </p>
      </div>

    </div>

  </div>
</template>

<script>
// Importation du fichier de configuration globale contenant les liens URL de l'API backend
import config from "@/config";

export default {
  // Nom d'identification de ce composant Vue.js
  name: "ProfilView",

  // Mémoire locale réactive du composant
  data() {
    return {
      // Tente de récupérer les informations de l'utilisateur stockées dans le navigateur, sinon crée un objet vide
      user: JSON.parse(localStorage.getItem("user")) || {},
      // Tableau destiné à stocker la liste des véhicules récupérés depuis l'API MySQL
      vehicules: [],
      // Variable temporaire stockant la plaque d'immatriculation en cours de saisie
      newPlaque: "",
      // Variable temporaire stockant le type de véhicule choisi dans le menu déroulant
      newType: "",
      // Texte du message de réussite pour la modification du profil utilisateur
      success: "",
      // Texte d'erreur pour les actions liées aux véhicules
      vehiculeError: "",
      // Texte de succès pour les actions liées aux véhicules
      vehiculeSuccess: ""
    };
  },

  // Propriétés calculées qui s'actualisent automatiquement dès qu'une variable dépendante change
  computed: {
    // Vérifie si le nom, le prénom et l'adresse email de l'utilisateur ne sont pas vides
    isProfileComplete() {
      return this.user.nom && this.user.prenom && this.user.email;
    }
  },

  // S'exécute automatiquement dès que le composant s'affiche sur l'écran
  mounted() {
    // Déclenche le chargement de la liste des véhicules de l'utilisateur
    this.loadVehicules();
  },

  // Boîte à outils contenant les fonctions exécutables depuis l'interface
  methods: {

    // Construit les en-têtes HTTP de sécurité avec le jeton (Token JWT) requis par l'API backend
    getHeaders() {
      // Récupère le jeton de session dans la mémoire locale du navigateur
      const token = localStorage.getItem("token");

      return {
        // Ajoute le jeton selon le protocole de sécurité standard Bearer
        Authorization: "Bearer " + token,
        // Spécifie au serveur que nous communiquons exclusivement au format JSON
        "Content-Type": "application/json"
      };
    },

    // Redirige l'utilisateur vers l'écran de la carte générale des parkings (`/map`)
    goHome() {
      this.$router.push("/map");
    },

    // Appelle l'API en mode sécurisé pour obtenir la liste complète des véhicules du conducteur
    async loadVehicules() {
      try {
        // Envoie une requête GET à l'adresse de récupération des véhicules
        const res = await fetch(
          `${config.API_URL}/api/vehicules`,
          {
            headers: this.getHeaders() // Intègre le jeton d'authentification
          }
        );

        // Convertit le flux texte de réponse en objet JavaScript exploitable
        const data = await res.json();

        // Si le serveur backend retourne un code d'erreur (ex: Token invalide ou expiré)
        if (!res.ok) {
          // Affiche le message d'erreur fourni par l'API ou un texte de secours
          this.vehiculeError = data.error || "Erreur API";
          return;
        }

        // Affiche la liste brute reçue dans les logs de développement du navigateur
        console.log("VEHICULES API =>", data);

        // Assigne la liste des véhicules au tableau local pour mettre à jour l'affichage
        this.vehicules = data;

      } catch (err) {
        // Capture les pannes réseau ou serveurs éteints
        this.vehiculeError = "Erreur chargement véhicules";
      }
    },

    // Envoie un formulaire au serveur backend pour enregistrer un nouveau véhicule
    async addVehicule() {
      try {
        // Transmet une requête de type POST contenant la plaque et le type saisis
        const res = await fetch(
          `${config.API_URL}/api/vehicules`,
          {
            method: "POST", // Utilise la méthode POST pour la création de ressource
            headers: this.getHeaders(),
            body: JSON.stringify({
              plaque: this.newPlaque,
              type: this.newType
            })
          }
        );

        // Récupère la réponse JSON renvoyée par la base de données
        const data = await res.json();

        // Si l'insertion est refusée (champs manquants, type incorrect, etc.)
        if (!res.ok) {
          // Affiche le message d'erreur renvoyé par le serveur
          this.vehiculeError = data.error || "Erreur ajout";
          return;
        }

        // Configure les messages de retour utilisateur en cas de succès
        this.vehiculeSuccess = "Véhicule ajouté ✔";
        this.vehiculeError = "";

        // Réinitialise les champs de saisie à blanc pour permettre un nouvel ajout
        this.newPlaque = "";
        this.newType = "";

        // Relance un chargement complet pour rafraîchir la liste affichée à l'écran
        await this.loadVehicules();

      } catch (err) {
        // Capture les échecs de connexion réseau avec le serveur
        this.vehiculeError = "Erreur serveur";
      }
    },

    // Demande au serveur de supprimer définitivement un véhicule précis via son identifiant numérique
    async deleteVehicule(id) {
      try {
        // Envoie une requête HTTP DELETE en plaçant l'ID directement dans l'adresse URL
        const res = await fetch(
          `${config.API_URL}/api/vehicules/${id}`,
          {
            method: "DELETE", // Méthode REST dédiée à la suppression
            headers: this.getHeaders()
          }
        );

        // Traduit la réponse du serveur
        const data = await res.json();

        // Si le serveur rejette la suppression (véhicule introuvable ou n'appartenant pas à l'utilisateur)
        if (!res.ok) {
          this.vehiculeError = data.error || "Erreur suppression";
          return;
        }

        // Efface les anciens messages d'erreur et rafraîchit instantanément la liste à l'écran
        this.vehiculeError = "";
        await this.loadVehicules();

      } catch (err) {
        // Gestion des pannes de communication réseau
        this.vehiculeError = "Erreur suppression";
      }
    },

    // Enregistre les modifications textuelles du profil utilisateur dans le stockage interne du navigateur
    saveUser() {
      // Convertit l'objet utilisateur en chaîne texte JSON pour l'enregistrer dans le localStorage
      localStorage.setItem("user", JSON.stringify(this.user));
      // Affiche une alerte de validation verte à l'écran
      this.success = "Profil sauvegardé ✔";
    },

    // Formate et associe proprement un émoji texte à la catégorie de véhicule stockée en base de données
    formatType(type) {
      // Si la variable de type n'existe pas, retourne la valeur standard par défaut
      if (!type) return "🚗 Voiture";

      // Transforme le texte en minuscules pour s'affranchir des problèmes de casse
      const t = type.toLowerCase();

      // Vérifie si la chaîne contient le mot-clé moto et retourne la mise en forme adaptée
      if (t.includes("moto")) return "🏍 Moto";
      // Vérifie si la chaîne contient le mot-clé handicap et retourne la mise en forme adaptée
      if (t.includes("handicap")) return "♿ Handicapé";

      // Retourne la catégorie par défaut si aucune correspondance spécifique n'est détectée
      return "🚗 Voiture";
    }
  }
};
</script>

<style scoped>
/* Force tous les éléments à intégrer les bordures et les paddings dans le calcul de leur largeur totale */
* {
  box-sizing: border-box;
}

/* Configuration visuelle de fond et de dimension pour la structure de la page */
.page {
  min-height: 100vh; /* Occupe toute la hauteur disponible de l'écran */
  font-family: "Segoe UI", sans-serif; /* Typographie moderne sans empattement */
  background: linear-gradient(135deg, #74b0bf, #0b6380); /* Dégradé bleu/cyan oblique */
  display: flex;
  flex-direction: column; /* Aligne l'en-tête et le contenu verticalement */
  align-items: center; /* Centre le tout horizontalement */
  padding: 30px;
}

/* Zone limitant la largeur des cartes d'informations */
.container {
  width: 480px; /* Largeur fixe idéale pour l'alignement */
  display: flex;
  flex-direction: column;
  gap: 20px; /* Espace régulier entre chaque bloc de carte */

  max-height: 80vh; /* Limite la hauteur globale pour éviter les débordements */
  overflow-y: auto; /* Active un défilement vertical interne si le contenu dépasse */
  padding-right: 8px;
}

/* Style spécifique appliqué au bouton d'accès à la carte des parkings */
.map-btn {
  font-size: 16px;
  padding: 15px;
}

/* Personnalisation graphique de la barre de défilement pour les navigateurs basés sur Webkit */
.container::-webkit-scrollbar {
  width: 8px;
}

/* Style de la glissière mobile de la barre de défilement */
.container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3); /* Blanc semi-transparent */
  border-radius: 20px;
}

/* Style du titre d'en-tête de la page */
header {
  text-align: center;
  font-size: 26px;
  font-weight: 700; /* Style de police très gras */
  padding: 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1); /* Voile blanc léger */
  color: white;
}

/* Cartes transparentes contenant les différents formulaires */
.card {
  background: rgba(255, 255, 255, 0.08); /* Effet de flou de verre moderne */
  padding: 16px;
  border-radius: 20px;
  color: white;
}

/* Configuration uniforme des éléments de saisie textuelle et des menus */
input,
select {
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  border-radius: 12px;
  border: none; /* Supprime la bordure grise classique des navigateurs */
}

/* Configuration générique de tous les boutons cliquables */
button {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border-radius: 12px;
  border: none;
  cursor: pointer; /* Modifie le pointeur de la souris en main au survol */
  font-weight: bold;
}

/* Couleur distinctive pour les boutons d'action principale (couleur cyan) */
.primary {
  background: #74b0bf;
  color: white;
}

/* Couleur distinctive pour les boutons d'effacement ou de suppression (couleur rouge) */
.danger {
  background: #ef4444;
  color: white;
}

/* Conteneur d'affichage de chaque plaque d'immatriculation */
.plate {
  background: white;
  color: black;
  padding: 12px;
  border-radius: 12px;
  text-align: center;
  margin-top: 12px;
}

/* Met en valeur l'écriture des numéros de plaques d'immatriculation */
.plaque {
  font-weight: bold;
}

/* Zone d'affichage discrète pour le type de véhicule sous la plaque */
.type {
  font-size: 12px;
  color: gray;
  margin-top: 4px;
}

/* Style de couleur pour les messages de validation */
.success {
  color: #22c55e; /* Vert vif */
}

/* Style de couleur pour les messages d'alerte et de blocage */
.error {
  color: #f87171; /* Rouge pastel */
}

/* =========================================================================
   MEDIA QUERIES : Règles d'adaptation responsive pour Tablettes et Mobiles
   ========================================================================= */

/* ADAPTATION TABLETTE (Écrans inférieurs à 1024px) */
@media (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(4, 1fr); /* Divise les grilles en 4 colonnes régulières */
  }

  .layout {
    flex-direction: row; /* Maintient l'affichage en ligne des panneaux */
  }

  .panel {
    width: 220px; /* Réduit la largeur du volet latéral */
  }
}

/* ADAPTATION MOBILE STANDARD (Écrans inférieurs à 768px) */
@media (max-width: 768px) {
  .layout {
    flex-direction: column; /* Aligne tous les blocs verticalement sur les petits écrans */
  }

  .panel {
    width: 100%; /* Le panneau s'étend sur toute la largeur disponible */
  }

  .grid {
    grid-template-columns: repeat(3, 1fr); /* Réduit les grilles de places à 3 colonnes */
  }

  header {
    font-size: 16px; /* Diminue la taille du texte d'en-tête */
    padding: 12px;
  }

  .spot {
    padding: 10px;
    font-size: 13px; /* Réduit la taille des étiquettes des places de parking */
  }

  .btn {
    width: 100%; /* Force les boutons à prendre toute la largeur disponible */
  }

  .actions {
    flex-direction: column; /* Aligne les boutons d'action du bas l'un sous l'autre */
    align-items: stretch;
  }
}

/*  ADAPTATION PETIT TÉLÉPHONE (Écrans inférieurs à 480px) */
@media (max-width: 480px) {
  .grid {
    grid-template-columns: repeat(2, 1fr); /* Aligne les places sur 2 colonnes seulement */
  }

  .spot {
    padding: 8px; /* Réduit la taille interne pour gagner de la place */
  }

  .panel {
    font-size: 13px; /* Réduit la taille globale des textes d'informations */
  }
}
</style>
