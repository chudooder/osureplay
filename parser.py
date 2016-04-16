from struct import unpack_from
from dbparse import parseReplay
from collections import Counter, deque

import numpy as np
import math

import matplotlib.pyplot as plt

# constants
HITMAP_RESOLUTION = 128
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

    def __str__(self):
        return '(%d, %d, %d)' % (self.x, self.y, self.time)

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
def get_objects(fp):
    osu = open(fp)
    objects = []
    parsing = False
    for line in osu:
        # skip lines until we hit the hitobjects
        if '[HitObjects]' in line:
            parsing = True
        elif not parsing:
            continue
        elif parsing:
            obj = parse_object(line)
            if obj != None:
                objects.append(obj)

    return objects

def get_difficulty(fp):
    osu = open(fp)
    difficulty = {}
    for line in osu:
        if 'CircleSize' in line:
            cs = float(line.split(':')[1])
            difficulty['cs'] = cs
        elif 'OverallDifficulty' in line:
            od = float(line.split(':')[1])
            difficulty['od'] = od

    return difficulty


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
    stats = Counter()
    hitmap = np.zeros((HITMAP_RESOLUTION, HITMAP_RESOLUTION))
    timings = np.zeros(TIMING_RESOLUTION)

    for time in range(end_time):
        # check if input advances
        if len(inputs) > 0:
            next_input = inputs[0]
            if time > next_input['time']:
                prev_input = cur_input
                cur_input = inputs.popleft()

                # check if player pushed a button
                if True in [cur_input['keys'][k] and not prev_input['keys'][k] \
                    for k in ['M1', 'M2', 'K1', 'K2']]:

                    # check if player hit current hitobject
                    if cur_obj != None and dist(cur_input, cur_obj) < RADIUS:
                        # it's a hit!
                        stats['hits'] += 1
                        score_val = score_hit(time, cur_obj, WINDOW)
                        stats[score_val] += 1
                        
                        # get the x and y hitmap coords
                        xi, yi = transform_coords(cur_input, prev_obj, cur_obj)
                        hitmap[yi][xi] += 1

                        # get the timing bucket
                        bucket = int((time - cur_obj.time) / (WINDOW[2] * 2) * \
                            TIMING_RESOLUTION) + TIMING_RESOLUTION / 2
                        timings[bucket] += 1


                        prev_obj = cur_obj
                        cur_obj = None
                        
                    else:
                        # wasted a click
                        stats['extra_clicks'] += 1

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

    # done parsing!
    replay_hits = replay['300'] + replay['100'] + replay['50']
    replay_misses = replay['miss']
    print('replay hits: ' + str(replay_hits))
    print('replay misses: ' + str(replay_misses)) 
    print('replay 300: ' + str(replay['300']))
    print('replay 100: ' + str(replay['100']))
    print('replay 50: ' + str(replay['50']))

    return (stats, hitmap, timings)


if __name__ == '__main__':
    # bm_file = 'data/granat.osu'
    # rp_file = 'data/granat_extra.osr'

    # bm_file = 'data/junshin_always.osu'
    # rp_file = 'data/junshin_always_colorful.osr'

    bm_file = 'data/darling_insane.osu'
    rp_file = 'data/darling_insane.osr'

    objects = get_objects(bm_file)
    difficulty = get_difficulty(bm_file)
    replay_file = open(rp_file, 'rb').read()
    replay = parseReplay(replay_file)

    stats, hitmap, timings = simulate(objects, difficulty, replay)

    print(timings)

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