// main.js performs the API calls & fills the boxes for displaying network/money info about Vcash.
// The goal of this is to make all API calls originate from the user, and not require some external server.

function query(api_name, target_api) {
  // Promise the data
  return new Promise(function(resolve, reject) {
    // JSON.parse() wasn't working, so a number parser is fine for our purposes
    function parser(data) {
      let output;
      // Split by the commas
      let array = data.split(',');

      // Regex to match either a full number, or a number with a decimal
      if (target_api === 'getmarketsummary?market=BTC-XVC' || target_api === 'getmarketsummary?market=USDT-BTC') {
        // High is on 3, Low is on 4
        let high = parseFloat(array[3].match(/([0-9]+([\.]?[0-9]+)?)\1?/g));
        let low = parseFloat(array[4].match(/([0-9]+([\.]?[0-9]+)?)\1?/g));
        // Returns the average of the two
        output = (high + low) / 2;
      } else {
        // All explorer calls are on index 0
        output = array[0].match(/([0-9]+([\.]?[0-9]+)?)\1?/g);
      }

      console.log('[debug] Parser output for ' + target_url + ' = ' + output);
      // Parsed output
      return output;
    }

    let target_url;

    // Set URL for Bittrex https://www.bittrex.com/Home/Api
    if (api_name === 'bittrex') {
      // Using Bittrex API v1.1 (v1.0 is depreciated), and only making public calls.
      target_url = 'https://bittrex.com/api/v1.1/public/' + target_api;

      // Set URL for explorer https://explorer.vcash.info/info
    } else if (api_name === 'explorer') {
      // The explorer uses different strings in the url for different calls
      // Only checking for calls that don't require an '?index=XXXX'
      if (target_api === 'getmoneysupply' || target_api === 'getdistribution') {
        target_url = 'https://explorer.vcash.info/' + 'ext/' + target_api;
      } else {
        target_url = 'https://explorer.vcash.info/' + 'api/' + target_api;
      }
    } else {
      reject(Error('Incorrect api name.'));
    }

    // Only way to pull from API's seems to be with a cors proxy https://github.com/Rob--W/cors-anywhere
    fetch('https://cors-anywhere.herokuapp.com/' + target_url, {
      method: 'get',
      mode: 'cors'
    }).then(function(response) {
      // Only start doing things if the response was good
      if (response.ok) {
        // Parses to json into 'data' | Trying to use 'return response.json();' returns undefined.
        response.json().then(function(data) {
          // Sends the data as string to the parser, which is the eventual output
          resolve(parser(JSON.stringify(data)));
        });
      } else {
        reject(Error('Fetch failed with status code ' + response.status + '. ' + response.statusText));
      }
    }).catch(function(error) {
      reject(Error('Fetch error: ' + error));
    });
  });
}

// Credit https://stackoverflow.com/a/2901298
function format_commas(x) {
  let parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

// Run from body onload(), then on a timer every 100 seconds
function fill_network_badges() {
  query('explorer', 'getdifficulty').then(function(response) {
    document.getElementById('pow_difficulty').innerHTML = format_commas(Math.round(response));
  });

  query('explorer', 'getblockcount').then(function(response) {
    document.getElementById('block_count').innerHTML = format_commas(response);
  });

  query('explorer', 'getnetworkhashps').then(function(response) {
    // 1000000 is for hash to Mhash, as getnetworkhashps returns in h/s
    document.getElementById('network_hashrate').innerHTML = format_commas(Math.round(response / 1000000));
  });
}

// Triggered by onclick() from calculate button
function main() {
  /*
    Hashrate id="hashrate"
    Hashrate per second id="hash_per_sec"
    Power consumption id="power_consumption"
    Power cost id="power_cost"
  */
  let hashrate = document.getElementById('hashrate').value;
  let power_consumption = document.getElementById('power_consumption').value;
  let power_cost = document.getElementById('power_cost').value;

  // Fail if empty string ( <input type="number"> returns an empty string if not a number)
  // Fail if not positive values (to avoid pointless calculations/api calls) | Letting power cost be 0 because sometimes people have free power.
  if (hashrate !== ' ' && power_consumption !== ' ' && power_cost !== ' ' && hashrate > 0 && power_consumption > 0 && power_cost >= 0) {
    function get_hps_multiplier() {
      /*
        Multiply hashrate based on chosen value in dropdown..
        to get the hashrate as base hashrate, instead of selected hash per second.

        Values from https://en.wikipedia.org/wiki/Template:Bitrates
      */

      // Using func to scope the var, to keep variables to a minimum
      let hash_per_sec = document.getElementById('hash_per_sec').value;
      switch (hash_per_sec) {
        case 'h':
          return 1;
        case 'kh':
          return 1000;
        case 'mh':
          return 1000000;
        case 'gh':
          return 1000000000;
        case 'th':
          return 1000000000000;
        default:
          return 1;
      }
    }
    hashrate *= get_hps_multiplier();

    // NOTE: Must be passed a numeric type or it will break!
    // Always pass parseFloat() so toFixed doesn't break, even if 0 precision.
    function fill_grid_elements(target_element, value, precision) {
      /*
        Id's of various html tags are "X_Y"

        Where X is profit/mined/power
        and Y is day/week/month/year

        Ex: The id for power cost per month is "power_month"
      */

      let display_value = value;
      document.getElementById(target_element + '_day').innerHTML = format_commas(display_value.toFixed(precision));
      display_value = value * 7;
      document.getElementById(target_element + '_week').innerHTML = format_commas(display_value.toFixed(precision));
      display_value = (value * 7) * 3;
      document.getElementById(target_element + '_month').innerHTML = format_commas(display_value.toFixed(precision));
      display_value = ((value * 7) * 3) * 12;
      document.getElementById(target_element + '_year').innerHTML = format_commas(display_value.toFixed(precision));
    }

    function get_pow_reward() {
      // NOTE: This should probably be calculated somehow...
      return 1;
    }

    // Average mined over 24 hours
    let avg_mined;
    // Average of the values between 'High' and 'Low'
    let xvc_to_btc_conversion;
    // Value of conversion to USD
    let btc_to_usd_price;
    // Chain promises together because some of the math depends on eachother
    Promise.all([query('explorer', 'getnetworkhashps'), query('bittrex', 'getmarketsummary?market=BTC-XVC'), query('bittrex', 'getmarketsummary?market=USDT-BTC')]).then(values => {
      // Values is an array with the results of each promise

      // HashRate/24h_Average_Net_HashRate*PoW_Reward*18*24  = XVC/DAY
      // 8 decimal places for Vcash
      avg_mined = parseFloat((((hashrate / values[0]) * get_pow_reward()) * 18) * 24);
      xvc_to_btc_conversion = parseFloat(values[1]);
      btc_to_usd_price = parseFloat(values[2]);

      // Fill all at once to appear less laggy
      fill_grid_elements('mined', avg_mined, 8);
      fill_grid_elements('profit', (xvc_to_btc_conversion * avg_mined) * btc_to_usd_price, 2);
      // power_consumption / 1000 is to convert watts to kilowatts
      // power_cost is in kWh
      // * 24 to convert to cost per day
      fill_grid_elements('power', parseFloat(((power_consumption / 1000) * power_cost) * 24), 2);
    });
  } else {
    console.log('[Error] Incorrect value(s) in input boxes.');
    return;
  }
}

// Fills the badges with data retrieved from explorer API every 100 seconds (avg block time)
setInterval(function() {
  fill_network_badges();
}, 100000)
