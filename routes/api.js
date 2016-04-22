var mongoose = require('mongoose');
var multer = require('multer');
var Replay = mongoose.model('Replay');

// define multer stuff
var storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, './uploads');
    },
    filename: function(req, file, callback) {
        callback(null, file.fieldname);
    }
});

var upload = multer({
    storage : storage
});

/* Define routes */
module.exports = function(app) {
    app.get('/', function(req, res, next){
        res.render(index);
    });

    app.get('/replays', function(req, res, next){
        Replay.find(function(err, replays){
            if(err){ return next(err); }

            res.json(replays);
        });
    });

    app.get('/replay/:hash', function(req, res, next){
        hash = req.params.hash;
        Replay.findOne({'replay_md5': hash}, function(err, replay){
            if(err){ return next(err); }

            res.json(replay);
        });
    });

    app.get('/user/:name', function(req, res, next){
        name = req.params.name;
        Replay.find({'player': name}, function(err, playerReplays){
            if(err){ return next(err); }
            res.json(playerReplays);
        })
    });

    app.post('/upload', upload.single('userReplay'), function(req, res, next) {
        // parse the replay
        Replay.parseReplay(req.file.path, function(replay) {
            if(replay) res.json(replay);
            else {
                res.json({'error': 'Invalid replay file.'});
            }
        });
    });
}

