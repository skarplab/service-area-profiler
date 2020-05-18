require([
    "esri/Map",
    "esri/views/MapView"
  ], function(Map, MapView) {

    var map = new Map({ basemap: "gray" });

    var view = new MapView({
      container: "viewDiv",
      map: map,
      zoom: 3
    });
    
  });