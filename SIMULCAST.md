# Simlucast API

The Audiogram simulcast API provides an endpoint for fetching broadcast media from the BBC. It will return mp3 audio for all requests, as well as mp4 video where applicable.

### POST Request
```
http://audiogram.newslabs.co/simulcast
```
| Parameter | Format | Desc | Example | Notes 
| ------ | ------ | ------ | ------ | ------ 
| vpid | String | Simulcast VPID | bbc_news_channel_hd 
| start | Epoch timestamp | Clip start | 1492004452 | Must be within the last 12hrs
| end | Epoch timestamp | Clip end | 1492004482 

### Response
Success, radio simulcast:
```
HTTP/1.1 200 OK
{
    "audio": "https://audiogram.newslabs.co/simulcast/media/a35f5e69-19f2-4a91-8dc1-8e73a070c678.mp3",
    "video": null
}
```
Success, video simulcast:
```
HTTP/1.1 200 OK
{
    "audio": "https://audiogram.newslabs.co/simulcast/media/a35f5e69-19f2-4a91-8dc1-8e73a070c678.mp3",
    "video": "https://audiogram.newslabs.co/simulcast/media/a35f5e69-19f2-4a91-8dc1-8e73a070c678.mp4"
}
```
Error:
```
HTTP/1.1 200 OK
{
    "error": "Invalid vpid"
}
```
### Retrieving Media
The above JSON response includes paths to audio and video media. While they're being generated, these files will return 'HTTP/1.1 204 No Content'. Simply poll the version you want until you get a 'HTTP/1.1 200 OK' response. Media will be deleted after 24 hours.

### Simulcast VPIDS
```
 bbc_1xtra
 bbc_1xtra_video
 bbc_6music
 bbc_afghan_radio
 bbc_afrique_radio
 bbc_alba
 bbc_arabic_radio
 bbc_asian_network
 bbc_bangla_radio
 bbc_burmese_radio
 bbc_cantonese_radio
 bbc_dari_radio
 bbc_four
 bbc_four_hd
 bbc_gahuza_radio
 bbc_hausa_radio
 bbc_hindi_radio
 bbc_indonesian_radio
 bbc_kyrgyz_radio
 bbc_london
 bbc_nepali_radio
 bbc_news24
 bbc_news_channel_hd
 bbc_one_cambridge
 bbc_one_channel_islands
 bbc_one_east
 bbc_one_east_midlands
 bbc_one_east_yorkshire
 bbc_one_hd
 bbc_one_london
 bbc_one_north_east
 bbc_one_north_west
 bbc_one_northern_ireland
 bbc_one_northern_ireland_hd
 bbc_one_oxford
 bbc_one_scotland
 bbc_one_scotland_hd
 bbc_one_south
 bbc_one_south_east
 bbc_one_south_west
 bbc_one_wales
 bbc_one_wales_hd
 bbc_one_west
 bbc_one_west_midlands
 bbc_one_yorks
 bbc_parliament
 bbc_pashto_radio
 bbc_persian_radio
 bbc_radio_berkshire
 bbc_radio_bristol
 bbc_radio_cambridge
 bbc_radio_cornwall
 bbc_radio_coventry_warwickshire
 bbc_radio_cumbria
 bbc_radio_cymru
 bbc_radio_derby
 bbc_radio_devon
 bbc_radio_essex
 bbc_radio_five_live
 bbc_radio_five_live_video
 bbc_radio_four_extra
 bbc_radio_fourfm
 bbc_radio_fourlw
 bbc_radio_foyle
 bbc_radio_gloucestershire
 bbc_radio_guernsey
 bbc_radio_hereford_worcester
 bbc_radio_humberside
 bbc_radio_jersey
 bbc_radio_kent
 bbc_radio_lancashire
 bbc_radio_leeds
 bbc_radio_leicester
 bbc_radio_lincolnshire
 bbc_radio_manchester
 bbc_radio_merseyside
 bbc_radio_nan_gaidheal
 bbc_radio_newcastle
 bbc_radio_norfolk
 bbc_radio_northampton
 bbc_radio_nottingham
 bbc_radio_one
 bbc_radio_one_video
 bbc_radio_oxford
 bbc_radio_scotland_fm
 bbc_radio_scotland_mw
 bbc_radio_sheffield
 bbc_radio_shropshire
 bbc_radio_solent
 bbc_radio_solent_west_dorset
 bbc_radio_somerset_sound
 bbc_radio_stoke
 bbc_radio_suffolk
 bbc_radio_surrey
 bbc_radio_sussex
 bbc_radio_three
 bbc_radio_two
 bbc_radio_two_country
 bbc_radio_ulster
 bbc_radio_wales_fm
 bbc_radio_wiltshire
 bbc_radio_york
 bbc_russian_radio
 bbc_sinhala_radio
 bbc_somali_radio
 bbc_swahili_radio
 bbc_tamil_radio
 bbc_tees
 bbc_three_counties_radio
 bbc_two_england
 bbc_two_hd
 bbc_two_northern_ireland_digital
 bbc_two_scotland
 bbc_two_wales_digital
 bbc_urdu_radio
 bbc_uzbek_radio
 bbc_wm
 bbc_world_service
 bbc_world_service_americas
 bbc_world_service_australasia
 bbc_world_service_east_africa
 bbc_world_service_east_asia
 bbc_world_service_europe
 bbc_world_service_news_internet
 bbc_world_service_south_asia
 bbc_world_service_west_africa
 cbbc
 cbbc_hd
 cbeebies
 cbeebies_hd
 satellite_and_cable_one
```