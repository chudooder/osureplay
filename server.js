var mongoose = require('mongoose');
var express = require('express');
var multer = require('multer');
var autoReap = require('multer-autoreap')
var path = require('path');
var morgan = require('morgan');
var fs = require('fs');

autoReap.options = {
    reapOnError: true
};

var app = express();

// configure app
app.use(express.static(path.join(__dirname, 'public')));

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(__dirname + '/access.log', {flags: 'a'})

// setup the logger
app.use(morgan('combined', {stream: accessLogStream}))
app.use(autoReap);

// models
require('./app/models/model');

// hook up routes
require('./app/routes/api')(app);
require('./app/routes/page')(app);

mongoose.connect('mongodb://localhost/osureplay');

//Start server
var port = 8080;
app.listen( port, function() {
    console.log( 'Express server listening on port %d in %s mode', port, app.settings.env);
});