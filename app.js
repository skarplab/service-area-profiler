const map = L.map('map').setView([35.8, -78.65], 11)
const streets = L.esri.basemapLayer('Streets').addTo(map)

// LAYERS
let parcels = L.esri.dynamicMapLayer({
  url: 'https://maps.wakegov.com/arcgis/rest/services/Property/Parcels/MapServer',
  layers: [0]
}).addTo(map)
map.createPane('parcels')
map.getPane('parcels').style.zIndex = 401
let recap = L.esri.featureLayer({
  url: 'https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Racially_or_Ethnically_Concentrated_Areas_of_Poverty/FeatureServer/0',
  where: "STUSAB='NC' AND COUNTY_NAME='Wake' AND rcap_current=1",
  style: {
    weight: 0,
    fillOpacity: 0.5,
    fillColor: '#607D8B'
  }
}).addTo(map)
map.createPane('recap')
map.getPane('recap').style.zIndex = 403
let blocks = L.featureGroup().addTo(map)
map.createPane('blocks')
map.getPane('blocks').style.zIndex = 405
let isoline = L.featureGroup().addTo(map)
map.createPane('isoline')
map.getPane('isoline').style.zIndex = 410
let mapClickPoint = L.featureGroup().addTo(map)
map.createPane('mapClickPoint')

let overlays = {
  'Selected Location': mapClickPoint,
  'Service Area': isoline,
  'Selected Blocks': blocks,
  'Racially or Ethnically Concentrated Areas of Poverty': recap,
  'Wake County Parcels': parcels
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
        url: 'https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/los_mbo_la_cb_20200724_20200831_update/FeatureServer/0'
      })
      query.intersects(saPolygonJSON.features[0])
      query.fields(["los_total_score", "lap_mboweighted_w_centers_score", "totpop_2020", "social_equity_score"])
      console.log(query)
      query.run((err, results, raw) => {
        let features = results.features
        blocks.addLayer(L.geoJSON(turf.featureCollection(features), {
          style: {
            weight: 0,
            color: '#673AB7'
          }
        }))
        map.fitBounds(blocks.getBounds())

        // Total Population
        let totpopSum = ss.sum(features.map(f => f.properties.totpop_2020))
        document.getElementById("totpop-stat").innerText = totpopSum.toLocaleString();

        // LOS
        let losScoreMean = Math.round(ss.mean(features.map(f => f.properties.los_total_score)))
        document.getElementById("los-stat").innerText = `${losScoreToGrade(losScoreMean)} (${losScoreMean.toFixed(2)})`;

        // LAP
        let lapScoreMean = Math.round(ss.mean(features.map(f => f.properties.lap_mboweighted_w_centers_score)))
        document.getElementById("lap-stat").innerText = `${priorityLevel(lapScoreMean)} (${lapScoreMean.toFixed(2)})`;

        // Social Equity Score
        let sesScoreMean = ss.mean(features.map(f => f.properties.social_equity_score))
        document.getElementById("ses-stat").innerText = sesScoreMean.toFixed(2);
      })

      // Add Layers
      mapClickPoint.addLayer(L.circleMarker(inputXY, {
        radius: 12,
        weight: 0,
        color: "#121212",
        opacity: 0.25,
        fillOpacity: 0.5
      }))
      isoline.addLayer(L.geoJSON(saPolygonJSON, {
        style: {
          fillOpacity: 0,
          weight: 2,
          color: '#121212',
          dashArray: "5 5"
        }
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
  for (stat of ["totpop-stat", "los-stat", "lap-stat", "ses-stat"]) {
    document.getElementById(stat).innerText = "-"
  }
}

// Range slider
const rangeSlider = document.getElementById("minutes");
rangeSlider.addEventListener("input", () => {
  document.getElementById("minutes-slider-value").innerText = rangeSlider.value
})