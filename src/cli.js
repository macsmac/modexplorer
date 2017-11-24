const inquirer = require("inquirer");

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
			choices: data.map(e => e.text),
			type: "list",
			prefix: "",
			suffix: "",
			name: "data",
			message: message || " "
		}]).then(function(result) {
			const btn = data.find(e => e.text === result.data);
			process.nextTick(() => cb(null, btn));
		}).catch(cb);
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
	 */
	switchScreen: function(name, data, cb) {
		if (cli._busy) return cb(new Error("Switching busy screen"));

		const screen = { name, data, cb };

		if (cli._history.length > 5) cli._history.pop();
		cli._history.unshift(screen);

		cli._current = screen;

		cli._screens[name](data, cb || cli.prevScreen);
	},
	/**
	 * Switches to previous screen
	 * @param {function} cb - Previous screen callback
	 */
	prevScreen: function(cb = dummy) {
		if (cli._history.length === 1) return cb();

		cli._history.shift();
		const screen = cli._history[cli._history.length - 1];

		cli.switchScreen(screen.name, screen.data, cb || screen.cb);
	},
	/**
	 * Sets if screen is busy or not
	 * @param {bool} val - Busy state
	 */
	busy: function(val) {
		cli._busy = val;
	}
}

module.exports = cli;