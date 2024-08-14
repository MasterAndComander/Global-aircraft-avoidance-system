#!/usr/local/bin/python3.6

import math
import time

from dronekit import LocationGlobalRelative

class Gps:
    def __init__(self) -> None:
        pass

    def get_distance_metres(self, source_location, target_location):
        '''
        Returns ground distance in metres between two LocationGlobal objects.

        This method is an approximation, and will not be accurate over
        large distances and close to the earth's poles.
        It comes from the ArduPilot test code:
        https://github.com/diydrones/ardupilot/blob/master/Tools/autotest/common.py
        '''
        dlat = target_location.lat - source_location.lat
        dlong = target_location.lon - source_location.lon

        return math.sqrt((dlat*dlat) + (dlong*dlong)) * 1.113195e5
