const cli = require("./cli");

/*
just for test
*/

cli.addScreen("main", function(data, cb) {
	cli.busy(true);
	cli.list(null, [
	{
		text: "test",
		data: "test"
	}
	], function(err, data) {
		cli.busy(false);
		cb();
		cli.switchScreen("test"/*, {}, console.log*/);
	});
});

cli.addScreen("test", function(data, cb) {
	console.log("test");
	setTimeout(() => cb(), 2000);
});

cli.switchScreen("main");