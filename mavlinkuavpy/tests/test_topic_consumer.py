#!/usr/bin/python

import json
from rabbitmqpy import topic_consumer


class Listener:
    def __init__(self) -> None:
        try:
            self.consumer = topic_consumer.TopicConsumer(
                custom_callback=self.callback,
                exchange='log',
                routing_key='test'
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
        print(f'Received from rabbitmq to custom callback: {str(body)}')


listener = Listener()

try:
    listener.consume()
except KeyboardInterrupt:
    del listener
