const config = {
  // MODE
  MODE: "local",
  // LOCAL
  local: {
    API_URL: "http://localhost:8300",
    SOCKET_URL: "http://localhost:8300"
  },
  // PRODUCTION
  prod: {
    API_URL: "https://smartpark.alwaysdata.net",
    SOCKET_URL: "https://smartpark.alwaysdata.net"
  },
  // Ces fonctions ("get") permettent de lire la bonne URL automatiquement.

  // Récupère l'URL de l'API REST en fonction du MODE défini plus haut.
  get API_URL() {
    // Équivaut à écrire : return this.local.API_URL ou this.prod.API_URL.
    return this[this.MODE].API_URL;
  },

  // Récupère l'URL du serveur de sockets en temps réel en fonction du MODE défini plus haut.
  get SOCKET_URL() {
    // Équivaut à écrire : return this.local.SOCKET_URL ou this.prod.SOCKET_URL.
    return this[this.MODE].SOCKET_URL;
  }
};

// Exportation par défaut du module pour pouvoir l'importer partout avec l'import config from "@/config".
export default config;
