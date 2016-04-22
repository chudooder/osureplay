var bunyan = require("bunyan");
var logger = bunyan.createLogger({name: "dataLog"});

module.exports = logger;