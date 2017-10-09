# Vcash Mining Calculator
A simple calculator that takes some input and spits out your estimated profit, average mined, and power cost for each day/week/month/year.  
All pricing info is pulled from the [public Bittrex API](https://www.bittrex.com/Home/Api), and network information is pulled from [xCore's Vcash explorer API.](https://explorer.vcash.info/info)

## Dev
This uses Bootstrap v4, which is currently in beta. Things will probably break.  
All API calls are made with Javascript, from the `main.js` file.

Source code (unminified) is held in the [src](src) folder, which is where you want to submit actual changes.   
After changing things, minifiy everything into the root folder.
