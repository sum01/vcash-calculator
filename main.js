// main.js performs the API calls & fills the boxes for displaying network/money info about Vcash.
// The goal of this is to make all API calls originate from the user, and not require some external server.

function query(api_name, target_api) {
  // Promise the data
  return new Promise(function(resolve, reject) {
    // JSON.parse() wasn't working, so a number parser is fine for our purposes
    function parser(data) {
      let output = 0;
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

      console.log('[info] Parser output for ' + target_url + ' = ' + output);
      // Parsed output
      return output;
    }

    let target_url = '';

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
  // Using promise.all allows for loading all at the same time, as to appear less laggy
  Promise.all([query('explorer', 'getdifficulty'), query('explorer', 'getblockcount'), query('explorer', 'getnetworkhashps')]).then(values => {
    document.getElementById('pow_difficulty').innerHTML = format_commas(Math.round(values[0]));
    document.getElementById('block_count').innerHTML = format_commas(values[1]);
    // 1000000 is for hash to Mhash, as getnetworkhashps returns in h/s
    document.getElementById('network_hashrate').innerHTML = format_commas(Math.round(values[2] / 1000000));
  }).catch(function(error) {
    // Throw an alert if query fails
    console.error(error);
    alert('API query failed!');
  });
}

// Prevent clicking button till the query ends.
function disable_btn(button, disable) {
  button.disabled = disable;
  if (disable) {
    button.innerHTML = 'Loading...';
  } else {
    button.innerHTML = 'Calculate';
  }
}

// Triggered by onclick() from calculate button
function main() {
  // Disable/enable button while running
  let calculate_button = document.getElementById('calculate_btn');
  disable_btn(calculate_btn, true);

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
    // Pre-parse to float to avoid dealing with incorrect num-types
    hashrate = parseFloat(hashrate);
    power_consumption = parseFloat(power_consumption);
    power_cost = parseFloat(power_cost);

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
          return 1.0;
        case 'kh':
          return 1000.0;
        case 'mh':
          return 1000000.0;
        case 'gh':
          return 1000000000.0;
        case 'th':
          return 1000000000000.0;
        default:
          return 1.0;
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
      display_value = value * 7.0;
      document.getElementById(target_element + '_week').innerHTML = format_commas(display_value.toFixed(precision));
      display_value = (value * 7.0) * 3.0;
      document.getElementById(target_element + '_month').innerHTML = format_commas(display_value.toFixed(precision));
      display_value = ((value * 7.0) * 3.0) * 12.0;
      document.getElementById(target_element + '_year').innerHTML = format_commas(display_value.toFixed(precision));
    }

    // Credit to @whphhg as this is just a slightly edited version of his Node.js code
    function get_pow_reward(block) {
      function total_reward() {
        let subsidy = 0;

        if (block >= 136400 && block <= 136400 + 1000) {
          subsidy = 1;
        } else {
          subsidy = 128 * 1000000;

          if (block < 325000) {
            for (let i = 50000; i <= block; i += 50000) {
              subsidy -= subsidy / 6;
            }
          } else if (block < 385000) {
            for (let i = 10000; i <= block; i += 10000) {
              subsidy -= subsidy / 28;
              subsidy = Math.ceil(subsidy);
              subsidy -= subsidy / 28 * 4 / 28;
              subsidy = Math.ceil(subsidy);
            }
          } else {
            for (let i = 7000; i <= block; i += 7000) {
              subsidy -= subsidy / 28;
              subsidy = Math.ceil(subsidy);
              subsidy -= subsidy / 28 * 4 / 28;
              subsidy = Math.ceil(subsidy);
            }
          }

          if (subsidy / 1000000 < 1) {
            subsidy = 1;
            subsidy *= 1000000;
          }
        }

        subsidy /= 1000000;
        console.log('[info] Using total PoW+PoS reward = ' + subsidy);
        return subsidy;
      }

      function incentive_percent() {
        const percents = [{
            block: 210000,
            percent: 1
          },
          {
            block: 220000,
            percent: 2
          },
          {
            block: 220222,
            percent: 3
          },
          {
            block: 220888,
            percent: 4
          },
          {
            block: 221998,
            percent: 5
          },
          {
            block: 223552,
            percent: 6
          },
          {
            block: 225550,
            percent: 7
          },
          {
            block: 227992,
            percent: 8
          },
          {
            block: 230878,
            percent: 9
          },
          {
            block: 234208,
            percent: 10
          },
          {
            block: 237982,
            percent: 11
          },
          {
            block: 242200,
            percent: 12
          },
          {
            block: 246862,
            percent: 13
          },
          {
            block: 251968,
            percent: 14
          },
          {
            block: 257518,
            percent: 15
          },
          {
            block: 263512,
            percent: 16
          },
          {
            block: 269950,
            percent: 17
          },
          {
            block: 276832,
            percent: 18
          },
          {
            block: 284158,
            percent: 19
          },
          {
            block: 291928,
            percent: 20
          },
          {
            block: 300142,
            percent: 21
          },
          {
            block: 308800,
            percent: 22
          },
          {
            block: 317902,
            percent: 23
          },
          {
            block: 327448,
            percent: 24
          },
          {
            block: 337438,
            percent: 25
          },
          {
            block: 347872,
            percent: 26
          },
          {
            block: 358750,
            percent: 27
          },
          {
            block: 370072,
            percent: 28
          },
          {
            block: 381838,
            percent: 29
          },
          {
            block: 394048,
            percent: 30
          },
          {
            block: 406702,
            percent: 31
          },
          {
            block: 419800,
            percent: 32
          },
          {
            block: 433342,
            percent: 33
          },
          {
            block: 447328,
            percent: 34
          },
          {
            block: 461758,
            percent: 35
          },
          {
            block: 476632,
            percent: 36
          },
          {
            block: 491950,
            percent: 37
          },
          {
            block: 507712,
            percent: 38
          },
          {
            block: 523918,
            percent: 39
          },
          {
            block: 540568,
            percent: 40
          }
        ];

        const percents_len = percents.length - 1;

        if (block >= percents[percents_len].block) {
          console.log('[info] Using incentive percent = ' + percents[percents_len].percent);
          return percents[percents_len].percent;
        } else {
          for (let i in percents) {
            if (block < percents[i].block) {
              console.log('[info] Using incentive percent = ' + (percents[i].percent - 1));
              return percents[i].percent - 1;
            }
          }
        }
      }

      let reward_total = total_reward();
      let incentive_reward = (reward_total / 100) * incentive_percent();
      // Returns the PoW-only reward
      console.log('[info] Using PoW reward = ' + (reward_total - incentive_reward));
      return parseFloat(reward_total - incentive_reward);
    }

    // Chain promises together because some of the math depends on eachother
    Promise.all([query('explorer', 'getnetworkhashps'), query('bittrex', 'getmarketsummary?market=BTC-XVC'), query('bittrex', 'getmarketsummary?market=USDT-BTC'), query('explorer', 'getblockcount')]).then(values => {
      // Values is an array with the results of each promise

      // HashRate/24h_Average_Net_HashRate*PoW_Reward*18*24  = XVC/DAY
      let avg_mined = (((hashrate / parseFloat(values[0])) * get_pow_reward(parseInt(values[3]))) * 18.0) * 24.0;

      // Calc how many bitcoins you'd make, then multiply it by the conversion to USD
      // (XVC-to-BTC * mined) * BTC-to-USDT
      let avg_profit = (parseFloat(values[1]) * avg_mined) * parseFloat(values[2]);
      // power_consumption / 1000 is to convert watts to kilowatts
      // power_cost is in kWh
      // * 24 to convert to cost per day
      let avg_power_cost = ((power_consumption / 1000.0) * power_cost) * 24.0;
      // Minus power cost from profit to get actual profit
      avg_profit -= avg_power_cost;

      // Fill all at once to appear less laggy
      fill_grid_elements('mined', avg_mined, 8);
      fill_grid_elements('profit', avg_profit, 2);
      fill_grid_elements('power', avg_power_cost, 2);

      // Re-enable button
      disable_btn(calculate_btn, false);
    }).catch(function(error) {
      // Throw an alert if query fails
      console.error(error);
      alert('API query failed!');

      // Re-enable button
      disable_btn(calculate_btn, false);
    });
  } else {
    console.log('[Error] Incorrect value(s) in input boxes.');
    // Re-enable button
    disable_btn(calculate_btn, false);
  }
}

// Fills the badges with data retrieved from explorer API every 100 seconds (avg block time)
setInterval(function() {
  fill_network_badges();
}, 100000)
