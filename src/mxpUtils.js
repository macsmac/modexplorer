const fs = require("fs"),
	  fse = require("fs-extra"),
	  https = require("https"),
	  crypto = require("crypto");

const mxpUtils = {
	downloadFile: function(link, dest, cb) {
		const cachefile = "../cache/" + mxpUtils.md5(link);

		fs.stat(cachefile, function(err, stats) {
			if (stats && stats.isFile()) return fse.copy(cachefile, dest, cb);

			https.get(link, 
				stream => 
					stream.pipe(fs.createWriteStream(dest))
						.on("close", () => fse.copy(dest, cachefile, cb))
						.on("error", cb)
			);
		});
	},
	randStr: function() {
		return Math.random().toString(36).slice(2);
	},
	appendJar: function(file) {
		return file + (file.endsWith(".jar") ? "" : ".jar");
	},
	md5: function(str) {
		return crypto.createHash("md5").update(str).digest("hex");
	}
}

module.exports = mxpUtils;