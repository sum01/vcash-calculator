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

      if (target_api === 'getmarketsummary?market=BTC-XVC') {
        // High is on 4, Low is on 5, I think...
        // FIXME
      } else if (target_api === 'getmarketsummary?market=USDT-BTC') {
        // FIXME
      } else {
        // Regex to match either a full number, or a number with a decimal
        // All explorer calls are on index 0
        output = array[0].match(/([0-9]+[\.]*[0-9]*)\1?/g);
      }

      console.log('[debug] Parser out for ' + target_url + ' is: ' + output);
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
      reject(Error('Incorrect api name, canceling calulation.'));
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
        console.log('Fetch failed with status code ' + response.status + '. ' + response.statusText);
        reject(Error('on query'));
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

// Run on body load, then every 30 seconds
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
    console.log('Using ' + hashrate.toLocaleString() + ' as hashrate in calculations.');

    function fill_grid_elements(target_element, value) {
      /*
        Id's of various html tags are "X_Y"

        Where X is profit/mined/power
        and Y is day/week/month/year

        Ex: The id for power cost per month is "power_month"
      */

      let display_value = value;
      document.getElementById(target_element + '_day').innerHTML = display_value.toLocaleString();
      display_value = value * 7;
      document.getElementById(target_element + '_week').innerHTML = display_value.toLocaleString();
      display_value = (value * 7) * 3;
      document.getElementById(target_element + '_month').innerHTML = display_value.toLocaleString();
      display_value = ((value * 7) * 3) * 12;
      document.getElementById(target_element + '_year').innerHTML = display_value.toLocaleString();
    }

    /*
      Queries Bittrex for public (doesn't require api key) data...
      and fills HTML elements with calculated/queried data.

      Bittrex API: https://bittrex.com/Home/Api
    */
    let xvc_market_summary = query('bittrex', 'getmarketsummary?market=BTC-XVC');

    // 24h Average of the values between 'High' and 'Low'
    fill_grid_elements('profit', ((xvc_market_summary.High + xvc_market_summary.Low) / 2));

    function get_pow_reward() {
      // NOTE: This should probably be calculated somehow...
      return 1;
    }

    // HashRate/24h_Average_Net_HashRate*PoW_Reward*18*24  = XVC/DAY
    fill_grid_elements('mined', ((((hashrate / query('explorer', 'getnetworkhashps')) * get_pow_reward()) * 18) * 24));

    // power_consumption / 1000 is to convert watts to kilowatts
    // power_cost is in kWh
    // * 24 to convert to cost per day
    fill_grid_elements('power', (((power_consumption / 1000) * power_cost) * 24))

    /* FIXME needs to parse out the crap & just get the time
    let timestamp = Date.parse(xvc_market_summary.TimeStamp);

    // Updates the "Last updated ? ago" element to track last time from a Bittrex query
    setInterval(function() {
      timestamp += 1;
      document.getElementById('card_footer_lastupdate').innerHTML = timestamp;
    }, 1000)
    */
  } else {
    console.log('Incorrect value(s) in input boxes, canceling calculation.');
    return;
  }
}

/* TEMP disabled till API call is fixed
// Fills the badges with data retrieved from explorer API every 30 seconds
setInterval(function() {
  fill_network_badges();
}, 30000)
*/
