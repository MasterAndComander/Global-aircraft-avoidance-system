#!/usr/local/bin/python3.6

from threading import Thread
import time
import json
import socket
import math
from retry import retry

import dronekit_sitl
import dronekit
from dronekit import connect, VehicleMode
from dronekit import LocationGlobalRelative, LocationGlobal

from mavlinkuavpy import config as configuration
from mavlinkuavpy.utils.communications import Talker, Listener
from mavlinkuavpy.utils.gps import Gps

# Telemetry object to get vehicle telemetry
telemetry = {
    'id': configuration.DEVICE_ID,
    'mode': 'LANDED',
    'gps': {},
    'euler': {},
    'v': {},
    'auto': {}
}


class Vehicle:
    '''
    Vehicle relative actions and telemetry consumption from dronekit-python
    '''

    def __init__(self, connection_string) -> None:
        # Get mavlinkuavpy.utils.gps
        self.gps = Gps()

        # Start SITL at given position
        self.sitl = dronekit_sitl.start_default(
            configuration.LAT,
            configuration.LON
        )
        self.connection_string = connection_string
        # The dronekit vehicle instance once connected
        self.vehicle = None
        # Check if vehicle is doing an automatic mission
        self.doing_automatic_mission = False

        # Show where vehicle is connecting to
        print(f'Connecting to vehicle on: {self.connection_string}')

        try:
            # Connect vehicle using the desired connection (UDP, USB...)
            self.vehicle = connect(
                self.connection_string,
                wait_ready=True
            )
            self.home_location = None
        # Bad TCP connection
        except socket.error:
            print('No server exists!')
        # API Error
        except dronekit.APIException:
            print('Timeout!')

        @self.vehicle.on_attribute('*')
        def listener(self, attr_name, value) -> None:
            '''
            Dronekit MAVLink messages listener.

            Async callback to receive all available MAVLink messages and build
            the JSON telemetry. Only used attributes are getting into account
            but there are many others attributes :)
            '''
            if attr_name is 'location':
                # dronekit.Locations can be:
                #   global_frame
                #   global_relative_frame
                #   local_frame

                telemetry['gps']['latitude'] = value.global_relative_frame.lat
                telemetry['gps']['longitude'] = value.global_relative_frame.lon
                telemetry['gps']['altitude'] = value.global_relative_frame.alt

            elif attr_name is 'attitude':
                # attitude messages

                telemetry['euler']['pitch'] = value.pitch
                telemetry['euler']['roll'] = value.roll
                telemetry['euler']['yaw'] = value.yaw

            elif attr_name is 'battery':
                # battery message

                telemetry['battery'] = value.level

            elif attr_name is 'heading':
                # heading message

                telemetry['heading'] = value

            elif attr_name is 'velocity':
                # velocity message

                telemetry['v']['vx'] = value[0]
                telemetry['v']['vy'] = value[1]
                telemetry['v']['vz'] = value[2]
                telemetry['v']['speed'] = math.sqrt(
                    math.pow(value[0], 2) + \
                    math.pow(value[1], 2) + \
                    math.pow(value[2], 2)
                )

            elif attr_name is 'mode':
                # mode

                telemetry['mode'] = value.name

    def arm_and_takeoff(self, target_altitude):
        '''
        Arms vehicle and fly to target_altitude.
        '''

        print('Starts takeoff')

        # Get Vehicle Home location
        # will be `None` until first set by autopilot
        while not self.vehicle.home_location:
            cmds = self.vehicle.commands
            cmds.download()
            cmds.wait_ready()
            if not self.vehicle.home_location:
                print('  Waiting for home location ...')
                time.sleep(1)

        # We have a home location.
        print(f'  Home location: {self.vehicle.home_location}')
        self.home_location = LocationGlobal(
            self.vehicle.home_location.lat,
            self.vehicle.home_location.lon,
            self.vehicle.home_location.alt
        )

        print("  Basic pre-arm checks")
        # Don't try to arm until autopilot is ready
        while not self.vehicle.is_armable:
            print("  Waiting for vehicle to initialise...")
            time.sleep(1)

        print("  Arming motors")
        # Copter should arm in GUIDED mode
        self.vehicle.wait_for_mode('GUIDED')
        self.vehicle.armed = True

        # Confirm vehicle armed before attempting to take off
        while not self.vehicle.armed:
            print("  Waiting for arming...")
            time.sleep(1)

        # Take off to target altitude
        print("  Taking off!")
        self.vehicle.simple_takeoff(target_altitude)

        # Wait until the vehicle reaches a safe height before processing the
        # goto (otherwise the command after Vehicle.simple_takeoff will
        # execute immediately).
        while True:
            vehicle_altitude = self.vehicle.location.global_relative_frame.alt
            print(f'  Altitude: {vehicle_altitude}')
            # Break and return from function just below target altitude.
            if vehicle_altitude >= target_altitude * 0.95:
                print("  Reached target altitude")
                break
            time.sleep(1)

        # set throlette to 1500
        self.vehicle.wait_for_mode('LOITER')
        self.vehicle.channels.overrides['3'] = 1500

    def check_armed(self):
        '''
        Check when motors disarmed and set LANDED mode
        '''
        while self.vehicle.armed:
            time.sleep(1)
        telemetry['mode'] = 'LANDED'

    def do_rtl(self):
        '''
        Vehicle perform a Return To Launch
        '''
        self.do_stop()
        while self.vehicle.mode.name != 'RTL':
            self.vehicle.mode = VehicleMode('RTL')
            time.sleep(1)

        Thread(
            target=self.check_armed,
            daemon=True
        ).start()

    def do_land(self):
        '''
        Vehicle perform a Return To Launch
        '''
        self.do_stop()
        self.vehicle.wait_for_mode('LAND')

        Thread(
            target=self.check_armed,
            daemon=True
        ).start()

    def do_stop(self):
        '''
        Vehicle stops its movement and any other action
        changing to LOITER mode
        '''
        self.vehicle.wait_for_mode('LOITER')

    def do_goto(self, target_location):
        '''
        Vehicle travels to a given location in a straight manner
        '''
        # if landed, takeoff
        if self.check_takeoff_needed():
            self.arm_and_takeoff(
                target_location['altitude']
            )

        self.vehicle.wait_for_mode('GUIDED')

        target = LocationGlobalRelative(
            target_location['latitude'],
            target_location['longitude'],
            target_location['altitude']
        )
        self.vehicle.simple_goto(target)

        Thread(
            target=self.check_waypoint_reached,
            args=(target,),
            daemon=True
        ).start()

    def do_automatic_abort(self):
        '''
        Vehicle abort an automatic mission
        '''
        self.do_rtl()
        self.doing_automatic_mission = False
        telemetry['auto'] = {}

    def do_automatic_mission(self, mission):
        '''
        Vehicle executes an automatic mission
        '''
        print(f'Doing automatic mission: {mission}')
        print(f'  Vehicle mode: {self.vehicle.mode.name}')

        # check if previous mission running
        if self.doing_automatic_mission:
            self.do_stop()

            while self.doing_automatic_mission:
                time.sleep(1)

        # start new mission
        self.doing_automatic_mission = True
        telemetry['auto']['id'] = mission['args']['mission_id']

        # check if mission is not empty
        if mission:
            # if landed, takeoff
            if self.check_takeoff_needed():
                self.arm_and_takeoff(
                    mission['args']['mission'][0]['altitude']
                )

            Thread(
                target=self.automatic_mission_thread,
                args=(mission,),
                daemon=True
            ).start()

    def automatic_mission_thread(self, mission):
        '''
        Execute automatic mission within a thread to free main thread
        '''
        print(f'  Starting mission {mission}')

        mission_array = mission['args']['mission']

        # Mission item to start from
        # Always count from 0
        try:
            mission_item = mission['args']['init_waypoint']

            if mission_item < 0 or mission_item > len(mission_array):
                mission_item = 0
        except KeyError:
            mission_item = 0

        # Mission item to end mission
        # Have to be lower than len(mission) - 1
        # [0, len(mission)-1]
        try:
            final_waypoint = mission['args']['final_waypoint'] + 1

            if final_waypoint < 0 or final_waypoint > len(mission_array):
                final_waypoint = len(mission_array)
        except KeyError:
            final_waypoint = len(mission_array)

        while self.doing_automatic_mission and mission_item < final_waypoint:
            print(f'  Tavel to waypoint {mission_item}')
            telemetry['auto']['current_wp'] = mission_item

            self.vehicle.wait_for_mode('GUIDED')

            if mission_array[mission_item]['type'] == 'waypoint':
                print('  Perform waypoint')

                target_location = LocationGlobalRelative(
                    mission_array[mission_item]['latitude'],
                    mission_array[mission_item]['longitude'],
                    mission_array[mission_item]['altitude']
                )
                self.vehicle.simple_goto(target_location)

                if not self.check_waypoint_reached(
                    target_location
                    ):
                    print('  Target not reached')
                    self.doing_automatic_mission = False
                    self.do_stop()
            elif mission_array[mission_item]['type'] == 'command':
                print('  Perform command')

                if mission_array[mission_item]['action'] == 'rtl':
                    print('    RTL')
                    self.do_rtl()

            mission_item += 1

        # execute last command if final_waypoint < len(mission) - 1
        print(f'  Perform final action :) {self.doing_automatic_mission}')
        if mission_array[len(mission_array)-1]['type'] == 'command' and \
            self.doing_automatic_mission:
            print('  Perform command')

            if mission_array[len(mission_array)-1]['action'] == 'rtl':
                print('    RTL')
                self.do_rtl()

        self.doing_automatic_mission = False
        telemetry['auto'] = {}

    def check_waypoint_reached(self, target_location):
        '''
        Function to check distance from current position to target position.

        Vehicle arrive its target when distance is lower than 4 meters.
        Otherwise, if vehicle is not in GUIDED mode the movement is also done.
        '''
        approaching = True

        while approaching and self.vehicle.mode.name == 'GUIDED':
            distance_to_target = self.gps.get_distance_metres(
                source_location=LocationGlobalRelative(
                    self.vehicle.location.global_relative_frame.lat,
                    self.vehicle.location.global_relative_frame.lon,
                    self.vehicle.location.global_relative_frame.alt
                ),
                target_location=target_location
            )

            if distance_to_target < 2:
                approaching = False

            print(f'Distance to target: {distance_to_target}')

            time.sleep(1)

        # When approach is done, change to mode LOITER
        if approaching is False:
            print('Target reached')
            self.vehicle.wait_for_mode('LOITER')
            return True

        # When target is not reached but a mode change occurs
        print('Target not reached')
        approaching = False
        # self.vehicle.wait_for_mode('LOITER')
        return False

    def check_takeoff_needed(self) -> bool:
        '''
        Check if vehicle needs to takeoff. Used before performing other
        actions as do_goto or do_automatic_mission
        '''
        return self.vehicle.mode.name == 'STABILIZE' or \
            telemetry['mode'] == 'LANDED' or \
            telemetry['mode'] == 'LOITER' and \
            not self.vehicle.armed

    def shutdown(self) -> None:
        '''
        Shutdown vehicle and SITL
        '''
        self.vehicle.close()
        self.sitl.stop()


def message_callback(ch, method, properties, body):
    '''
    Callback function to get messages from the exchange given a routing key
    '''
    try:
        print(f'Message received: {json.loads(body)}')

        command = json.loads(body)

        if command['id'] == configuration.DEVICE_ID:
            if command['action'] == 'takeoff':
                vehicle.arm_and_takeoff(command['args']['altitude'])
            elif command['action'] == 'rtl':
                vehicle.do_rtl()
            elif command['action'] == 'goto':
                vehicle.do_goto(command['args'])
            elif command['action'] == 'stop':
                vehicle.do_stop()
            elif command['action'] == 'automatic-mission':
                vehicle.do_automatic_mission(command)
            elif command['action'] == 'automatic-abort':
                vehicle.do_automatic_abort()
            elif command['action'] == 'land':
                vehicle.do_land()
        else:
            print('not myself')
    except json.decoder.JSONDecodeError:
        print(f'Received something that is not a JSON: {str(body)}')

@retry()
def publish_telemetry(period):
    '''
    Periodically publish telemetry
    '''
    telemetry_publisher = Talker(
        configuration.DEVICE_ID,
        'telemetry'
    )

    while True:
        telemetry_publisher.produce(
            message=telemetry
        )
        time.sleep(period)


if __name__ == '__main__':
    telemetry['id'] = configuration.DEVICE_ID

    subscriber = Listener(
        custom_callback=message_callback,
        exchange=configuration.DEVICE_ID,
        routing_key='command'
    )

    # Get a vehicle
    vehicle = Vehicle(
        connection_string='tcp:127.0.0.1:5760'
    )

    try:
        # Publish device telemetry
        Thread(
            target=publish_telemetry,
            args=(1,),
            daemon=True
        ).start()

        # Consumer messages
        subscriber.consume()

        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        # Close vehicle object before exiting script
        vehicle.shutdown()
