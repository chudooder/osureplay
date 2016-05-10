var bunyan = require("bunyan");
var logger = bunyan.createLogger({
    name: "dataLog",
    streams: [
        {
            level: 'info',
            path: __dirname + '/../bunyan.log'
        },
        {
            level: 'error',
            path: __dirname + '/../bunyan.log'
        }
    ]
});

module.exports = logger;