require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GeoJSONLayer",
  "esri/layers/GraphicsLayer",
  "esri/tasks/ServiceAreaTask",
  "esri/tasks/support/ServiceAreaParameters",
  "esri/tasks/support/FeatureSet",
  "esri/Graphic",
  "esri/widgets/LayerList",
  "esri/widgets/Expand",
  "esri/core/watchUtils"
], function (Map, MapView, FeatureLayer, GeoJSONLayer, GraphicsLayer, ServiceAreaTask, ServiceAreaParams, FeatureSet, Graphic, LayerList, Expand, watchUtils) {

  const map = new Map({
    basemap: "streets-navigation-vector"
  });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    zoom: 14,
    center: [-78.613186, 35.792954],
    highlightOptions: {
      color: '#673AB7',
      haloOpacity: 0,
      fillOpacity: 0.25
    }
  });

  // LAYERS
  let blocksLayer = new GeoJSONLayer({
    url: "./data.geojson",
    outFields: ["los_total_score", "lap_score", "totpop_2020", "ses_2018"],
    listMode: 'hide',
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [0, 0, 0, 0],
        outline: {
          width: 0
        }
      }
    }
  })

  let recapLayer = new FeatureLayer({
    url: 'https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/Racially_or_Ethnically_Concentrated_Areas_of_Poverty/FeatureServer/0',
    outFields: ['GEOID', 'STUSAB', 'COUNTY_NAME', 'rcap_current'],
    definitionExpression: "STUSAB='NC' AND COUNTY_NAME='Wake' AND rcap_current=1",
    title: "Racially/Ethnically Concentrated Areas of Poverty",
    visible: false,
    renderer: {
      type: "simple",
      symbol: {
        type: 'simple-fill',
        style: 'diagonal-cross',
        color: '#90A4AE',
        outline: {
          width: 0
        }
      }
    }
  })
  let highlight;
  let nsaGeometry;
  let nsaLayer = new GraphicsLayer({
    listMode: 'hide'
  });
  let pointLayer = new GraphicsLayer({
    listMode: 'hide'
  });
  map.addMany([blocksLayer, recapLayer, nsaLayer, pointLayer]);

  // Expandable layer list to toggle R/ECAP layer
  view.when( () => {
    const layerList = new LayerList({
      container: document.createElement('div'),
      view: view
    })
    const layerListExpand = new Expand({
      expandIconClass: 'esri-icon-layer-list',
      view: view,
      content: layerList.domNode
    })

    view.ui.add(layerListExpand, 'top-right')
  }) 
  //FUNCTIONS

  // Main Query Function
  let blocksLayerView;
  view.whenLayerView(blocksLayer).then(lv => {
    blocksLayerView = lv;
    watchUtils.whenFalseOnce(blocksLayerView, "updating", val => {
      view.on(["click"], evt => {
        // CLEAR PREVIOUS RESULTS
        resetResults();
        // RETRIEVE SERVICE AREA
        // Generate isochrone
        let serviceAreaTask = new ServiceAreaTask({
          url: "https://utility.arcgis.com/usrsvcs/appservices/cD6s6VKuje0IvTZF/rest/services/World/ServiceAreas/NAServer/ServiceArea_World/solveServiceArea"
        })
        let mode = getCheckedRadioValue("mode")
        if (mode === "1") {
          time = 5
        } else if (mode === "5") {
          time = 10
        }

        let point = view.toMap(evt);
        pointGraphic = createPointGraphic(pointLayer, point)
        let featureSet = new FeatureSet({
          features: [pointGraphic]
        })
        // "1" is the itemId value for the Driving Time travel mode on this Network Analyst server
        // "5" is the itemId value for the Walking Time travel mode on this Network Analyst server
        // More info on how to find your travel modes IDs:
        // https://developers.arcgis.com/rest/services-reference/gettravelmodes-tool.htm
        let serviceAreaParams = new ServiceAreaParams({
          facilities: featureSet,
          travelMode: mode,
          defaultBreaks: [time]
        });
        serviceAreaTask.solve(serviceAreaParams)
          .then(result => {
            nsaGeometry = result.serviceAreaPolygons[0].geometry
            createNSAGraphic(nsaLayer, nsaGeometry)
            view.goTo(nsaGeometry.extent)
            // Query the blocks using the resulting isochrone
            let query = blocksLayerView.layer.createQuery();
            query.outStatistics = statDefinitions;
            query.geometry = nsaGeometry;

            blocksLayerView.queryFeatures(query)
              .then(results => {
                const attributes = results.features[0].attributes
                console.log(attributes)
                document.getElementById("totpop-stat").innerText = attributes.totpop_2020_sum.toLocaleString();
                document.getElementById("los-stat").innerText = `${losScoreToGrade(attributes.los_total_score_mean)} (${attributes.los_total_score_mean.toFixed(2)})`;
                document.getElementById("lap-stat").innerText = `${priorityLevel(attributes.lap_score_mean)} (${attributes.lap_score_mean.toFixed(2)})`;
                document.getElementById("ses-stat").innerText = attributes.ses_2018_mean.toFixed(2);
                watchUtils.whenFalseOnce(blocksLayerView, "updating", val => {
                  blocksLayerView.queryObjectIds(query)
                    .then(ids => {
                      if (highlight) {
                        highlight.remove();
                      }
                      highlight = blocksLayerView.highlight(ids)
                    })
                })
              })
          })
      })
    })
  })

  // Graphics
  function createPointGraphic(layer, point) {
    let graphic = new Graphic({
      geometry: point,
      symbol: {
        type: "simple-marker",
        color: [0, 0, 0, 0.5],
        size: 12,
        outline: {
          width: 0
        }
      }
    });

    layer.add(graphic);
    return graphic;
  }

  function createNSAGraphic(layer, nsaGeometry) {
    let graphic = new Graphic({
      geometry: nsaGeometry,
      symbol: {
        type: "simple-line",
        color: [0, 0, 0, 0.5],
        width: 1.25,
        join: "round",
        miter: "square"
      }
    });
    layer.add(graphic);
    return graphic;
  }

  // Stats
  const statDefinitions = [{
    onStatisticField: "1=1",
    outStatisticFieldName: "count",
    statisticType: "count"
  }, {
    onStatisticField: "totpop_2020",
    outStatisticFieldName: "totpop_2020_sum",
    statisticType: "sum"
  }, {
    onStatisticField: "los_total_score",
    outStatisticFieldName: "los_total_score_mean",
    statisticType: "avg"
  }, {
    onStatisticField: "lap_score",
    outStatisticFieldName: "lap_score_mean",
    statisticType: "avg"
  }, {
    onStatisticField: "ses_2018",
    outStatisticFieldName: "ses_2018_mean",
    statisticType: "avg"
  }]

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
           val >= 60 ? 'High'      :
           val >= 40 ? 'Medium'    :
           val >= 20 ? 'Low'       :
           val >=  0 ? 'Very Low'  :
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

  function clearGraphics(layer) {
    layer.removeAll();
  }

  function resetResults() {
    clearGraphics(nsaLayer);
    clearGraphics(pointLayer);
    if (highlight) {
      highlight.remove();
    }
    for (stat of ["totpop-stat", "los-stat", "lap-stat", "ses-stat"]) {
      document.getElementById(stat).innerText = "-"
    }
  }

  // Range slider
  const rangeSlider = document.getElementById("minutes");
  rangeSlider.addEventListener("input", () => {
    document.getElementById("minutes-slider-value").innerText = rangeSlider.value
  })

});