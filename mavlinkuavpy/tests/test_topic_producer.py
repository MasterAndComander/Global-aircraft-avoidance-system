#!/usr/bin/python

import time
import json

from rabbitmqpy import topic_producer


class Talker:
    def __init__(self) -> None:
        try:
            self.producer = topic_producer.TopicProducer('log', 'test')
        except AttributeError:
            print('AttributeError. Wrong topic_producer cration')

    def produce(self, period) -> None:
        while True:
            self.producer.publish(f'Hello rabbitmq!')

            time.sleep(period)


talker = Talker()

try:
    talker.produce(2)
except KeyboardInterrupt:
    del talker
