var mongoose = require('mongoose');
var pyshell = require('python-shell');
var logger = require('../config/logger');

var TimelineEventSchema = new mongoose.Schema({
    t: Number,
    event: String,
    timing: Number
});

var BeatmapSchema = new mongoose.Schema({
    beatmap_md5: String,
    beatmap_id: Number,
    name: String,
    artist: String,
    creator: String,
    od: Number,
    cs: Number,
    ar: Number,
    hp: Number
});

var ReplaySchema = new mongoose.Schema({
    replay_md5: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    beatmap: {
        type: BeatmapSchema,
        index: true
    },
    player: {
        type: String,
        index: true
    },
    mode: Number,
    num_300: Number,
    num_100: Number,
    num_50: Number,
    num_geki: Number,
    num_katu: Number,
    num_miss: Number,
    score: Number,
    max_combo: Number,
    perfect_combo: Boolean,
    mods: {
        no_fail: Boolean,
        easy: Boolean,
        no_video: Boolean,
        hidden: Boolean,
        hard_rock: Boolean,
        sudden_death: Boolean,
        double_time: Boolean,
        relax: Boolean,
        half_time: Boolean,
        nightcore: Boolean,
        flashlight: Boolean,
        autoplay: Boolean,
        spun_out: Boolean,
        auto_pilot: Boolean,
        perfect: Boolean,
        key4: Boolean,
        key5: Boolean,
        key6: Boolean,
        key7: Boolean,
        key8: Boolean,
        fade_in: Boolean,
        random: Boolean,
        cinema: Boolean,
        target_practice: Boolean,
        key9: Boolean,
        coop: Boolean,
        key1: Boolean,
        key3: Boolean,
        key2: Boolean
    },
    time_stamp: Number,
    timeline: [TimelineEventSchema],
    keys: {
        M1: Number,
        M2: Number,
        K1: Number,
        K2: Number
    },
    hitmap_resolution: Number,
    hitmap_size: Number,
    circle_size: Number,
    hitmap: [Number],
    timings: [Number],
    stream_timings: [Number]
});

ReplaySchema.statics.parseReplay = function(pathToFile, cb) {
    options = {
        mode: 'text',
        pythonPath: '/usr/bin/python3.4',
        args: [pathToFile]
    };
    var res = null;
    pyshell.run('parser.py', options, function(err, results) {
        if(err) {
            logger.info(err);
            cb(null);
            return;
        }
        js = JSON.parse(results[0]);
        new Replay(js).save(function(error){
            // duplicate key error
            if(error) {
                if(error.code == 11000) {
                    logger.info('Duplicate key: ' + js.replay_md5)
                } else {
                    logger.info(error)
                }
            } else {
                logger.info('Saved replay ' + js.replay_md5);
            }
        });
        cb(js);
    });

    return res;
};

ReplaySchema.statics.summary = function(replay) {
    var fields = ['replay_md5', 'beatmap', 'player', 'mode',
        'num_300', 'num_100', 'num_50', 'num_geki', 'num_katu',
        'num_miss', 'score', 'max_combo', 'mods', 'time_stamp'];
    var summary = {}
    for(var i in fields) {
        var field = fields[i];
        summary[field] = replay[field];
    }
    return summary;
}

var Replay = mongoose.model('Replay', ReplaySchema);

module.exports = {
    Replay: Replay
};