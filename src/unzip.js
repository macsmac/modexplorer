const unzip = require("unzip-stream");
const Volume = require("memfs").Volume;
const mfs = new Volume();
const fs = require("fs");

/**
 * Get files from archive
 * @param {string} archive - Archive path
 * @param {array[string]} path - Files to extract (returns only one lol)
 * @param {function} cb
 */
function getFile(archive, path, cb) {
	let called = false;

	fs.createReadStream(archive)
		.pipe(unzip.Parse())
		.on("entry", function(entity) {
			if (path.includes(entity.path)) {
				entity.pipe(mfs.createWriteStream("/" + path))
					.on("close", function() {
						mfs.readFile("/" + path, function(err, content) {
							if (!called) cb(content);
							called = true;
							mfs.reset();
						});
					}).on("err", () => {});
			} else {
				entity.autodrain();
			}
		});
}

module.exports = { getFile };