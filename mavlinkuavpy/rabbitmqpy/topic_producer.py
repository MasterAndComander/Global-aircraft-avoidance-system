#!/usr/bin/python

'''
Module used to create a basic RabbitMQ topic exchange producer
'''

import logging
import pika
from retry import retry

from rabbitmqpy.utils import configuration
from rabbitmqpy.utils import connection
from rabbitmqpy.utils.custom_exceptions import TLSCertificatesNotFound

logging.basicConfig(level=logging.INFO)

configuration = configuration.Configuration()


class TopicProducer:
    '''
    Simple RabbitMQ topic producer
    '''
    def __init__(
        self,
        exchange=configuration.RABBITMQ_EXCHANGE,
        routing_key=configuration.RABBITMQ_ROUTINGKEY
    ) -> None:

        self.exchange = exchange
        self.routing_key = routing_key

        self.init_connection()

    def init_connection(self):
        '''
        Init full connection:
            - pika.connection object
            - create channel
        '''
        try:
            self.connection = connection.Connection().connect()
            # self.connection = single_connection

            if self.connection is not None:
                self.channel = self.connection.channel()
                self.channel.exchange_declare(
                    exchange=self.exchange,
                    exchange_type='topic',
                    auto_delete=True,
                    durable=False
                )
        except FileNotFoundError as exception:
            raise TLSCertificatesNotFound from exception

    @retry(exceptions=pika.exceptions.StreamLostError, delay=5, jitter=(1, 3))
    def publish(self, message):
        '''
        Publish message to RabbitMQ topic exchange
        '''
        if self.connection.is_closed or self.channel.is_closed:
            self.init_connection()

        self.channel.basic_publish(
            exchange=self.exchange,
            routing_key=self.routing_key,
            body=message
        )

    def __del__(self):
        try:
            print('Closing channel...')
            self.channel.close()
            print('Closing connection...')
            self.connection.close()
        except AttributeError:
            print('  Channel and connection cannot be removed due to \
                previous error')
