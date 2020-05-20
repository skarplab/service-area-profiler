

### data.geojson

This data was compiled from various analyses and sources

- geoid10: Unique Census Block ID
- los_total_score: Level of Service score based on current park system run on 3/24/2020
  - C:\Users\<user>\Documents\Projects\EBPA Runs\20200324\DATA\02_FINAL\ebpa_20200324.gpkg
  - Also on AGOL: https://ral.maps.arcgis.com/home/item.html?id=23974efa7db04941994c6353e9be024d
- totpop_2019: Estimated population from Esri Demographics
  - Pulled from my local PostGIS database (gisdb/demographics.population) and filtered for 2019 estimates only. Could just as easily been pulled from Esri though using their Enrichment tools.
- ses_2018: Normalized (0-100) social equity score from 1/21/2020
  - C:\Users\<user>\Documents\Projects\System Plan Analysis\Social Equity\Data Processing\compile_factor_data\DATA\02_FINAL\ral_social_equity_2018.db