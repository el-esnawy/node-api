/* eslint-disable */

export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiZXNuYXd5IiwiYSI6ImNrcDJsY2J3eTFmZjgycG54eXRkMGN6ZzEifQ.wT5GKjRUwbaNjicp0zQdaw';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/esnawy/ckp2lebvl0noj17pho3s4mp59',
    scrollZoom: false,
    // interactive: false
    // center: [-118.113491, 34.111745],
    zoom: 1
  });

  const bounds = new mapboxgl.LngLatBounds();

  let mapOptions = {
    root: null,
    rootMargin: '20px',
    threshold: 0.5
  };

  const loadMap = (entries, observer) => {
    const [entry] = entries;

    if (entry.isIntersecting) {
      locations.forEach(loc => {
        // create marker
        const el = document.createElement('div');
        el.className = 'marker';

        //  add marker
        new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
          maxZoom: 11
        })
          .setLngLat(loc.coordinates)
          .addTo(map);

        // Add popup

        new mapboxgl.Popup({
          offset: 30
        })
          .setLngLat(loc.coordinates)
          .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
          .addTo(map);

        // Extend map bound to include current location
        bounds.extend(loc.coordinates);
      });
      map.fitBounds(bounds, {
        padding: {
          top: 200,
          bottom: 150,
          left: 200,
          right: 200
        },
        maxZoom: 10
      });
    }
  };
  const observer = new IntersectionObserver(loadMap, mapOptions);
  const mapTarget = document.getElementById('map');
  observer.observe(mapTarget);
};
