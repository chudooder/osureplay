var mongoose = require('mongoose');
var child_process = require('child_process');

mongoose.connect('mongodb://localhost/osureplay');

// models
require('./app/models/model');
var Replay = mongoose.model('Replay');

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
    };

    var str = ''

    for(var k in abbrev) {
        var enabled = replay.mods[k];
        if(enabled) {
            if(str == '') str = '+';
            if(abbrev[k]) str += abbrev[k];
        }
    }

    if(str == '') {
        return '+nomod';
    }
    return str;
}

var updateOne = function() {
    Replay.findOne({'pp': -1}, function(err, rp) {
        if(err) {
            console.log(err);
            return;
        }
        if(rp == null) {
            return;
        }
        console.log('found one: ' + rp.replay_md5);
        // run oppai for the pp calculation
        var bmFile = rp.beatmap.beatmap_md5 + '.osu';
        var params = [
            'data/' + bmFile,
            rp.num_100 + 'x100',
            rp.num_50 + 'x50',
            modString(rp),
            rp.max_combo + 'x'
        ]
        var oppai = child_process.spawn('./oppai/oppai/oppai', params);

        console.log(params)

        oppai.stdout.on('data', function(data) {
            var output = data.toString('utf8');
            var re = /[0-9\.]pp/;
            var newPP;
            var lines = output.split('\n');
            for(var i=0; i<lines.length; i++) {
                if(re.exec(lines[i])) {
                    newPP = Number(lines[i].slice(0, -2));
                    console.log('Calculated '+newPP+'pp for ' + rp.replay_md5);
                }
            }

            // save the replay and update if necessary
            Replay.update(
                {'replay_md5': rp.replay_md5}, 
                {
                    $set: {
                        pp: newPP
                    }
                },
                function(err, numAffected) {
                    console.log(numAffected);
                    updateOne();
                });
        });
    });
}

updateOne();
console.log('done');