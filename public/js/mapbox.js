/* eslint-disable */
import mapboxgl from 'mapbox-gl';

export const displayMap = (locations) => {

  //Create mapboc object & attach to map html element
  //Note! mapboxgl object is exposed by mapboxgl library which is imported into tour.html file.
  mapboxgl.accessToken = 'pk.eyJ1IjoibXJmcmVkZGllMDQiLCJhIjoiY2t4Mm1waWgzMXB0bjJvcm5tZ2NjMm85bSJ9.bioAu-HPOLAGpWq_SSNjMw';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mrfreddie04/ckx2oeg2n19oz14ky0uvgow3w',
    scrollZoom: false
    // center: [-117.61712353842991,34.00770597492528],
    // zoom: 8,
    // interactive: false
    //style: 'mapbox://styles/mapbox/streets-v11'
  });

  //Create mapboxgl.bounds object to hold a list of geolocations to be shown on a map
  const bounds = new mapboxgl.LngLatBounds();
  locations.forEach( location => {
    //For each tour location create an html element, then mapboxgl.marker object, and finally attach marker to this html element
    const el = document.createElement("div"); //create html element
    el.classList.add("marker"); //style html element to look like a marker
    const marker = new mapboxgl.Marker({ //create marker and bind to html element
      element: el,
      anchor: 'bottom' //bottom of the marker locates the the exact grp coords
    });
    //Set geo coords for the marker (based on current tour location)
    // and add this marker to the map
    marker.setLngLat(location.coordinates).addTo(map); 

    //Add popup - also to the map (not to the marker)
    new mapboxgl.Popup({offset: 30})
      .setLngLat(location.coordinates)
      .setHTML(`<p>Day ${location.day}: ${location.description}</p>`)
      .addTo(map);

    //Add tour location to the mapboxgl.bounds collection
    bounds.extend(location.coordinates);
  });

  //Position/zoom map to fit the bounds and add some padding
  map.fitBounds(bounds,{
    padding: {top: 200, bottom:150, left: 100, right: 100}
  });
}