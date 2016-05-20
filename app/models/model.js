var mongoose = require('mongoose');
var pyshell = require('python-shell');
var child_process = require('child_process');
var logger = require('../../config/logger');

var TimelineEventSchema = new mongoose.Schema({
    t: Number,
    event: String,
    timing: Number,
    xi: Number,
    yi: Number
});

var BeatmapSchema = new mongoose.Schema({
    beatmap_md5: String,
    beatmap_id: {
        type: Number,
        required: true,
        index: true
    },
    beatmap_set_id: Number,
    title: String,
    title_lower: {
        type: String,
        index: true
    },
    artist: String,
    artist_lower: {
        type: String,
        index: true
    },
    creator: String,
    creator_lower: {
        type: String,
        index: true
    },
    version: String,
    version_lower: {
        type: String,
        index: true
    },
    od: Number,
    cs: Number,
    ar: Number,
    hp: Number,
    length: Number,
    sd: Number
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
    },
    player_lower: {
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
    stream_timings: [Number],
    unstable_rate: Number,
    pp: Number
});

var modString = function(replay) {
    var abbrev = {
        'sudden_death': 'SD',
        'perfect': 'PF',
        'hard_rock': 'HR',
        'nightcore': 'NC',
        'double_time': 'DT',
        'hidden': 'HD',
        'flashlight': 'FL',
        'no_fail': 'NF',
        'easy': 'EZ',
        'half_time': 'HT',
        'spun_out': 'SO',
        'relax': 'RL',
        'auto_pilot': 'AP'
    }

    var str = ''

    for(var k in abbrev) {
        var enabled = replay.mods[k];
        if(enabled) {
            if(str == '') str = '+';
            str += abbrev[k];
        }
    }

    if(str == '') {
        return '+nomod';
    }
    return str;
}

ReplaySchema.statics.parseReplay = function(pathToFile, cb) {
    options = {
        mode: 'text',
        pythonPath: '/usr/bin/python3.4',
        args: [pathToFile]
    };

    pyshell.run('parser.py', options, function(err, results) {
        if(err) {
            logger.info(err);
            cb(null);
            return;
        }

        var js = JSON.parse(results[0]);

        if(js.error) {
            cb(js);
            return;
        }

        // run oppai for the pp calculation
        js.pp = -1;
        var bmFile = js.beatmap.beatmap_hash + '.osu';
        var params = [
            'data/' + bmFile,
            js.num_100 + 'x100',
            js.num_50 + 'x50',
            modString(js),
            js.max_combo + 'x'
        ]
        var oppai = child_process.spawn('./oppai/oppai/oppai', params);

        oppai.stdout.on('data', function(data) {
            var output = data.toString('utf8');
            var re = /[0-9\.]pp/;
            var lines = output.split('\n');
            for(var i=0; i<lines.length; i++) {
                if(re.exec(lines[i])) {
                    var pp = Number(lines[i].slice(0, -2));
                    js.pp = pp;
                }
            }

            // save the replay and update if necessary
            Replay.findOneAndUpdate(
                {'replay_md5': js.replay_md5}, 
                js, 
                {upsert:true}, 
                function(err, replay) {
                    logger.info('Saved replay ' + js.replay_md5);
                    cb(js);
                });
        });
    });
};

var Beatmap = mongoose.model('Beatmap', BeatmapSchema);
var Replay = mongoose.model('Replay', ReplaySchema);

module.exports = {
    Replay: Replay,
    Beatmap: Beatmap
};