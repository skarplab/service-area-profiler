

### data.geojson

This data was compiled from various analyses and sources

- geoid10: Unique Census Block ID
- los_total_score: Level of Service score based on current park system run on 7/24/2020
  - C:\Users\<user>\Documents\Projects\EBPA Runs\20200724\DATA\02_FINAL\ebpa_20200724.gpkg
  - Also on AGOL: https://ral.maps.arcgis.com/home/item.html?id=354b53d660b44d9a9ca74b85e5e563bb
- totpop_2020: Estimated population from Esri Demographics
  - Pulled from my local PostGIS database (gisdb/demographics.population) and filtered for 2020 estimates only. Could just as easily been pulled from Esri though using their Enrichment tools.
- ses_2018: Normalized (0-100) social equity score from 1/21/2020
  - C:\Users\<user>\Documents\Projects\System Plan Analysis\Social Equity\Data Processing\compile_factor_data\DATA\02_FINAL\ral_social_equity_2018.db