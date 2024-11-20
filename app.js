const map = L.map('map').setView([35.8, -78.65], 11)
const streets = L.esri.basemapLayer('Topographic').addTo(map)

// LAYERS


function lapColor(score) {
  return score >= 90 ? '#a50026' :
    score >= 80 ? '#d73027' :
    score >= 70 ? '#f46d43' :
    score >= 60 ? '#fdae61' :
    score >= 50 ? '#fee090' :
    score >= 40 ? '#e0f3f8' :
    score >= 30 ? '#abd9e9' :
    score >= 20 ? '#74add1' :
    score >= 10 ? '#4575b4' :
    '#313695';
}

map.createPane('lap')
map.getPane('lap').style.zIndex = 403
let lap = L.esri.featureLayer({
  url: 'https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/spa_20210721/FeatureServer/0',  // Actual date is from 20210727 but I made a typo creating the service
  where: "etj = 1",
  pane: 'lap',
  style: feature => {
    return {
      fillColor: lapColor(feature.properties.lap_score),
      weight: 0,
      fillOpacity: 1
    }
  }
})

map.createPane('parcels')
map.getPane('parcels').style.zIndex = 405
let parcels = L.esri.dynamicMapLayer({
  url: 'https://maps.wakegov.com/arcgis/rest/services/Property/Parcels/MapServer',
  layers: [0],
  pane: 'parcels'
}).addTo(map)

map.createPane('recap')
map.getPane('recap').style.zIndex = 409
let recap = L.esri.featureLayer({
  url: 'https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Racially_or_Ethnically_Concentrated_Areas_of_Poverty/FeatureServer/0',
  where: "STUSAB='NC' AND COUNTY_NAME='Wake' AND rcap_current=1",
  style: {
    weight: 0,
    fillOpacity: 0.5,
    fillColor: '#607D8B'
  },
  pane: 'recap'
}).addTo(map)
map.createPane('blocks')
map.getPane('blocks').style.zIndex = 413
let blocks = L.featureGroup({pane: 'blocks'}).addTo(map)
map.createPane('isoline')
map.getPane('isoline').style.zIndex = 417
let isoline = L.featureGroup({pane: 'isoline'}).addTo(map)
map.createPane('mapClickPoint')
map.getPane('mapClickPoint').style.zIndex = 421
let mapClickPoint = L.featureGroup({pane: 'mapClickPoint'}).addTo(map)

let overlays = {
  'Selected Location': mapClickPoint,
  'Service Area': isoline,
  'Selected Blocks': blocks,
  'Racially or Ethnically Concentrated Areas of Poverty': recap,
  'Wake County Parcels': parcels,
  'Land Acquisition Prioritization': lap
}
let baseLayers = {
  'Streets': streets
}

L.control.layers(baseLayers, overlays).addTo(map)


map.on('click', e => {
  // Clear previous analysis layers
  blocks.clearLayers()
  isoline.clearLayers()
  mapClickPoint.clearLayers()

  // Get parameters

  let inputXY = [e.latlng.lat, e.latlng.lng]
  let mode = getCheckedRadioValue('mode')
  let minutes = rangeSlider.value

  // Run Analysis

  // KEEP THIS FOR TESTING
  // let bufferDistance;
  // if (mode == '1') {
  //   bufferDistance = parseFloat(minutes) * 0.583
  // } else {
  //   bufferDistance = parseFloat(minutes) * 0.08 
  // }

  // let saPolygonJSON = turf.featureCollection([
  //   turf.buffer(
  //     turf.flip(turf.point(inputXY)),
  //     bufferDistance,
  //     { unit: 'miles' }
  //   )
  // ])

  let saURL = `https://utility.arcgis.com/usrsvcs/appservices/cD6s6VKuje0IvTZF/rest/services/World/ServiceAreas/NAServer/ServiceArea_World/solveServiceArea?facilities=${e.latlng.lng},${e.latlng.lat}&f=json&travelMode=${mode}&defaultBreaks=${minutes}f=geojson`

  fetch(saURL)
    .then(result => {
      return result.json()
    })
    .then(json => {
      saPolygonJSON = L.esri.Util.arcgisToGeoJSON(json.saPolygons)
      // Query service and calculate values
      let query = L.esri.query({
        url: 'https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Raleigh_Census_Block_Groups_2024_Park_Equity_Analysis/FeatureServer/0' // Actual date is from 20210727 but I made a typo creating the service
      })
      query.where("etj = 1")
      query.intersects(saPolygonJSON.features[0])
      query.fields(["HistInequity", "HealthWellness", "EnvironJust", "WalkDemand"])
      console.log(query)
      query.run((err, results, raw) => {
        let features = results.features
        blocks.addLayer(L.geoJSON(turf.featureCollection(features), {
          style: {
            weight: 0,
            color: '#673AB7'
          },
          pane: 'blocks'
        }))
        map.fitBounds(blocks.getBounds())

        // Historic Inequity
        let inequityMean = ss.sum(features.map(f => f.properties.HistInequity))
        document.getElementById("inequity-stat").innerText = inequityMean.toFixed(2);

        // Health and Wellness
        let healthwellnessMean = Math.round(ss.mean(features.map(f => f.properties.HealthWellness)))
        document.getElementById("healthwellness-stat").innerText = healthwellnessMean.toFixed(2);

        // Environmental Justice
        let environMean = Math.round(ss.mean(features.map(f => f.properties.EnvironJust)))
        document.getElementById("environ-stat").innerText = environMean.toFixed(2);

        // Social Equity Score
        let walkdemandMean = ss.mean(features.map(f => f.properties.WalkDemand))
        document.getElementById("walkdemand-stat").innerText = walkdemandMean.toFixed(2);
      })

      // Add Layers
      mapClickPoint.addLayer(L.circleMarker(inputXY, {
        radius: 12,
        weight: 0,
        color: "#121212",
        opacity: 0.25,
        fillOpacity: 0.5,
        pane: 'mapClickPoint'
      }))
      isoline.addLayer(L.geoJSON(saPolygonJSON, {
        style: {
          fillOpacity: 0,
          weight: 2,
          color: '#121212',
          dashArray: "5 5"
        },
        pane: 'isoline'
      }))

    })
    .catch(err => {
      console.log(err)
    })
})



function losScoreToGrade(score) {
  return score >= 17 ? 'A' :
    score >= 13 ? 'B' :
    score >= 9 ? 'C' :
    score >= 5 ? 'D' :
    score === 4 ? 'F' :
    '';
}

function priorityLevel(val) {
  return val >= 80 ? 'Very High' :
    val >= 60 ? 'High' :
    val >= 40 ? 'Medium' :
    val >= 20 ? 'Low' :
    val >= 0 ? 'Very Low' :
    '🤷';
}

// UI

// Checked Radio Button 
function getCheckedRadioValue(name) {
  const radios = document.querySelectorAll(`input[name=${name}]`)
  let selectedValue;
  for (const radio of radios) {
    if (radio.checked) {
      selectedValue = radio.value
      break
    }
  }
  return selectedValue
}
// Clear everything
document.getElementById("clear-button").addEventListener("click", resetResults)

function resetResults() {
  blocks.clearLayers()
  isoline.clearLayers()
  mapClickPoint.clearLayers()
  for (stat of ["inequity-stat", "healthwellness-stat", "environ-stat", "walkdemand-stat"]) {
    document.getElementById(stat).innerText = "-"
  }
}

// Range slider
const rangeSlider = document.getElementById("minutes");
rangeSlider.addEventListener("input", () => {
  document.getElementById("minutes-slider-value").innerText = rangeSlider.value
})
