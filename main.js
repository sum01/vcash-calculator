/*
	This js performs the API calls & fills the boxes for displaying network/money info about Vcash.
	The goal of this is to make all API calls originate from the user, and not require some external server.
*/

function query(api_name, target_api) {
	let target_url = "";

	// Set URL for Bittrex https://www.bittrex.com/Home/Api
	if (api_name === "bittrex") {
		// Using Bittrex API v1.1 (v1.0 is depreciated), and only making public calls.
		target_url = `https://bittrex.com/api/v1.1/public/${target_api}`;

		// Set URL for explorer https://explorer.vcash.info/info
	} else if (api_name === "explorer") {
		target_url = "https://explorer.vcash.info/";
		// The explorer uses different strings in the url for different calls
		if (
			target_api.match("get(moneysupply|distribution|address|balance|lasttxs)")
		) {
			target_url += "ext/";
		} else {
			target_url += "api/";
		}
		target_url += target_api;
	} else {
		console.error("Incorrect api name!");
		return;
	}

	// JSON.parse() wasn't working, so a number parser is fine for our purposes
	function parser(data) {
		// double
		let output = 0.0;
		// Split by the commas
		const array = data.split(",");
		// Regex to match either a full number, or a number with a decimal
		const api_regex = new RegExp("([0-9]+(.[0-9]+)?)", "g");

		// Test if the target api matches the bittrex call
		if (api_name === "bittrex") {
			// High is on 3, Low is on 4
			const high = parseFloat(array[3].match(api_regex));
			const low = parseFloat(array[4].match(api_regex));
			// Returns the average of the two
			output = (high + low) / 2.0;
		} else if (api_name === "explorer") {
			// All used explorer calls are on index 0
			output = array[0].match(api_regex);
		} else {
			console.error("Parser failure! Incorrect api call.");
			return;
		}

		console.log(`${target_url} = ${output}`);
		// Parsed output
		return output;
	}

	// Promise the data
	return new Promise(function(resolve, reject) {
		// Only way to pull from API's seems to be with a cors proxy https://github.com/Rob--W/cors-anywhere
		fetch(`https://cors-anywhere.herokuapp.com/${target_url}`, {
			method: "get",
			mode: "cors"
		})
			.then(function(response) {
				// Only start doing things if the response was good
				if (response.ok) {
					// Parses to json into 'data' | Trying to use 'return response.json();' returns undefined.
					response.json().then(function(data) {
						// Sends the data as string to the parser, which is the eventual output
						resolve(parser(JSON.stringify(data)));
					});
				} else {
					reject(
						Error(
							`Fetch failed with status code ${response.status}. ${
								response.statusText
							}`
						)
					);
				}
			})
			.catch(function(error) {
				reject(Error(`Fetch error: ${error}`));
			});
	});
}

// A one-size-fits-all formatter for any/all displayed string values/types
function format_for_display(data, precision) {
	// Parse here so we don't have to constantly worry about not passing floats
	data = parseFloat(data);

	// Credit https://stackoverflow.com/a/2901298
	function format_commas(str) {
		let parts = str.toString().split(".");
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		return parts.join(".");
	}

	// Is money
	if (precision === 2) {
		// Check (and remember) if negative
		const dollar_symbol = data < 0.0 ? "-$" : "$";
		// Removes a negative sign, if any
		data = Math.abs(data);
		data = format_commas(data.toFixed(precision));

		return `${dollar_symbol}${data}`;
		// Only the navbar tags use zero precision
	} else if (precision === 0) {
		// Round to whole number
		return format_commas(Math.round(data));
		// Only the mined amount uses 8 precision, so we can just catch as default
	} else {
		return format_commas(data.toFixed(precision));
	}
}

function hps_multiplier(hps) {
	/*
		Multiply hashrate to get the hashrate as base hashrate, instead of selected hash per second.

		Values from https://en.wikipedia.org/wiki/Template:Bitrates
	*/

	switch (hps) {
		case "h":
			return 1.0;
		case "kh":
			return 1000.0;
		case "mh":
			return 1000000.0;
		case "gh":
			return 1000000000.0;
		case "th":
			return 1000000000000.0;
		default:
			return 1.0;
	}
}

// Run from body onload(), then on a timer every 100 seconds
function fill_network_badges() {
	// Using promise.all allows for loading all at the same time, as to appear less laggy
	Promise.all([
		query("explorer", "getdifficulty"),
		query("explorer", "getblockcount"),
		query("explorer", "getnetworkhashps")
	])
		.then(values => {
			// getnetworkhashps returns in H/s, so we convert UP to GH/s by dividing
			values[2] /= hps_multiplier("gh");

			// All three values are displayed rounded to full numbers
			document.getElementById(
				"pow_difficulty"
			).textContent = format_for_display(values[0], 0);

			document.getElementById("block_count").textContent = format_for_display(
				values[1],
				0
			);

			document.getElementById(
				"network_hashrate"
			).textContent = format_for_display(values[2], 0);
		})
		.catch(function(error) {
			// Throw an alert if query fails
			console.error(error);
			alert(`API query failed!\n\n${error}`);
		});
}

// NOTE: Always pass parseFloat() so toFixed doesn't break, even if 0 precision.
function fill_grid_elements(target_element, value, precision) {
	/*
				Id's of various html tags are "X_Y"

				Where X is profit/mined/power
				and Y is day/week/month/year

				Ex: The id for power cost per month is "power_month"
				*/

	let display_value = value;
	document.getElementById(
		target_element + "_day"
	).textContent = format_for_display(display_value, precision);
	display_value = value * 7.0;

	document.getElementById(
		target_element + "_week"
	).textContent = format_for_display(display_value, precision);
	display_value = value * 7.0 * 3.0;

	document.getElementById(
		target_element + "_month"
	).textContent = format_for_display(display_value, precision);
	display_value = value * 7.0 * 3.0 * 12.0;

	document.getElementById(
		target_element + "_year"
	).textContent = format_for_display(display_value, precision);
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
		console.log(`Using total PoW+PoS reward = ${subsidy}`);
		return subsidy;
	}

	function incentive_percent() {
		const percents = [
			{
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
			console.log(
				`Using incentive percent = ${percents[percents_len].percent}`
			);
			return percents[percents_len].percent;
		} else {
			for (const obj of percents) {
				if (block < obj.block) {
					console.log(`Using incentive percent = ${obj.percent - 1}`);
					return obj.percent - 1;
				}
			}
		}
	}

	const reward_total = total_reward();
	const incentive_reward = reward_total / 100 * incentive_percent();
	// Returns the PoW-only reward
	console.log(`Using PoW reward = ${reward_total - incentive_reward}`);
	return parseFloat(reward_total - incentive_reward);
}
// Triggered by onclick() from calculate button
// The eslint comment is needed to avoid a non-issue
// eslint-disable-next-line no-unused-vars
function main() {
	/*
		List of DOM ID's...

		Hashrate id="hashrate"
		Hashrate per second id="hash_per_sec"
		Power consumption id="power_consumption"
		Power cost id="power_cost"

		Pre-parse all input to float to avoid numbers getting rounded into the abyss
	*/
	// Convert DOWN to the base H/s by multiplying
	const hashrate =
		parseFloat(document.getElementById("hashrate").value) *
		hps_multiplier(document.getElementById("hash_per_sec").value);
	const power_consumption = parseFloat(
		document.getElementById("power_consumption").value
	);
	const power_cost = parseFloat(document.getElementById("power_cost").value);

	// Safety-check the user input
	// If we didn't get numeric inputs, thrown a warning & quit early
	if (isNaN(hashrate) || isNaN(power_cost) || isNaN(power_consumption)) {
		console.warn("Incorrect value(s) in input boxes!");
		return 1;
	}

	// Disable/enable button while running
	const calculate_button = {
		dom_obj: document.getElementById("calculate_btn"),
		enable: function() {
			this.dom_obj.disabled = false;
			this.dom_obj.textContent = "Calculate";
		},
		disable: function() {
			this.dom_obj.disabled = true;
			this.dom_obj.textContent = "Loading...";
		}
	};
	// Disable the calc button while running calulations & queries
	calculate_button.disable();

	// Chain promises together because some of the math depends on eachother
	Promise.all([
		query("explorer", "getnetworkhashps"),
		query("bittrex", "getmarketsummary?market=BTC-XVC"),
		query("bittrex", "getmarketsummary?market=USDT-BTC"),
		query("explorer", "getblockcount")
	])
		.then(values => {
			// Values is an array with the results of each promise

			// HashRate/24h_Average_Net_HashRate*PoW_Reward*18*24  = XVC/DAY
			const avg_mined =
				hashrate /
				parseFloat(values[0]) *
				get_pow_reward(parseInt(values[3])) *
				18.0 *
				24.0;

			// power_consumption / 1000 is to convert watts to kilowatts
			// power_cost is in kWh
			// * 24 to convert to cost per day
			const avg_power_cost = power_consumption / 1000.0 * power_cost * 24.0;
			// Calc how many bitcoins you'd make, then multiply it by the conversion to USD
			// (XVC-to-BTC * mined) * BTC-to-USDT
			// Minus power cost from profit to get actual profit
			const avg_profit =
				parseFloat(values[1]) * avg_mined * parseFloat(values[2]) -
				avg_power_cost;

			// Fill all at once to appear less laggy
			fill_grid_elements("mined", avg_mined, 8);
			fill_grid_elements("profit", avg_profit, 2);
			fill_grid_elements("power", avg_power_cost, 2);
		})
		.catch(function(error) {
			// Throw an alert if query fails
			console.error(error);
			alert(`API query failed!\n\n${error}`);
		})
		.then(function() {
			calculate_button.enable();
		});
}

// Fills the badges with data retrieved from explorer API every 100 seconds (avg block time)
setInterval(function() {
	fill_network_badges();
}, 100000);
