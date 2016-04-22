from struct import unpack_from
from dbparse import parseReplay
from collections import Counter, deque

import numpy as np
import math
import json
import urllib.request
import sys
import os

from copy import deepcopy

# constants
HITMAP_RESOLUTION = 64
HITMAP_SIZE = 128
TIMING_RESOLUTION = 64

class HitObject:
    x = -1
    y = -1
    time = -1
    lenient = False

    def __init__(self, x, y, time, lenient):
        self.x = x
        self.y = y
        self.time = time
        self.lenient = lenient
        self.tags = []

    def add_tag(self, tag):
        if tag not in self.tags:
            self.tags.append(tag)

    def __str__(self):
        return '(%d, %d, %d, %s)' % \
            (self.time, self.x, self.y, self.tags)

class TimingPoint:
    time = -1
    mpb = -1

    def __init__(self, time, mpb):
        self.time = time
        self.mpb = mpb

def parse_object(line):
    params = line.split(',')
    x = float(params[0])
    y = float(params[1])
    time = int(params[2])

    objtype = int(params[3])
    # hit circle
    if objtype in [1, 5]:
        return HitObject(x, y, time, False)

    # TODO: deal with sliders
    elif objtype in [2, 6]:
        return HitObject(x, y, time, True)

    # ignore spinners
    else:
        return None     

"""
Takes a beatmap file as input, and outputs a list of
beatmap objects, sorted by their time offset.
"""
def parse_osu(osu):
    objects = []
    timing_points = []
    beatmap = {}
    in_objects = False
    in_timings = False
    # parse the osu! file
    for line in osu:
        if 'CircleSize' in line:
            beatmap['cs'] = float(line.split(':')[1])
        elif 'OverallDifficulty' in line:
            beatmap['od'] = float(line.split(':')[1])
        elif 'HPDrainRate' in line:
            beatmap['hp'] = float(line.split(':')[1])
        elif 'ApproachRate' in line:
            beatmap['ar'] = float(line.split(':')[1])
        elif 'Title' in line:
            beatmap['title'] = line.split(':')[1].strip()
        elif 'Artist' in line and 'Unicode' not in line:
            beatmap['artist'] = line.split(':')[1].strip()
        elif 'Creator' in line and 'Unicode' not in line:
            beatmap['creator'] = line.split(':')[1].strip()
        elif 'BeatmapID' in line:
            beatmap['beatmap_id'] = line.split(':')[1].strip()

        elif '[TimingPoints]' in line:
            in_timings = True
        elif in_timings:
            if line.strip() == '':
                in_timings = False
                continue

            args = line.split(',')
            time = int(args[0])
            mpb = float(args[1])
            if mpb > 0:
                pt = TimingPoint(time, mpb)
                timing_points.append(pt)

        if '[HitObjects]' in line:
            in_objects = True
        elif in_objects:
            obj = parse_object(line)
            if obj != None:
                objects.append(obj)

    # find streams
    for i in range(len(objects) - 1):
        obj0 = objects[i]
        obj1 = objects[i+1]
        # get current mpb
        mpb = -1
        for t in timing_points:
            mpb = t.mpb
            if obj0.time >= t.time:
                break

        timing_diff = obj1.time - obj0.time
        # print(str(timing_diff) + ' ' + str(mpb/4 + 10))

        if timing_diff < mpb/4.0 + 10.0:
            obj0.add_tag('stream')
            obj1.add_tag('stream')

    return (objects, beatmap)


# get the timing window for a note with the given OD and mods
def timing_window(od, hd, ez):
    mod_od = od
    if ez:
        mod_od = 0.5 * od
    elif hd:
        mod_od = min(1.4 * od, 10)

    w300 = 79.5 - 6.0 * mod_od
    w100 = 139.5 - 8.0 * mod_od
    w50 = 199.5 - 10.0 * mod_od

    return (w300, w100, w50)

def in_window(obj, time, window):
    return obj.time - window[2] <= time and \
        obj.time + window[2] >= time

def circle_radius(cs, hd, ez):
    mod_cs = cs
    if hd:
        mod_cs -= 1
    elif ez:
        mod_cs += 1
    return (104.0 - mod_cs * 8.0) / 2.0

def dist(p_input, obj):
    return math.sqrt(math.pow(p_input['x'] - obj.x, 2) + \
        math.pow(p_input['y'] - obj.y, 2))

def score_hit(time, obj, window):
    if obj.lenient and abs(time - obj.time) <= window[2]:
        return '300'
    if abs(time - obj.time) <= window[0]:
        return '300'
    elif abs(time - obj.time) <= window[1]:
        return '100'
    elif abs(time - obj.time) <= window[2]:
        return '50'
    return 'welp'

def transform_coords(cur_input, prev_obj, cur_obj):
    dx = cur_input['x'] - cur_obj.x
    dy = cur_input['y'] - cur_obj.y
    theta = math.pi / 2.0
    if prev_obj != None:  
        thetaprime = math.atan2(cur_obj.y - prev_obj.y, cur_obj.x - prev_obj.x)
        theta = math.pi / 2.0 - thetaprime
    # get the rotation matrix
    a = math.cos(theta)
    b = math.sin(theta)
    R = [[a, -b], [b, a]]
    # apply the rotation matrix to the coordinates
    coords = np.ravel(R * np.array([[dx], [dy]]))
    # remap to hitmap pixel coordinates
    coords += HITMAP_SIZE / 2
    # one last remapping to hitmap index
    xi = int(coords[0] / HITMAP_SIZE * HITMAP_RESOLUTION)
    yi = int(coords[1] / HITMAP_SIZE * HITMAP_RESOLUTION)
    return(xi, yi)

"""
Simulates the game, collecting statistics on the way.
"""
def simulate(objects, difficulty, replay):
    mods = replay['mods']
    WINDOW = timing_window(difficulty['od'], mods['hard_rock'], mods['easy'])
    RADIUS = circle_radius(difficulty['cs'], mods['hard_rock'], mods['easy'])
    replay_data = replay['replay_data']
    end_time = max([objects[-1].time, replay_data[-1]['time']])

    # iteration variables
    inputs = deque(replay_data)
    objects = deque(objects)
    cur_input = {'time': -1, 'keys': \
        {'M1': False, 'M2': False, 'K1': False, 'K2': False}}
    prev_obj = None
    cur_obj = None

    # stats variables
    timeline = []
    keys = {'M1': 0, 'M2': 0, 'K1': 0, 'K2': 0}
    hitmap = np.zeros((HITMAP_RESOLUTION, HITMAP_RESOLUTION))
    timings = np.zeros(TIMING_RESOLUTION)

    stream_num = 0
    stream_timings = []


    for time in range(end_time):
        # check if input advances
        if len(inputs) > 0:
            next_input = inputs[0]
            if time > next_input['time']:
                prev_input = cur_input
                cur_input = inputs.popleft()

                # check if player pushed a button
                if True in [cur_input['keys'][k] and \
                    not prev_input['keys'][k] for k in ['M1', 'M2', 'K1', 'K2']]:

                    # add the pressed key to stats
                    for kk in ['M1', 'M2', 'K1', 'K2']:
                        if cur_input['keys'][kk]:
                            keys[kk] += 1

                    # check if player hit current hitobject
                    if cur_obj != None and dist(cur_input, cur_obj) < RADIUS:
                        # it's a hit!
                        score_val = score_hit(time, cur_obj, WINDOW)
                        time_diff = time - cur_obj.time
                        # if the scoreval is 100 or 50, add it to the timeline
                        if score_val == '100' or score_val == '50':
                            timeline.append({           \
                                    't': time,          \
                                    'event': score_val, \
                                    'timing': time_diff \
                                })
                        # get the x and y hitmap coords
                        xi, yi = transform_coords(cur_input, prev_obj, cur_obj)
                        hitmap[yi][xi] += 1

                        # get the timing bucket
                        
                        bucket = int(time_diff / (WINDOW[2] * 2) * \
                            TIMING_RESOLUTION) + int(TIMING_RESOLUTION / 2)
                        timings[bucket] += 1

                        # if it's a stream, record the timing
                        if 'stream' in cur_obj.tags:
                            if stream_num >= len(stream_timings):
                                stream_timings.append([])
                            stream_timings[stream_num].append(time_diff)
                            stream_num += 1
                        else:
                            stream_num = 0

                        prev_obj = cur_obj
                        cur_obj = None
                        
                    else:
                        # wasted a click
                        pass

        # hit object expires
        if cur_obj != None and time > cur_obj.time + WINDOW[2]:
            stats['misses'] += 1
            prev_obj = cur_obj
            cur_obj = None

        # pop in the next object if there's a vacancy
        if len(objects) > 0:
            next_obj = objects[0]
            if cur_obj == None and in_window(next_obj, time, WINDOW):
                cur_obj = objects.popleft()

    # done parsing! now to format the json
    # get streaming averages
    stream_avg = [sum(l) / len(l) for l in stream_timings]

    result = deepcopy(replay)
    result.pop('replay_data')
    result['timeline'] = timeline
    result['keys'] = dict(keys)
    result['hitmap'] = np.ravel(hitmap).tolist()
    result['hitmap_resolution'] = HITMAP_RESOLUTION
    result['hitmap_size'] = HITMAP_SIZE
    result['circle_size'] = RADIUS
    result['timings'] = timings.tolist()
    result['stream_timings'] = stream_avg

    difficulty['beatmap_md5'] = replay['beatmap_md5']
    result['beatmap'] = difficulty

    return result


def plot_hitmap(hitmap):
    import matplotlib.pyplot as plt
    res = len(hitmap)
    mods = replay['mods']
    csr = circle_radius(difficulty['cs'], mods['hard_rock'], mods['easy'])

    fig, axis = plt.subplots()
    heatmap = axis.pcolor(hitmap, cmap=plt.cm.viridis, alpha=1.0)
    circle = plt.Circle((HITMAP_RESOLUTION/2, HITMAP_RESOLUTION/2), \
        csr/HITMAP_SIZE*HITMAP_RESOLUTION, color='red', fill=False)
    fig.gca().add_artist(circle);
    axis.set_aspect('equal')

    plt.xlim(0, res)
    plt.ylim(0, res)
    plt.show();

def get_beatmap_id(bm_hash):
    # api call to find the beatmap id
    apiurl = 'https://osu.ppy.sh/api/get_beatmaps?'
    key = open('apikey').read().strip()
    url = apiurl + 'k=' + key + '&h=' + bm_hash

    response = urllib.request.urlopen(url)
    res = str(response.read(), 'utf-8')
    jsonRes = json.loads(res)

    if len(jsonRes) == 0:
        return None

    return jsonRes[0]['beatmap_id']

if __name__ == '__main__':
    # bm_file = 'data/granat.osu'
    # rp_file = 'data/granat_extra.osr'

    # bm_file = 'data/junshin_always.osu'
    # rp_file = 'data/junshin_always_colorful.osr'

    # bm_file = 'data/darling_insane.osu'
    # rp_file = 'data/darling_insane.osr'

    rp_file = sys.argv[1]
    replay = parseReplay(open(rp_file, 'rb').read())

    # attempt to locate beatmap file in /data
    bm_hash = replay['beatmap_md5']
    bm_path = 'data/' + bm_hash + '.osu'
    bm_file = None

    if os.path.isfile(bm_path):
        bm_file = open(bm_path)
    else:
        bm_id = get_beatmap_id(bm_hash)
        # download the beatmap file to the local file system
        if bm_id != None:
            urllib.request.urlretrieve('https://osu.ppy.sh/osu/' + bm_id, bm_path)
            bm_file = open(bm_path)

    if bm_file == None:
        print(json.dumps({'error': 'Invalid beatmap hash: beatmap not found'}))

    replay_file = open(rp_file, 'rb').read()

    objects, beatmap = parse_osu(bm_file)
    results = simulate(objects, beatmap, replay)
    print(json.dumps(results))

    # plot_hitmap(np.reshape(results['hitmap'], (HITMAP_RESOLUTION, HITMAP_RESOLUTION))
