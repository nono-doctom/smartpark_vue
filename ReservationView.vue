<template>
  <div class="page">
    <transition name="toast">
      <div v-if="notifMessage" class="notif-toast" :class="notifType">
        <span class="notif-icon">{{ notifIcon }}</span>
        <span class="notif-text">{{ notifMessage }}</span>
      </div>
    </transition>

    <header class="main-header">
      <div class="header-content">
        <h1>SmartPark <span class="badge-accent">Réservation</span></h1>
      </div>
    </header>

    <div class="layout">
      <aside class="panel">
        <h2 class="panel-title">Ma Réservation</h2>
        
        <div class="info-card">
          <div class="info-row">
            <span class="label">Parking</span> 
            <span class="value text-highlight">N° {{ idParking }}</span>
          </div>
          <div class="info-row">
            <span class="label">Place ciblée</span> 
            <span class="value font-mono">{{ selectedPlace || "—" }}</span>
          </div>
          <div class="info-row highlight-row" :class="{ 'has-reserve': myReservedPlace }">
            <span class="label">Place acquise</span> 
            <span class="value font-mono highlight-text">{{ myReservedPlace || "Aucune" }}</span>
          </div>

          <div class="input-group">
            <label for="vehicule-select">Mon Véhicule</label>
            <div class="select-wrapper">
              <select id="vehicule-select" v-model="idVehicule" :disabled="myReservedPlace !== null">
                <option disabled value="">Sélectionnez un véhicule</option>
                <option v-for="v in vehicules" :key="v.id_vehicule" :value="v.id_vehicule">
                  {{ v.plaque_immatriculation }} ({{ v.type_vehicule || 'Auto' }})
                </option>
              </select>
            </div>
          </div>

          <!-- Affichage du compte à rebours persistant -->
          <div v-if="remainingTime > 0" class="timer-box" :class="{ 'timer-urgent': remainingTime < 300 }">
            <div class="timer-header">
              <span class="pulse-dot"></span>
              <span class="timer-label">Temps restant</span>
            </div>
            <div class="timer-value">
              {{ formattedTime }}
            </div>
          </div>
        </div>

        <button class="btn btn-subscription" :class="{ 'subscribed': subscribed }" @click="toggleSubscription">
          {{ subscribed ? "Se désabonner du parking" : "S'abonner au parking" }}
        </button>
      </aside>

      <main class="grid-container">
        <div class="grid-scroll">
          <div class="grid">
            <div 
              v-for="p in places" 
              :key="p.num_place" 
              class="spot" 
              :class="spotClass(p)" 
              @click="selectPlace(p)"
            >
              <div v-if="myReservedPlace === p.num_place" class="spot-badge">ma place</div>
              <div class="spot-num">{{ p.num_place }}</div>
              <div class="spot-type">{{ typeLabel(p) }}</div>
              <div class="spot-indicator"></div>
            </div>
          </div>
        </div>

        <div class="actions">
          <button 
            class="btn btn-primary" 
            :disabled="!selectedPlace || !idVehicule || myReservedPlace || isLoading" 
            @click="reserve"
          >
            <span v-if="isLoading" class="spinner"></span>
            <span>{{ isLoading ? "Réservation en cours..." : "Confirmer la réservation" }}</span>
          </button>
          
          <button 
            class="btn btn-danger" 
            :disabled="!lastReservationId || isLoading" 
            @click="cancelReservation"
          >
            <span>Annuler ma place</span>
          </button>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import config from "@/config"; // Importe les adresses URL de l'API et des sockets depuis le fichier de configuration centralisé
import { io } from "socket.io-client"; // Importe la bibliothèque officielle pour communiquer en temps réel via WebSockets

const socket = io(config.SOCKET_URL); // Ouvre la connexion WebSocket permanente avec le serveur en tâche de fond

export default {
  data() { // Fonction contenant toutes les variables locales du composant (l'état réactif)
    return {
      idParking: null, // Stocke l'identifiant du parking extrait de l'URL
      places: [], // Tableau contenant la liste complète des places (reçue de la base de données)
      vehicules: [], // Tableau contenant la liste des véhicules appartenant à l'utilisateur connecté
      selectedPlace: null, // Stocke temporairement le numéro de la place sur laquelle l'utilisateur vient de cliquer
      myReservedPlace: null, // Stocke le numéro de la place définitivement validée par le serveur pour cet utilisateur
      lastReservationId: null, // Garde en mémoire l'ID numérique de la ligne de réservation (utile pour l'annulation)
      idVehicule: "", // Identifiant du véhicule sélectionné dans le menu déroulant
      
      notifMessage: "", // Contenu texte de l'alerte toast à afficher en haut de l'écran
      notifType: "info", // Type d'alerte (détermine la couleur : 'info' pour jaune, 'error' pour rouge, 'success' pour vert)
      isLoading: false, // Variable d'état pour bloquer l'interface pendant les requêtes réseau (anti-double-clic)
      
      remainingTime: 0, // Compteur de secondes restantes pour la réservation (ex: 1800 secondes = 30 min)
      timerInterval: null, // Stocke l'identifiant du setInterval JavaScript pour pouvoir le détruire proprement
      subscribed: false, // Savoir si l'utilisateur écoute activement les notifications en temps réel de ce parking

      fakeNotifTimeout: null // Stocke l'identifiant du minuteur du simulateur d'activité de fausses voitures
    };
  },
  
  computed: { // Fonctions calculées automatiquement. Elles se mettent à jour uniquement si leurs variables internes changent.
    formattedTime() { // Convertit le nombre brut de secondes (this.remainingTime) en texte lisible
      const m = Math.floor(this.remainingTime / 60); // Calcule le nombre entier de minutes restantes
      const s = this.remainingTime % 60; // Récupère le reste des secondes (le modulo)
      return `${m}:${s < 10 ? "0" : ""}${s}`; // Aligne l'affichage en ajoutant un "0" devant les secondes inférieures à 10 (ex: "29:05")
    },
    notifIcon() { // Emplacement vide prévu pour retourner des émojis ou icônes spécifiques selon le type d'alerte
      return "";
    }
  },
  
  mounted() { // Fonction automatique exécutée par Vue dès que le composant est injecté et visible sur l'écran
    this.idParking = this.$route.query.id; // Lit les paramètres de l'URL pour savoir quel parking afficher (ex: ?id=3)
    this.loadPlaces(); // Lance la requête de récupération des places du parking actuel
    this.loadVehicules(); // Lance la requête de récupération des véhicules de l'utilisateur
    this.loadMyReservation(); // Vérifie auprès du serveur si l'utilisateur possède déjà un ticket actif pour ce parking
    
    socket.emit("subscribeParking", this.idParking); // Envoie un message au serveur Socket pour rejoindre la "chambre" de ce parking précis
    this.subscribed = true; // Passe le statut d'abonnement WebSocket à vrai
    this.startFakeNotifications(); // Démarre le simulateur d'activité aléatoire en arrière-plan
    
    socket.on("update", () => { // Écoute le serveur : si un autre utilisateur change une place, le serveur crie "update"
      this.loadPlaces(); // On recharge instantanément les places pour être à jour sans rafraîchir
    });
    
    socket.on("placeFree", (data) => { // Écoute le serveur : si une place précise se libère n'importe où sur l'application
      const numeroPlace = data.num_place || data.numero || ""; // Extrait le numéro de la place concernée du message réseau
      this.showNotif(`La place ${numeroPlace} s'est libérée !`, "info"); // Affiche un toast jaune à l'écran pour alerter l'utilisateur
      const localSpot = this.places.find(p => p.num_place === numeroPlace); // Recherche cette place dans la liste locale de l'écran
      if (localSpot) localSpot.etat_place = 0; // Passe directement son état à libre (0) pour éviter d'attendre un appel API
    });
  },

  unmounted() { // Fonction automatique exécutée au moment où l'utilisateur quitte la page actuelle
    this.stopTimer(); // Détruit le compte à rebours pour économiser le processeur
    this.stopFakeNotifications(); // Arrête le simulateur de trafic artificiel pour éviter les bugs en arrière-plan
  },
  
  methods: { // Liste de toutes les fonctions manuelles utilisables dans le composant
    showNotif(msg, type = "info") { // Affiche un toast d'alerte à l'écran avec un message et une couleur
      this.notifMessage = msg; // Remplit le texte de l'alerte, ce qui déclenche son affichage visuel
      this.notifType = type; // Configure sa couleur (error, success, info)
      setTimeout(() => (this.notifMessage = ""), 5000); // Programme l'effacement automatique du message au bout de 5 secondes
    },

    // --- SIMULATEUR ---
    startFakeNotifications() { // Initialise la boucle de génération de faux trafic pour les tests
      this.stopFakeNotifications(); // Sécurité : arrête une ancienne boucle si elle tournait déjà
      const loop = () => { // Définition d'une sous-fonction récursive
        const randomDelay = Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000; // Tire un nombre au hasard entre 3000 et 6000 millisecondes (3 à 6s)
        this.fakeNotifTimeout = setTimeout(() => { // Démarre un minuteur avec ce délai aléatoire
          if (this.places && this.places.length > 0) { // S'assure que la liste des places est bien chargée avant d'agir
            const actionType = Math.random() > 0.5 ? 'liberer' : 'occuper'; // Une chance sur deux d'occuper ou de libérer une place
            if (actionType === 'liberer') { // Scénario de libération de place
              const busyPlaces = this.places.filter(p => p.etat_place === 1 && p.num_place !== this.myReservedPlace); // Isole les places actuellement prises (en évitant la nôtre)
              if (busyPlaces.length > 0) { // S'il y a effectivement des places occupées à libérer
                const randomSpot = busyPlaces[Math.floor(Math.random() * busyPlaces.length)]; // Sélectionne une place occupée au hasard
                randomSpot.etat_place = 0; // Modifie son état localement à libre (0)
                this.showNotif(`La place ${randomSpot.num_place} s'est libérée !`, "info"); // Alerte l'utilisateur par notification
              } else {
                this.forceOccuperPlace(); // S'il n'y avait aucune place occupée, on force une occupation à la place
              }
            } else {
              this.forceOccuperPlace(); // Scénario tiré au sort : occuper une place
            }
          }
          loop(); // Relance la fonction pour créer le prochain événement aléatoire en chaîne
        }, randomDelay);
      };
      loop(); // Premier démarrage manuel de la boucle de simulation
    },

    forceOccuperPlace() { // Sous-fonction du simulateur dédiée à l'occupation d'une place libre
      const freePlaces = this.places.filter(p => p.etat_place === 0 && p.num_place !== this.myReservedPlace && p.num_place !== this.selectedPlace); // Filtre les places vertes (sans toucher à la nôtre ni à celle cliquée)
      if (freePlaces.length > 0) { // S'il reste des places libres dans le parking
        const randomSpot = freePlaces[Math.floor(Math.random() * freePlaces.length)]; // En choisit une au hasard
        randomSpot.etat_place = 1; // La passe artificiellement en rouge (occupée = 1)
        this.showNotif(`La place ${randomSpot.num_place} vient d'être occupée !`, "error"); // Déclenche un toast d'alerte rouge
      }
    },

    stopFakeNotifications() { // Coupe proprement le simulateur d'événements
      if (this.fakeNotifTimeout) { // Si un minuteur était programmé en mémoire
        clearTimeout(this.fakeNotifTimeout); // Annule le minuteur JavaScript
        this.fakeNotifTimeout = null; // Remet la variable à zéro
      }
    },
    
    toggleSubscription() { // Permet de couper ou relancer l'écoute WebSocket en temps réel
      if (this.subscribed) { // Si l'utilisateur était connecté aux signaux du parking
        socket.emit("unsubscribeParking", this.idParking); // Dit au serveur de nous retirer de la liste de diffusion
        this.subscribed = false; // Met à jour l'état de l'interface
        this.stopFakeNotifications(); // Arrête également le simulateur local
        this.showNotif("Désabonnement au Parking", "info"); // Affiche la confirmation
      } else { // S'il était déconnecté
        socket.emit("subscribeParking", this.idParking); // Demande au serveur de rejoindre la chambre de diffusion
        this.subscribed = true; // Change l'état de l'interface
        this.startFakeNotifications(); // Relance le simulateur local
        this.showNotif("Abonnement au Parking activé !", "success"); // Notifie en vert
      }
    },

    getHeaders() { // Fonction utilitaire pour générer la configuration d'autorisation réseau
      return {
        Authorization: "Bearer " + localStorage.getItem("token"), // Injecte le jeton JWT secret stocké lors de la connexion
        "Content-Type": "application/json" // Spécifie au serveur que les données envoyées seront au format JSON
      };
    },

    // =========================================================================
    // MANAGEMENT DU COMPTE À REBOURS ET PERSISTANCE PAR TIMESTAMP
    // =========================================================================
    startTimer(seconds) { // Initialise un compte à rebours persistant basé sur le temps réel
      this.stopTimer(); // Supprime un éventuel chrono qui tournait déjà pour éviter les doublons

      // 🔥 LIGNE CRUCIALE ANTI-F5 : Calcule la date exacte d'extinction en millisecondes (Heure courante + secondes restantes converties en ms)
      const endTimeStamp = Date.now() + (seconds * 1000);
      
      // Sauvegarde cette date d'extinction fixe directement dans le disque dur du navigateur
      localStorage.setItem("smartpark_timer_end", endTimeStamp);

      this.runTimerLoop(endTimeStamp); // Lance la boucle d'affichage du chrono
    },

    runTimerLoop(endTimeStamp) { // Boucle interne de mise à jour du chronomètre graphique
      const updateTimer = () => { // Fonction interne de calcul de l'écart
        const now = Date.now(); // Relève l'heure exacte à la milliseconde près à cet instant précis
        // Calcule l'écart en secondes entre l'heure de fin prévue et l'heure actuelle
        const distance = Math.floor((endTimeStamp - now) / 1000);

        if (distance > 0) { // Si la date de fin est encore dans le futur
          this.remainingTime = distance; // Met à jour le nombre de secondes (ce qui fait changer les chiffres à l'écran)
        } else { // Si le temps est totalement écoulé
          this.stopTimer(); // Coupe proprement le chrono
          this.loadMyReservation(); // Force une vérification générale auprès du serveur pour nettoyer l'affichage
        }
      };

      updateTimer(); // Exécute la fonction immédiatement une première fois pour éviter un blanc d'une seconde à l'écran
      this.timerInterval = setInterval(updateTimer, 1000); // Configure une répétition automatique toutes les 1000ms (1 seconde)
    },

    stopTimer() { // Arrête et nettoie complètement le chronomètre
      if (this.timerInterval) { // Si un intervalle est actif
        clearInterval(this.timerInterval); // Supprime l'intervalle système de la mémoire
        this.timerInterval = null; // Efface la variable
      }
      this.remainingTime = 0; // Remet le compteur de secondes à zéro
      localStorage.removeItem("smartpark_timer_end"); // Supprime la clé de sauvegarde pour éviter qu'il reparte au prochain F5
    },
    
    async loadPlaces() { // Requête HTTP pour récupérer la liste des places depuis l'API
      try {
        const r = await fetch(`${config.API_URL}/api/places?id=${this.idParking}`); // Envoie une requête GET avec l'ID du parking
        this.places = await r.json(); // Convertit la réponse brute de la base de données en tableau exploitable
      } catch (err) {
        this.showNotif("Impossible de charger les places", "error"); // Affiche un message d'erreur si le backend est injoignable
      }
    },
    
    async loadVehicules() { // Requête HTTP pour récupérer les voitures de l'utilisateur connecté
      try {
        const r = await fetch(`${config.API_URL}/api/vehicules`, { headers: this.getHeaders() }); // Envoie la requête GET en y joignant le token d'authentification
        this.vehicules = await r.json(); // Range la liste des véhicules reçue dans le tableau d'options
      } catch (err) {
        console.error("loadVehicules error:", err); // Écrit la panne dans la console pour le développeur
      }
    },
    
    async loadMyReservation() { // Vérifie l'état actuel des réservations de l'utilisateur au chargement (ou après F5)
      try {
        const r = await fetch(`${config.API_URL}/api/reservation/active`, { headers: this.getHeaders() }); // Interroge l'API pour voir s'il y a un ticket actif
        const data = await r.json(); // Décode la réponse JSON du serveur
        
        if (data && data.id_reservation) { // Si le serveur répond qu'une réservation est bien en cours
          this.myReservedPlace = data.num_place; // Bloque visuellement la place acquise sur la grille
          this.lastReservationId = data.id_reservation; // Enregistre l'ID de réservation pour permettre une future annulation
          
          // 🔥 STRATÉGIE DE REPRISE APRÈS REFRESH (F5) :
          if (data.remaining_time) { // Cas 1 : Si le backend est intelligent et calcule le vrai temps restant en base de données
            this.startTimer(Number(data.remaining_time)); // On utilise la valeur précise du serveur
          } else { // Cas 2 : Si le serveur ne calcule rien, on utilise notre plan B local persistant
            const savedEnd = localStorage.getItem("smartpark_timer_end"); // Récupère le timestamp d'extinction mis de côté avant le F5
            if (savedEnd) { // Si une sauvegarde existe sur le disque du navigateur
              const now = Date.now(); // Prend l'heure courante de l'ordinateur
              const timeLeft = Math.floor((Number(savedEnd) - now) / 1000); // Calcule combien de secondes séparent maintenant du timestamp sauvegardé
              
              if (timeLeft > 0) { // Si le temps calculé n'est pas expiré pendant que la page était fermée
                this.runTimerLoop(Number(savedEnd)); // Relance la boucle directement calée sur la date de fin d'origine
              } else {
                this.stopTimer(); // Si le temps est passé pendant l'absence, on nettoie tout
              }
            } else {
              this.startTimer(1800); // Cas 3 : Si aucune sauvegarde n'existe nulle part, on part sur la valeur par défaut (30 min)
            }
          }
        } else { // Si le serveur indique que l'utilisateur n'a aucun ticket en cours
          this.myReservedPlace = null; // Libère l'affichage de l'interface
          this.lastReservationId = null; // Efface l'ID de réservation
          this.stopTimer(); // Coupe le chronomètre s'il tournait par erreur
        }
      } catch (err) {
        console.error("loadMyReservation error:", err);
      }
    },
    
    selectPlace(p) { // S'exécute quand l'utilisateur clique sur un carré de place sur la grille
      if (p.etat_place === 1 && this.myReservedPlace !== p.num_place) return; // Bloque le clic : impossible de sélectionner une place rouge appartenant à quelqu'un d'autre
      this.selectedPlace = p.num_place; // Enregistre le numéro de la place cliquée (ajoute un contour bleu à l'écran)
    },
    
    async reserve() { // Action finale d'achat/réservation au clic sur le bouton bleu principal
      this.isLoading = true; // Active le chargement pour griser le bouton et empêcher un double-clic accidentel
      try {
        const r = await fetch(`${config.API_URL}/api/reservation`, { // Envoie une requête POST de création
          method: "POST", // Méthode HTTP d'écriture
          headers: this.getHeaders(), // Joint les clés d'authentification de l'utilisateur
          body: JSON.stringify({ // Transforme l'objet JavaScript en chaîne de texte JSON lisible par le serveur
            id_parking: this.idParking, // Indique quel parking est ciblé
            num_place: this.selectedPlace, // Indique le numéro de place choisi
            id_vehicule: this.idVehicule // Joint l'identifiant du véhicule associé
          })
        });
        
        const data = await r.json(); // Attend la réponse du serveur backend
        if (!r.ok) { // Si le serveur refuse l'enregistrement (ex: place prise entre temps, jeton expiré)
          this.showNotif(data.error || "Erreur lors de la réservation", "error"); // Affiche l'explication de l'erreur en rouge
          this.isLoading = false; // Désactive le mode chargement pour redonner la main à l'utilisateur
          return; // Interrompt prématurément l'exécution de la fonction
        }
        
        this.lastReservationId = data.id_reservation; // Enregistre le numéro unique de réservation généré par la base de données
        this.myReservedPlace = this.selectedPlace; // Valide graphiquement la place à l'écran (devient dorée)
        this.showNotif("Réservation confirmée !", "success"); // Affiche un message de succès vert
        
        const timeToStart = data.remaining_time ? Number(data.remaining_time) : 1800; // Détermine la durée de départ (temps serveur ou 30 min par défaut)
        this.startTimer(timeToStart); // Déclenche le minuteur officiel et écrit le timestamp anti-F5 dans le localStorage

        this.loadPlaces(); // Force une réactualisation immédiate de la carte des places pour la voir passer au rouge
      } catch (err) {
        this.showNotif("Erreur réseau backend", "error"); // Gère les pannes physiques de réseau ou crash serveur
      } finally {
        this.isLoading = false; // Éteint systématiquement le mode chargement à la fin de la procédure
      }
    },
    
    async cancelReservation() { // Action d'annulation lors du clic sur le bouton rouge
      this.isLoading = true; // Verrouille l'interface pendant l'appel réseau
      try {
        const r = await fetch(`${config.API_URL}/api/reservation/annuler`, { // Envoie une requête POST de suppression/annulation
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify({ id_reservation: Number(this.lastReservationId) }) // Transmet l'ID de la ligne à résilier
        });
        
        const data = await r.json(); // Attend le verdict du serveur
        if (!r.ok) { // Si le serveur refuse de détruire la réservation
          this.showNotif(data.error || "Erreur lors de l'annulation", "error"); // Affiche le message de refus
          this.isLoading = false; // Débloque l'interface
          return;
        }
        
        this.showNotif("Réservation annulée", "success"); // Confirme l'action en vert à l'écran
        this.lastReservationId = null; // Efface la mémoire de réservation locale
        this.myReservedPlace = null; // Enlève le contour doré de la place
        this.selectedPlace = null; // Efface le choix temporaire
        this.stopTimer(); // Coupe le chronomètre et efface la clé du localStorage pour valider le nettoyage complet
        this.loadPlaces(); // Force la mise à jour visuelle pour voir la place redevenir verte (libre)
      } catch (err) {
        this.showNotif("Erreur réseau", "error");
      } finally {
        this.isLoading = false; // Libère l'interface graphique
      }
    },
    
    typeLabel(p) { // Fonction de traduction visuelle pour le sous-titre de chaque place
      const t = (p.type_place || "").toLowerCase(); // Récupère le type de la base de données et le passe en minuscules pour éviter les fautes
      if (t === "voiture") return "Voiture";
      if (t === "moto") return "Moto";
      if (t === "handicap") return "Handicapé"; // Renvoie un texte propre selon les critères reconnus
      return "Standard"; // Valeur de repli universelle si le type est inconnu ou non renseigné
    },
    
    spotClass(p) { // Générateur de classes CSS dynamiques pour dessiner la carte des places
      const t = (p.type_place || "").toLowerCase(); // Normalise le type de place en minuscules
      const isMine = this.myReservedPlace === p.num_place; // Vérifie si cette place précise est celle que l'utilisateur possède
      
      return { // Retourne un objet de conditions CSS (si la valeur est vraie, Vue ajoute la classe sur la balise HTML)
        free: p.etat_place === 0 && !isMine, // Ajoute '.free' (fond vert) si la place est libre ET que ce n'est pas la nôtre
        busy: p.etat_place === 1 && !isMine, // Ajoute '.busy' (fond rouge) si la place est prise par quelqu'un d'autre
        mine: isMine, // Ajoute '.mine' (bordure dorée) si c'est notre place validée
        selected: this.selectedPlace === p.num_place && !isMine, // Ajoute '.selected' (contour bleu) si on a cliqué dessus sans l'avoir encore achetée
        voiture: t === "voiture", // Ajoute des classes de gabarit CSS selon la nature de la place (utilisable pour appliquer des icônes spécifiques en CSS)
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
  background: linear-gradient(135deg, #74b0bf, #0b6380);
  color: white;
  font-family: system-ui;
}

header {
  text-align: center;
  padding: 16px;
  font-size: 18px;
  font-weight: bold;
  background: #0b6380;
}

.layout {
  display: flex;
  gap: 24px;
  padding: 24px;
}

.panel {
  width: 280px;
  background: #0b6380;
  padding: 20px;
  border-radius: 10px;
  height: fit-content;
}

.grid-container {
  flex: 1;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 16px;
}

.spot {
  background: #1f2937;
  padding: 16px 10px;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  box-sizing: border-box;
}

.free {
  background: #22c55e;
}

.busy {
  background: #ef4444;
}

.selected {
  outline: 2px solid #38bdf8;
}

.mine {
  border: 2px solid gold;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 24px 15px 15px 15px;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}

.btn-primary {
  background: #38bdf8;
  color: white;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.timer-value {
  font-size: 26px;
  font-weight: 800;
  font-family: monospace;
  letter-spacing: 1px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #38bdf8;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}


.notif-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #facc15;
  color: black;
  padding: 12px 20px;
  border-radius: 8px;
  z-index: 100;
  font-weight: bold;
}

.notif-toast.error {
  background: #ef4444;
  color: white;
}

@media (max-width: 1024px) {
  .layout { gap: 20px; }
  .panel { width: 240px; }
}

@media (max-width: 768px) {
  .layout { flex-direction: column; }
  .panel { width: 100%; box-sizing: border-box; }
  header { font-size: 16px; padding: 12px; }
  .actions { flex-direction: column; align-items: stretch; }
}
</style>
