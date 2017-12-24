const fs = require("fs");

let _settings = require("../config/settings");

const settings = {
	set: function(key, val) {
		return _settings[key] = val;
	},
	update: function(cb) {
		fs.writeFile("../config/settings.json", JSON.stringify(_settings), () => cb() /* hack */);
	},
	get: function(key) {
		return _settings[key];
	}
}

module.exports = settings;