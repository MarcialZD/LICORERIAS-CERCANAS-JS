var app = new Vue({
    el: '#app',
    data: {
        radioValue: '1', // Valor inicial del radio seleccionado en km
        map: null,
        marker: null,
        liquorStores: [], // Arreglo para almacenar las tiendas de licor cercanas
        markers: [] // Arreglo para almacenar los marcadores en el mapa
    },
    mounted() {
        this.cargarGoogleMaps().then(() => {
            this.iniciarMap();
        });
    },
    methods: {
        cargarGoogleMaps() {
            return new Promise((resolve, reject) => {
                var script = document.createElement('script');
                script.src = 'https://maps.googleapis.com/maps/api/js?key=TU-API-KEY&callback=initMap'; // Reemplaza 'YOUR_API_KEY' con tu propia API key
                script.async = true;
                script.defer = true;
                script.onerror = reject;
                document.head.appendChild(script);
                window.initMap = resolve;
            });
        },
        iniciarMap() {
            // Obtener coordenadas del usuario automáticamente
            navigator.geolocation.getCurrentPosition(position => {
                var coord = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                this.map = new google.maps.Map(document.getElementById('map'), {
                    zoom: 15,
                    center: coord
                });

                var iconoMarcador = {
                    url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                    scaledSize: new google.maps.Size(40, 40),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(20, 40)
                };
                this.marker = new google.maps.Marker({
                    position: coord,
                    map: this.map,
                    icon: iconoMarcador,
                    title: 'Mi ubicación'
                });

                this.actualizarTiendasLicor();
            }, error => {
                console.error('Error al obtener la ubicación del usuario:', error);
            });
        },
        actualizarTiendasLicor() {
            var coord = this.marker.getPosition();
            var radio = this.radioValue * 1000; // Convertir km a metros
            var queryUrl = 'https://overpass-api.de/api/interpreter?data=[out:json];node[shop=alcohol](around:' + radio + ',' + coord.lat() + ',' + coord.lng() + ');out;';

            fetch(queryUrl)
                .then(response => response.json())
                .then(data => {
                    this.limpiarMarcadores();
                    this.liquorStores = []; // Limpiar lista de tiendas de licor antes de agregar nuevas

                    if (data.elements) {
                        this.marker.setMap(this.map);
                        data.elements.forEach(place => {
                            var store = {
                                id: place.id,
                                name: place.tags.name || 'Tienda de Licor'
                            };
                            store.distance = this.calcularDistancia(
                                this.marker.getPosition().lat(),
                                this.marker.getPosition().lng(),
                                place.lat,
                                place.lon
                            );
                            this.liquorStores.push(store);
                            this.crearMarcador(place);
                        });
                    } else {
                        console.error('No se encontraron tiendas de licor:', data);
                    }
                })
                .catch(error => {
                    console.error('Error al obtener datos de la API:', error);
                });
        },
        crearMarcador(place) {
            var position = {lat: place.lat, lng: place.lon};
            var marker = new google.maps.Marker({
                position: position,
                map: this.map,
                title: place.tags.name || 'Tienda de Licor'
            });
            this.markers.push({marker, id: place.id}); // Agregar marcador al arreglo de marcadores
        },
        limpiarMarcadores() {
            // Eliminar todos los marcadores fuera del rango seleccionado
            this.markers = this.markers.filter(markerData => {
                var distance = this.calcularDistancia(
                    this.marker.getPosition().lat(),
                    this.marker.getPosition().lng(),
                    markerData.marker.getPosition().lat(),
                    markerData.marker.getPosition().lng()
                );
                if (distance > this.radioValue) { // Convertir km a metros
                    markerData.marker.setMap(null);
                    return false; // No incluir este marcador en la lista filtrada
                }
                return true; // Incluir este marcador en la lista filtrada
            });
        },
        calcularDistancia(lat1, lon1, lat2, lon2) {
            var R = 6371; // Radio de la Tierra en km
            var dLat = this.deg2rad(lat2 - lat1);
            var dLon = this.deg2rad(lon2 - lon1);
            var a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            var d = R * c; // Distancia en kilómetros
            return d; // Devolver la distancia en kilómetros
        },
        deg2rad(deg) {
            return deg * (Math.PI / 180);
        }
    }
});