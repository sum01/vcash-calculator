// main.js performs the API calls & fills the boxes for displaying network/money info about Vcash.
// The goal of this is to make all API calls originate from the user, and not require some external server.

function get_json(target_url) {
  /*
  let api_request = new Request(target_url, {
    method: 'get', // 'Get' required for Bittrex
    mode: 'no-cors', // Cors doesn't seem to be accepted on Bittrex or Vcash Explorer
    headers: new Headers({
      'Content-Type': 'application/json' // 'application/json' needed for Bittrex
    })
  });
  */

  fetch(target_url, {
    method: 'get', // 'Get' required for Bittrex
    mode: 'no-cors', // Cors doesn't seem to be accepted on Bittrex or Vcash Explorer
    headers: new Headers({
      'Content-Type': 'application/json' // 'application/json' needed for Bittrex
    })
  }).then(function(response) {
    console.log(response);
    return response.json(); // .json() is a shortcut to return parsed JSON
  });
}

function query_bittrex(bittrex_target_api) {
  /*
    Using Bittrex API v1.1 (v1.0 is being depreciated)
    We don't need to make any non-public calls.

    Example call: https://bittrex.com/api/v1.1/public/getmarketsummary?market=BTC-XVC
  */
  return get_json('https://bittrex.com/api/v1.1/public/' + bittrex_target_api);
}

function query_explorer(explorer_target_api) {
  // Docs: https://explorer.vcash.info/info

  // The explorer uses different strings for different calls
  // Example: getdifficulty uses /api/ while getmoneysupply uses /ext/
  let explorer_api_extension = 'api';

  // Some of these won't work, as a few have ?index=xxxxx applied to the end for correct queries...
  // but we don't worry about that, as we aren't using those api calls.
  if (explorer_target_api === 'getmoneysupply' || explorer_target_api === 'getdistribution' || explorer_target_api === 'getaddress' || explorer_target_api === 'getbalance' || explorer_target_api === 'getlasttxs') {
    explorer_api_extension = 'ext';
  }

  return get_json('https://explorer.vcash.info/' + explorer_api_extension + '/' + explorer_target_api);
}

function fill_network_badges() {
  document.getElementById('pow_difficulty').innerHTML = query_explorer('getdifficulty');
  document.getElementById('block_count').innerHTML = query_explorer('getblockcount');
  document.getElementById('network_hashrate').innerHTML = query_explorer('getnetworkhashps');
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
    let xvc_market_summary = query_bittrex('getmarketsummary?market=BTC-XVC');

    // 24h Average of the values between 'High' and 'Low'
    fill_grid_elements('profit', ((xvc_market_summary.High + xvc_market_summary.Low) / 2));

    function get_pow_reward() {
      // NOTE: This should probably be calculated somehow...
      return 1;
    }

    // HashRate/24h_Average_Net_HashRate*PoW_Reward*18*24  = XVC/DAY
    fill_grid_elements('mined', ((((hashrate / query_explorer('getnetworkhashps')) * get_pow_reward()) * 18) * 24));

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
