#!/usr/local/bin/python3.6

'''
Communications utils using rabbitmq-py library:

  - Talker
        Thread implementation to periodically publish vehicle telemetry.
  - Listener
        Callback based vehicle command listener
'''

from datetime import datetime
from threading import Thread
import time
import sys
import json
import pytz

from rabbitmqpy import topic_producer
from rabbitmqpy import topic_consumer
from rabbitmqpy.utils.custom_exceptions import TLSCertificatesNotFound


# class Talker(Thread):
class Talker:
    '''
    rabbitmqpy/topic_prodicer based rabbitmq publisher to publish telemetry.
    Implements threading.Thread class.
    '''

    def __init__(self, exchange, routing_key) -> None:
        # super(Talker, self).__init__()

        try:
            self.producer = topic_producer.TopicProducer(
                exchange=exchange,
                routing_key=routing_key
            )
        except AttributeError:
            print('AttributeError. Wrong topic_producer cration')
        except TLSCertificatesNotFound:
            print('TLS certificates not found')
            sys.exit(0)

    # def run(self) -> None:
    #     while True:
    #         telemetry['timestamp'] = datetime.now(pytz.timezone('UTC')) \
    #             .isoformat(timespec='milliseconds')[:-6]+'Z'

    #         self.producer.publish(
    #             message=json.dumps(json.dumps(telemetry))
    #         )
    #         time.sleep(1)

    def produce(self, message) -> None:
        '''
        Simple message publish
        '''
        self.producer.publish(
            message=json.dumps(message)
        )


class Listener:
    '''
    rabbitmqpy/topic_consumer based rabbitmq publisher to subscribe
    incoming messages.
    '''

    def __init__(self, custom_callback, exchange, routing_key) -> None:
        try:
            self.consumer = topic_consumer.TopicConsumer(
                custom_callback=custom_callback,
                exchange=exchange,
                routing_key=routing_key
            )

        except AttributeError as exception:
            print(f'AttributeError. Wrong topic_producer creation: \
                {exception}')

    def consume(self):
        '''
        Simple message consume
        '''
        self.consumer.consume()
