var mongoose = require('mongoose');
var express = require('express');
var multer = require('multer');
var path = require('path');
var logger = require('morgan');

var app = express();

// configure app
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));

// models
require('./app/models/replay');

// hook up routes
require('./app/routes/api')(app);
require('./app/routes/page')(app);

mongoose.connect('mongodb://localhost/osureplay');

//Start server
var port = 8080;
app.listen( port, function() {
    console.log( 'Express server listening on port %d in %s mode', port, app.settings.env);
});