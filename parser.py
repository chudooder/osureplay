from struct import unpack_from
from dbparse import parseReplay
class HitObject:
    x = -1
    y = -1
    time = -1

    def __init__(self, x, y, time):
        self.x = x
        self.y = y
        self.time = time

def parse_object(line):
    params = line.split(',')
    x = float(params[0])
    y = float(params[1])
    time = float(params[2])

    objtype = int(params[3])
    # hit circle
    if objtype in [1, 5]:
        return HitObject(x, y, time)

    # TODO: deal with sliders
    elif objtype in [2, 6]:
        return HitObject(x, y, time)

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
"""
Takes a replay file as input, and outputs a list of
replay actions that the player input, sorted by time
"""
