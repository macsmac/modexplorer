const inquirer = require("inquirer"),
      clear = require("clear"),
      size = require("window-size");

function dummy(){}

const cli = {
	_screens: {},
	_history: [],
	_busy: false,
	_current: null,
	/**
	 * Shows list to choice from
	 * @param {string} message - Message
	 * @param {object} data - List data
	 * @param {function} cb
	 */
	list: function(message, data, cb) {
		inquirer.prompt([{
			choices: typeof data[0] === "object" ? data.map(e => e.text) : data,
			type: "list",
			prefix: "",
			suffix: "",
			name: "data",
			message: message || " ",
			pageSize: size.height - 4
		}]).then(function(result) {
			const btn = typeof data[0] === "object" ? data.find(e => e.text === result.data) : result;
			process.nextTick(() => cb(null, btn.data));
		}).catch(cb);
	},
	/**
	 * Shows text input
	 * @param {string} message - Message
	 * @param {function} cb
	 */
	input: function(message, cb) {
		inquirer.prompt([{
			type: "input",
			prefix: "",
			suffix: "",
			name: "input",
			message: message || " "
		}]).then(r => cb(null, r.input)).catch(cb);
	},
	/**
	 * Adds cli screen
	 * @param {string} name - Screen name
	 * @param {funcion} fn - Screen handler
	 */
	addScreen: function(name, fn) {
		cli._screens[name] = fn;
	},
	/**
	 * Switches current screen
	 * @param {string} name - Screen name
	 * @param {any} data - Data that will be given to screen
	 * @param {function} cb - Called when screen calls callback, 
	                          if not present will switch to previous screen
	                          if true will just end
	 * @param {boolean} save - If need to save to screen hustory
	 */
	switchScreen: function(name, data, cb, save = true) {
		cli.clear();

		if (cli._busy) throw new Error("Switching busy screen");

		cb = typeof cb !== "boolean" ? cb || cli.prevScreen : dummy;

		const screen = { name, data, cb };
		const fnscreen = cli._screens[name];

		if (cli._history.length > 5) cli._history.pop();
		if (save) cli._history.unshift(screen);

		cli._current = screen;

		process.nextTick(() => fnscreen(data, cb));
	},
	/**
	 * Switches to previous screen
	 * @param {function} cb - Previous screen callback
	 */
	prevScreen: function(num = 1, cb = dummy) {
		if (cli._history.length === 1) return cb();

		for (let i = 0; i < num; i++) 
			cli._history.shift();

		const screen = cli._history[0];

		cli.switchScreen(screen.name, screen.data, screen.cb || cb, false);
	},
	/**
	 * Sets if screen is busy or not
	 * @param {bool} val - Busy state
	 */
	busy: function(val) {
		cli._busy = val;
	},
	clear: function() {
		console.log("\n".repeat(size.height + 1));
		clear();
		console.log("[" + cli._history.map(e => e.name + "(" + e.cb.name + ")").join(" ") + "]");
	}
}

module.exports = cli;