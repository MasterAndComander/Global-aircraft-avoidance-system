#!/usr/bin/python

import json

from mavlinkuavpy.rabbitmqpy import topic_producer
from mavlinkuavpy.rabbitmqpy.utils import custom_exceptions
from mavlinkuavpy.rabbitmqpy.utils.custom_exceptions import TLSCertificatesNotFound

VEHICLE_ID = 'titan'


class Talker:
    def __init__(self) -> None:
        try:
            self.producer = topic_producer.TopicProducer(VEHICLE_ID, 'message')
        except AttributeError:
            print('AttributeError. Wrong topic_producer cration')

    def produce(self, command) -> None:
        self.producer.publish(json.dumps(command))


LOOP = True

try:
    talker = Talker()

    def menu() -> int:
        options = '''
            1. Takeoff: takeoff
            2. RTL: Return To Launch
            3. Simple goto: do simple goto to given position
            4. Stop: stop uav
            5. Automatic mission: perform automatic mission
            6. Land: land on position
            0. Exit
        '''

        return int(input(options))

    while LOOP:
        choice = menu()

        if choice is 0:
            LOOP = False
        elif choice == 1:
            print('takeoff')

            # command
            takeoff = {
                'id': VEHICLE_ID,
                'action': 'takeoff',
                'args': {
                    'altitude': 10
                }
            }

            # send command
            talker.produce(takeoff)
        elif choice == 2:
            print('rtl')

            # command
            rtl = {
                'id': VEHICLE_ID,
                'action': 'rtl',
                'args': {
                }
            }

            # send command
            talker.produce(rtl)
        elif choice == 3:
            print('goto distance')

            # command
            goto = {
                'id': VEHICLE_ID,
                'action': 'goto',
                'args': {
                    'lat': 36.71863220929288,
                    'lon': -4.497144557823964,
                    'alt': 20
                }
            }

            # send command
            talker.produce(goto)
        elif choice == 4:
            print('stop')

            # command
            stop = {
                'id': VEHICLE_ID,
                'action': 'stop',
                'args': {
                }
            }

            # send command
            talker.produce(stop)
        elif choice == 5:
            print('automatic mission')

            automatic_mission = {
                'id': VEHICLE_ID,
                'action': 'automaticmission',
                "args": {
                    'init_waypoint': 1,
                    'final_waypoint': 1,
                    'mission': [
                        {
                            'type': 'waypoint',
                            'lat': 36.71863220929288,
                            'lon': -4.497144557823964,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 36.71851732336216,
                            'lon': -4.497180969871092,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 36.71853685644429,
                            'lon': -4.497434208619835,
                            'alt': 20
                        },
                        {
                            'type': 'command',
                            'action': 'rtl'
                        }
                    ]
                }
            }

            # lineal
            lineal = {
                'id': VEHICLE_ID,
                'action': 'automaticmission',
                "args": {
                    'mission': [
                        {
                            'type': 'waypoint',
                            'lat': 45.509037845794836,
                            'lon': 11.28161508907343,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.50855417431411,
                            'lon': 11.282039115537707,
                            'alt': 20
                        },
                        {
                            'type': 'command',
                            'action': 'rtl'
                        }
                    ]
                }
            }

            # perimetral
            perimatral = {
                'id': VEHICLE_ID,
                'action': 'automaticmission',
                "args": {
                    'mission': [
                        {
                            'type': 'waypoint',
                            'lat': 45.50967325104807,
                            'lon': 11.280992582135053,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.50990401833847,
                            'lon': 11.28085725454007,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.509793376604996,
                            'lon': 11.280541490151776,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.50957841490099,
                            'lon': 11.280667795907094,
                            'alt': 20
                        },
                        {
                            'type': 'command',
                            'action': 'rtl'
                        }
                    ]
                }
            }

            # area
            area = {
                'id': VEHICLE_ID,
                'action': 'automaticmission',
                "args": {
                    'mission': [
                        {
                            'type': 'waypoint',
                            'lat': 45.509589416486484,
                            'lon': 11.28181904554367,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.509529267176454,
                            'lon': 11.28169298171997,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.50940520902156,
                            'lon': 11.281875371932983,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.50934505951469,
                            'lon': 11.28173053264618,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.50945596011796,
                            'lon': 11.281580328941345,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.50941084803453,
                            'lon': 11.281486451625824,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.50926611318939,
                            'lon': 11.281623244285583,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.509219121276494,
                            'lon': 11.281513273715971,
                            'alt': 20
                        },
                        {
                            'type': 'waypoint',
                            'lat': 45.509356337552134,
                            'lon': 11.281371116638184,
                            'alt': 20
                        },
                        {
                            'type': 'command',
                            'action': 'rtl'
                        }
                    ]
                }
            }

            # send command
            talker.produce(automatic_mission)
        elif choice == 6:
            print('land')

            # command
            stop = {
                'id': VEHICLE_ID,
                'action': 'land',
                'args': {
                }
            }

            # send command
            talker.produce(stop)
        else:
            print('invalid option')

    del talker
except FileNotFoundError:
    print('No certs files found. \
        Please, check files path at KEY_PATH and KEY_PATH')
except TLSCertificatesNotFound:
    print('TLS certificates not found')
except json.decoder.JSONDecodeError:
    print('JSON decode error')
except Exception as e:
    print(f'Exception: {e}')
