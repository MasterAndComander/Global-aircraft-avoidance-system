#!/usr/local/bin/python3.6

from pydantic import BaseSettings


class Configuration(BaseSettings):
    '''
    Configure program within environment or default values
    '''

    DEVICE_ID = 'albertuav'
    LAT = 36.71857067765769
    LON = -4.497233005060216
    ALT = 53
    HEADING = 45
