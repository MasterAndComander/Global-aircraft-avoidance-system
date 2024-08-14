#!/usr/bin/python

import json
from mavlinkuavpy.rabbitmqpy import topic_consumer

VEHICLE_ID = 'titan'


class Listener:
    def __init__(self) -> None:
        try:
            self.consumer = topic_consumer.TopicConsumer(
                custom_callback=self.callback,
                exchange=VEHICLE_ID,
                routing_key='telemetry'
            )

        except AttributeError as exception:
            print(f'AttributeError. \
                Wrong topic_producer creation: {exception}')

    def consume(self):
        self.consumer.consume()

    @staticmethod
    def callback(ch, method, properties, body):
        '''
        Callback function to get messages from the exchange given a routing key
        '''
        try:
            print(f'Received from rabbitmq to custom callback: \
                {json.loads(body)}')
        except json.decoder.JSONDecodeError:
            print(f'Received from rabbitmq to custom callback: \
                {str(body)}')


try:
    listener = Listener()

    try:
        listener.consume()
    except KeyboardInterrupt:
        del listener
except TLSCertificatesNotFound:
    print('TLS certificates not found')
