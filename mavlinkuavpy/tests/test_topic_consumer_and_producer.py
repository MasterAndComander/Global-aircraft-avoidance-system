#!/usr/bin/python

import time
from threading import Thread

from rabbitmqpy import topic_producer
from rabbitmqpy import topic_consumer


class Listener(Thread):
    def __init__(self) -> None:
        super(Listener, self).__init__()

        try:
            self.consumer = topic_consumer.TopicConsumer(
                custom_callback=self.callback
            )

        except AttributeError as exception:
            print(f'AttributeError. \
                Wrong topic_producer creation: {exception}')

    def run(self):
        self.consumer.consume()

    @staticmethod
    def callback(ch, method, properties, body):
        '''
        Callback function to get messages from the exchange given a routing key
        '''
        print('Received from rabbitmq to custom callback: ' + str(body))


class Talker(Thread):
    def __init__(self) -> None:
        super(Talker, self).__init__()

        try:
            self.producer = topic_producer.TopicProducer('log', 'test')
        except AttributeError:
            print('AttributeError. Wrong topic_producer cration')

    def run(self) -> None:
        while True:
            self.producer.publish('Hello rabbitmq!')

            time.sleep(2)


print('**** Talker...')
# talker = Talker()
print('**** Listener...')
listener = Listener()

try:
    # print('**** Talker thread...')
    # talker_thread = Thread()
    print('**** Listener thread...')
    listener_thread = Thread()

    # talker_thread.start()
    listener_thread.start()

    # talker_thread.join()
    listener_thread.join()
except KeyboardInterrupt:
    # del talker
    del listener
