var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var multer = require('multer');
var request = require('request');
var Replay = mongoose.model('Replay');
var Beatmap = mongoose.model('Beatmap');

// define multer stuff
var storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, './uploads');
    }
});

var upload = multer({
    storage : storage
});

var verifyCaptcha = function(key, callback) {

    // DEV DEV DEV DEV DEV
    callback(true);
    return;
    // DEV DEV DEV DEV DEV

    request({
            url: 'https://www.google.com/recaptcha/api/siteverify',
            method: 'POST',
            form: {
                secret: '6LeHWB4TAAAAAEnXnPIir3Z0IB4clLoOhKm7p1_D',
                response: captcha
            }
        }, function(error, response, body) {
            console.log(error);
            body = JSON.parse(body);
            if(error) {
                console.log('got an error');
                callback(false);
            } else if(body['success']) {
                callback(true);
            } else {
                callback(false);
            }
        });
}

/* Define routes */
module.exports = function(app) {
    app.get('/', function(req, res, next){
        res.render(index);
    });

    app.get('/api/replays', function(req, res, next){
        Replay.find(function(err, replays){
            if(err){ return next(err); }

            res.json(replays);
        });
    });

    app.get('/api/replay/:hash', function(req, res, next){
        var hash = req.params.hash;
        Replay.findOne({'replay_md5': hash}, function(err, replay){
            if(err){ return next(err); }

            res.json(replay);
        });
    });

    app.get('/api/search', function(req, res, next) {
        var queryParams = {}
        var request = req.query;
        if(request.player) 
            queryParams['player'] = request.player;
        if(request.title)
            queryParams['beatmap.title'] = request.title;
        if(request.beatmap_id)
            queryParams['beatmap.beatmap_id'] = request.beatmap_id;
        if(request.creator)
            queryParams['beatmap.creator'] = request.creator;
        if(request.artist)
            queryParams['beatmap.artist'] = request.artist;
        if(request.version)
            queryParams['beatmap.version'] = request.version;

        Replay.find(queryParams)
            .select('replay_md5 beatmap player mode num_300 '+
                'num_100 num_50 num_geki num_katu num_miss score '+
                'max_combo mods time_stamp')
            .sort({'time_stamp': -1})
            .limit(20)
            .exec(function(err, replays) {
                if(err) { return next(error) };
                res.json(replays);
            });

    });

    app.post('/api/upload', upload.single('userReplay'), function(req, res, next) {
        // verify the recaptcha
        var captcha = req.body['g-recaptcha-response']
        verifyCaptcha(captcha, function(success) {
            if(!success) {
                res.json({'error': 'recaptcha failed'});
            } else if (!req.file) {
                res.json({'error': 'No file selected'});
            } else {
                Replay.parseReplay(req.file.path, function(replay) {
                    if(replay) res.json(replay);
                    else {
                        res.json({'error': 'Invalid replay file.'});
                    }
                });
            }
        });

    });
}

