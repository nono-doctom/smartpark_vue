<template>
  <div id="app">

    <header>
      SmartPark - Trouver et réserver votre place
    </header>

    <div class="container">

      <div class="sidebar">

        <div class="card">

          <h3>Recherche itinéraire</h3>

          <input v-model="destination" placeholder="Adresse" />

          <button @click="searchDestination">
            Afficher itinéraire
          </button>

        </div>

        <button @click="goProfil" class="btn-profile">
          Profil
        </button>

        <div class="card">

          <h3>Filtres</h3>

          <div class="filter-buttons">

            <button @click="loadAllParkings">Tous</button>

            <button @click="loadNearby">Parkings proches</button>

            <button @click="findBest">Meilleur</button>

            <button @click="showSubscribedOnly">Mes abonnements</button>

          </div>
        </div>
      </div>

      <div id="map"></div>

    </div>

    <div class="notifications">
      <div v-for="n in notifications" :key="n.id" class="toast">
        {{ n.msg }}
      </div>
    </div>

  </div>
</template>

<script>
// Importation des configurations globales de l'application (notamment l'URL racine de l'API)
import config from "@/config";
// Importation du client Socket.io pour la communication bidirectionnelle en temps réel avec le serveur
import { io } from "socket.io-client";
// Importation de la bibliothèque Leaflet pour la manipulation de cartes interactives
import L from "leaflet";
// Importation obligatoire des feuilles de style CSS de Leaflet pour le rendu correct de la carte
import "leaflet/dist/leaflet.css";
// Importation de l'extension de calcul d'itinéraires routiers pour Leaflet
import "leaflet-routing-machine";
// Importation du style graphique associé au traceur d'itinéraires et à ses panneaux textuels
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// Initialisation de la connexion Socket permanente avec le serveur Node.js distant
const socket = io(config.SOCKET_URL);

export default {
  // Nom unique d'identification du composant Vue
  name: "HomeView",

  // Mémoire réactive locale de l'écran cartographique
  data() {
    return {
      map: null,           // Instance principale de l'objet carte Leaflet
      markersLayer: null,  // Groupe de calques (LayerGroup) dédié à la gestion globale des marqueurs de parkings
      routeControl: null,  // Instance active du gestionnaire de tracé de route Leaflet Routing Machine

      lat: 43.3,           // Latitude géographique par défaut (coordonnées de secours si géolocalisation coupée)
      lng: 5.4,            // Longitude géographique par défaut

      destination: "",     // Chaîne de caractères de l'adresse tapée par l'utilisateur pour son trajet

      allParkings: [],     // Cache complet contenant tous les parkings récupérés sur la base de données
      viewParkings: [],    // Liste filtrée des parkings en cours d'affichage réel sur l'écran

      placesByParking: {}, // Dictionnaire associant à chaque ID de parking ses statistiques (places libres/totales)

      notifications: [],   // Tableau dynamique empilant les objets de notifications éphémères

      // Récupération des IDs de parkings abonnés stockés localement, ou création d'un tableau vide par défaut
      subscribedParkings: JSON.parse(
        localStorage.getItem("subscribedParkings") || "[]"
      )
    };
  },

  // Cycle de vie s'exécutant immédiatement dès que l'interface HTML est montée et prête
  mounted() {
    this.initMap();            // Initialise et affiche le fond de carte OpenStreetMap
    this.getLocation();        // Demande l'autorisation d'accéder à la position GPS de l'appareil
    this.loadAllParkings();    // Charge les données initiales des parkings depuis la base de données MySQL

    // Écouteur Socket : si une mise à jour globale survient sur le serveur, on recharge les données
    socket.on("update", () => {
      this.loadAllParkings();
    });

    // Écouteur Socket : s'exécute lorsqu'un capteur indique qu'une place s'est libérée quelque part
    socket.on("placeFree", data => {
      // Normalise la récupération de l'ID du parking (gère les différences de nommage camelCase/snake_case)
      const id = Number(data?.parkingId || data?.parking_id);

      // Si l'utilisateur est abonné à ce parking précis, on déclenche une notification visuelle instantanée
      if (this.subscribedParkings.includes(id)) {
        this.addNotification("🔔 Une place vient de se libérer !");
      }
    });
  },

  // Liste des fonctions et traitements logiques utilisables dans le composant
  methods: {

    // ==========================================
    // LOGIQUE DE GESTION DES NOTIFICATIONS (TOASTS)
    // ==========================================
    // Génère et affiche une alerte textuelle temporaire à l'écran
    addNotification(msg) {
      const id = Date.now(); // Crée un identifiant unique basé sur le timestamp de la milliseconde actuelle
      this.notifications.push({ id, msg }); // Ajoute la notification dans le tableau réactif

      // Programme la suppression automatique de cette notification après un délai de 4 secondes
      setTimeout(() => {
        this.notifications = this.notifications.filter(n => n.id !== id);
      }, 4000);
    },

    // ==========================================
    // SYSTEME D'ABONNEMENT ET DE FAVORIS
    // ==========================================
    // Alterne l'état d'abonnement (ajout ou retrait) pour un parking sélectionné
    toggleSubscription(id) {
      id = Number(id); // S'assure que l'identifiant est traité au format numérique pur

      const index = this.subscribedParkings.indexOf(id);

      if (index === -1) {
        // Le parking n'est pas dans la liste : on procède à l'abonnement
        this.subscribedParkings.push(id);
        socket.emit("subscribeParking", id); // Informe le serveur WebSocket pour recevoir les alertes ciblées
        this.addNotification(" Abonné au parking");
      } else {
        // Le parking est déjà dans la liste : on procède au désabonnement
        this.subscribedParkings.splice(index, 1);
        socket.emit("unsubscribeParking", id); // Annule l'inscription auprès du serveur WebSocket
        this.addNotification("Désabonné de ce parking");
      }

      // Sauvegarde la liste mise à jour dans le stockage persistant du navigateur
      localStorage.setItem(
        "subscribedParkings",
        JSON.stringify(this.subscribedParkings)
      );

      //  IMPORTANT : Rafraîchissement immédiat des marqueurs pour mettre à jour l'icône sur la carte
      this.renderMarkers();
    },

    // ==========================================
    // INSTANCIATION ET AFFICHAGE DE LA CARTE
    // ==========================================
    // Configure et charge les calques de la carte interactive Leaflet
    initMap() {
      // Associe Leaflet à la div HTML '#map', configure le centre de vue initial et le niveau de zoom
      this.map = L.map("map").setView([this.lat, this.lng], 13);

      // Charge les images des tuiles de cartes gratuites issues du serveur OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19 // Limite le niveau maximal de zoom autorisé pour éviter la perte de textures
      }).addTo(this.map);

      // Crée un conteneur de marqueurs vide attaché à la carte pour simplifier les effacements futurs
      this.markersLayer = L.layerGroup().addTo(this.map);
    },

    // Tente de récupérer la position physique réelle de l'utilisateur via l'API du navigateur
    getLocation() {
      navigator.geolocation?.getCurrentPosition(pos => {
        this.lat = pos.coords.latitude;  // Extrait la latitude GPS exacte
        this.lng = pos.coords.longitude; // Extrait la longitude GPS exacte
        this.map.setView([this.lat, this.lng], 14); // Déplace la caméra de la carte sur l'utilisateur
      });
    },

    // ==========================================
    // REQUETES ET TRAITEMENT DES DONNEES PARKING
    // ==========================================
    // Récupère l'intégralité des parkings et interroge l'état de leurs places via l'API REST
    async loadAllParkings() {
      // Effectue la requête HTTP GET pour lister les parkings généraux
      const res = await fetch(`${config.API_URL}/api/parkings`);
      const data = await res.json();

      this.allParkings = data; // Stocke la liste brute de référence
      this.viewParkings = data;  // Initialise la liste d'affichage avec l'intégralité des données

      this.placesByParking = {}; // Réinitialise l'objet d'indexation des statistiques

      // Pour chaque parking trouvé, lance une requête parallèle pour analyser l'occupation de ses places
      for (const p of data) {
        const r = await fetch(
          `${config.API_URL}/api/places?id=${p.id_parking}`
        );

        const places = await r.json();

        // Stocke et calcule le nombre exact de places occupées (état égal à 1) et le total des places
        this.placesByParking[p.id_parking] = {
          occupied: places.filter(x => x.etat_place === 1).length,
          total: places.length
        };
      }

      // Lance la mise en forme graphique des marqueurs sur la carte une fois les données mémorisées
      this.renderMarkers();
    },

    // ==========================================
    // DESSIN ET GENERATION DES MARQUEURS (MARKERS)
    // ==========================================
    // Parcourt la liste des parkings actifs pour dessiner les épingles correspondantes
    renderMarkers() {
      if (!this.markersLayer) return; // Sécurité si la couche graphique n'est pas encore instanciée

      this.markersLayer.clearLayers(); // Efface l'intégralité des anciens marqueurs de l'écran

      this.viewParkings.forEach(p => {
        // Récupère les données statistiques calculées pour le parking en cours
        const stats = this.placesByParking[p.id_parking];
        if (!stats) return; // Ignore le parking si ses compteurs de places n'ont pas fini de charger

        const free = stats.total - stats.occupied; // Déduit le nombre de places libres
        const ratio = stats.occupied / stats.total; // Établit le taux d'occupation (pourcentage décimal)

        // Algorithme de coloration dynamique selon le niveau de saturation du parking
        let color = "green"; // Vert par défaut : parking fluide et disponible
        if (ratio >= 0.7) color = "red"; // Rouge : parking presque saturé (70% et plus)
        else if (ratio >= 0.5) color = "orange"; // Orange : occupation moyenne (50% et plus)

        // Vérifie si l'utilisateur est abonné à ce parking spécifique
        const subscribed = this.subscribedParkings.includes(Number(p.id_parking));

        // Configuration visuelle de l'icône du marqueur
        const icon = L.icon({
          // Utilise une icône étoilée de l'API Google si abonné, sinon charge une épingle de couleur
          iconUrl: subscribed
            ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            : `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
          iconSize: [32, 32] // Calibre la taille d'affichage de l'image en pixels
        });

        // Crée le marqueur Leaflet physique avec les coordonnées et l'icône attribuée
        const marker = L.marker([p.latitude, p.longitude], { icon });

        // Génère le contenu au format HTML brut à injecter dans la bulle d'info (Popup) au clic du marqueur
        marker.bindPopup(`
          <b>${p.nom}</b><br>
          Remplissage : ${stats.occupied}/${stats.total}<br>
          ${free} places libres<br><br>

          <button id="go-${p.id_parking}">Y aller</button>
          <button id="r-${p.id_parking}">Réserver</button>
          <button id="s-${p.id_parking}">
            ${subscribed ? "Se désabonner" : "S'abonner"}
          </button>
        `);

        // Système d'écoute permettant d'attribuer les fonctions JavaScript aux boutons HTML dès l'ouverture de la popup
        marker.on("popupopen", () => {
          this.$nextTick(() => {
            // Assigne l'événement de tracé d'itinéraire au bouton 'Y aller'
            document.getElementById(`go-${p.id_parking}`).onclick =
              () => this.goToParking(p);

            // Redirige l'utilisateur vers la vue de réservation de place en transmettant l'ID en paramètre URL (query)
            document.getElementById(`r-${p.id_parking}`).onclick =
              () => this.$router.push({
                name: "reservation",
                query: { id: p.id_parking }
              });

            // Assigne la fonction d'abonnement/désabonnement au clic sur le bouton d'abonnement
            document.getElementById(`s-${p.id_parking}`).onclick =
              () => this.toggleSubscription(p.id_parking);
          });
        });

        // Ajoute le marqueur configuré au groupe graphique pour l'afficher sur la carte OpenStreetMap
        this.markersLayer.addLayer(marker);
      });
    },

    // ==========================================
    // LOGIQUE DE NAVIGATION (TRACAGE D'ITINERAIRE)
    // ==========================================
    // Calcule et affiche le tracé routier de la position GPS de l'utilisateur vers un parking précis
    goToParking(p) {
      // Supprime l'ancien tracé d'itinéraire de l'écran s'il y en avait déjà un actif
      if (this.routeControl) {
        this.map.removeControl(this.routeControl);
      }

      // Instancie le moteur Leaflet Routing Machine pour dessiner la ligne de guidage bleue
      this.routeControl = L.Routing.control({
        waypoints: [
          L.latLng(this.lat, this.lng),       // Point de départ : position actuelle de l'utilisateur
          L.latLng(p.latitude, p.longitude)   // Point d'arrivée : coordonnées du parking ciblé
        ],
        routeWhileDragging: false, // Désactive le recalcul dynamique pendant le glissement manuel des points
        addWaypoints: false,       // Interdit à l'utilisateur de rajouter des étapes intermédiaires sur le tracé
        language: "fr",            // Traduit les instructions textuelles de direction en français
        lineOptions: {
          styles: [{ color: "#0b6380", weight: 6 }] // Personnalise la couleur et l'épaisseur de la ligne de tracé
        }
      }).addTo(this.map); // Injecte l'itinéraire directement sur la carte

      this.addNotification("Itinéraire vers le parking");
    },

    // ==========================================
    // RECHERCHE D'ADRESSE ET GEOCONDITIONNEMENT
    // ==========================================
    // Interroge l'API OpenStreetMap Nominatim pour convertir une adresse textuelle en coordonnées GPS (Géocodage)
    async searchDestination() {
      if (!this.destination) {
        this.addNotification("Veuillez saisir une adresse");
        return;
      }

      try {
        // Requête vers le serveur de géocodage gratuit de Nominatim en encodant proprement le texte saisi
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.destination)}`
        );

        const data = await res.json();

        // Si l'API retourne un tableau vide, l'adresse n'a pas pu être géolocalisée
        if (!data.length) {
          this.addNotification(" Adresse introuvable");
          return;
        }

        const dest = data[0]; // Sélectionne le premier résultat de correspondance retourné
        const destLat = parseFloat(dest.lat); // Convertit la latitude texte en valeur décimale
        const destLng = parseFloat(dest.lon); // Convertit la longitude texte en valeur décimale

        // Centre immédiatement la vue de la carte sur l'adresse de destination localisée
        this.map.setView([destLat, destLng], 14);

        // Supprime l'ancienne ligne d'itinéraire si elle est présente
        if (this.routeControl) {
          this.map.removeControl(this.routeControl);
        }

        // Calcule le tracé routier complet menant de la position actuelle de l'utilisateur à l'adresse recherchée
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

        this.addNotification("🚗 Itinéraire affiché vers votre destination !");
      }
      catch (e) {
        console.error(e);
        this.addNotification("❌ Erreur lors de la recherche de l'itinéraire");
      }
    },

    // Navigue vers l'écran de configuration du profil utilisateur
    goProfil() {
      this.$router.push("/profil");
    },

    // Filtre la liste pour n'afficher que les parkings situés dans un rayon géographique restreint
    loadNearby() {
      this.viewParkings = this.allParkings.filter(p =>
        // Calcule l'hypoténuse de distance mathématique brute (approximation vectorielle de proximité)
        Math.hypot(this.lat - p.latitude, this.lng - p.longitude) < 0.02
      );
      // Re-génère l'affichage des épingles filtrées
      this.renderMarkers();
    },

    // Détermine algorithmiquement le meilleur choix de parking (compromis distance minimale et places vides maximales)
    findBest() {
      let best = null;
      let bestScore = Infinity; // Initialise le score au plus haut niveau pour trouver un minimum

      this.allParkings.forEach(p => {
        const s = this.placesByParking[p.id_parking];
        if (!s || s.total === 0) return; // Écarte les parkings sans places ou non chargés

        // Formule de calcul du score : Distance brute + (Taux d'occupation). Le plus petit score gagne.
        const score =
          Math.hypot(this.lat - p.latitude, this.lng - p.longitude) +
          (1 - (s.total - s.occupied) / s.total);

        if (score < bestScore) {
          bestScore = score;
          best = p; // Retient temporairement le parking le plus optimal
        }
      });

      // Si un parking optimal est identifié, on focalise la caméra et zoom fortement dessus
      if (best) {
        this.map.setView([best.latitude, best.longitude], 16);
        this.addNotification(`Parking conseillé : ${best.nom}`);
      }
    },

    // Filtre la vue pour isoler uniquement les parkings cochés en abonnements/favoris par le conducteur
    showSubscribedOnly() {
      this.viewParkings = this.allParkings.filter(p =>
        this.subscribedParkings.includes(Number(p.id_parking))
      );
      // Met à jour la carte avec la sélection exclusive
      this.renderMarkers();
    }

  }
};
</script>

<style>
/* ===================================================
   CONFIGURATION DES STYLES GENERAUX DE BASE
   =================================================== */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: "Segoe UI", Arial, sans-serif;
  background: #74b0bf;
}

/* Conteneur applicatif configuré en boîte flexible verticale occupent tout l'écran */
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Style de la barre d'en-tête supérieure */
header {
  background: #0b6380;
  color: white;
  padding: 20px;
  text-align: center;
  font-weight: bold;
  font-size: 20px;
  flex-shrink: 0; /* Empêche l'en-tête de se compresser si l'écran manque d'espace */
}

/* Zone de contenu flexible accueillant la barre latérale et la carte */
.container {
  display: flex;
  flex: 1;
  overflow: hidden; /* Empêche les éléments internes de générer des barres de défilement parasites */
}

/* ===================================================
   DESIGN DE LA BARRE LATERALE (SIDEBAR)
   =================================================== */
.sidebar {
  width: 320px; /* Largeur fixe de la barre latérale sur ordinateur */
  background: #74b0bf;
  padding: 16px;
  box-sizing: border-box; /* Intègre le padding dans la largeur totale de 320px */
  overflow-y: auto; /* Permet de scroller en interne dans la barre si les cartes débordent */
}

/* Cartes blanches au design épuré contenant les sections de l'application */
.card {
  background: rgba(255, 255, 255, 0.92);
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 14px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Légère ombre douce pour donner du relief */
}

.card h3 {
  margin-top: 0; /* Supprime l'espacement supérieur d'origine du titre */
  color: #0b6380;
}

/* Marge de sécurité sous le bouton profil pour ne pas coller à la suite */
.btn-profile {
  margin-bottom: 16px;
}

/* ===================================================
   DESIGN DES FORMULAIRES ET BOUTONS INTERFACES
   =================================================== */
input {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #ccc;
  box-sizing: border-box;
  margin-bottom: 8px;
}

button {
  width: 100%;
  padding: 12px;
  background: #0b6380;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s; /* Effet de transition fluide lors du survol de la souris */
}

/* Assombrissement de la couleur du bouton lorsque l'utilisateur l'effleure */
button:hover {
  background: #08495e;
}

/* ===================================================
   PROPRIETES GRAPHIQUES DU BLOC DE LA CARTE (MAP)
   =================================================== */
#map {
  flex: 1; /* Force la carte à s'étendre sur l'intégralité de l'espace horizontal restant */
  height: 100%;
}

/* ===================================================
   ALERTE FLOTTANTE DES NOTIFICATIONS (TOASTS)
   =================================================== */
.notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000; /* Force l'affichage au-premier plan absolute, au-dessus des calques de Leaflet */
}

/* Style de la bulle de notification éphémère */
.toast {
  background: #0b6380;
  color: white;
  padding: 12px 24px;
  margin-top: 10px;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

/* Alignement et espacement structurel des filtres de parkings */
.filter-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px; /* Propriété gérant l'espacement régulier de 10px entre chaque bouton */
}

/* ===================================================
   REGLES RESPONSIVE : MOBILES ET TABLETTES (< 768px)
   =================================================== */
@media (max-width: 768px) {
  header {
    font-size: 16px;
    padding: 12px;
  }

  /* Bascule l'agencement en colonne (la carte passe en haut, les commandes en bas) */
  .container {
    flex-direction: column; 
    overflow: auto; /* Active le défilement global de l'écran sur mobile */
  }

  /* Redimensionne la barre latérale pour qu'elle s'adapte sur toute la largeur de l'écran du smartphone */
  .sidebar {
    width: 100%;
    max-height: none;
    overflow-y: visible;
    order: 2; /* Force la barre latérale à s'afficher en deuxième position (en bas) */
  }

  /* Calibre une hauteur fixe idéale pour l'espace cartographique sur l'écran d'un mobile */
  #map {
    width: 100%;
    height: 50vh; /* La carte occupera exactement la moitié de la hauteur de l'écran visible */
    flex: none; /* Annule la propriété flex: 1 pour préserver la hauteur fixe de 50vh */
    order: 1; /* Force la carte à se positionner en première place tout en haut de l'écran */
  }

  .filter-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Ajustements pour maximiser l'espace et le confort tactile sur smartphone */
  .filter-buttons button {
    margin-top: 0;
    padding: 10px; /* Format légèrement condensé pour les petits écrans */
  }
}

/* ===================================================
   CORRECTION DE L'ESPACEMENT DES BOUTONS DE POPUPS LEAFLET
   =================================================== */
/* S'assure que les boutons empilés à l'intérieur des popups de la carte soient aérés */
.leaflet-popup-content button {
  margin-bottom: 8px; /* Ajoute un espace sous chaque bouton de l'infobulle */
}

/* Supprime la marge sous le tout dernier bouton pour garantir une symétrie parfaite de la boîte */
.leaflet-popup-content button:last-child {
  margin-bottom: 0;
}
</style>
