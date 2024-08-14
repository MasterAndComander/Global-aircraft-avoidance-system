#!/usr/bin/python

'''
Module used to create a basic RabbitMQ topic exchange consumer
'''

import logging
from retry import retry
import pika

from rabbitmqpy.utils import configuration
from rabbitmqpy.utils import connection
from rabbitmqpy.utils.custom_exceptions import TLSCertificatesNotFound

logging.basicConfig(level=logging.INFO)

configuration = configuration.Configuration()


class TopicConsumer:
    '''
    RabbitMQ topic exchange consumer class
    '''
    def __init__(
        self,
        custom_callback=None,
        exchange=configuration.RABBITMQ_EXCHANGE,
        routing_key=configuration.RABBITMQ_ROUTINGKEY
    ) -> None:

        self.exchange = exchange
        self.routing_key = routing_key
        self.channel = None
        self.queue_name = None
        self.connection = None

        # Set consumer callback
        self.consumer_callback = self.callback
        if custom_callback is not None:
            self.consumer_callback = custom_callback

        # Init connection
        try:
            self.init_connection()
        except FileNotFoundError as exception:
            raise TLSCertificatesNotFound from exception

    def init_connection(self):
        '''
        Init full connection:
            - pika.connection object
            - create channel
            - declare exchange
            - bind queue
            - set consumer callback function
        '''
        self.connection = connection.Connection().connect()
        # self.connection = single_connection

        self.channel = self.connection.channel()

        result = self.channel.queue_declare(
            queue='',
            auto_delete=True,
            durable=False
        )
        self.queue_name = result.method.queue

        self.channel.exchange_declare(
            exchange=self.exchange,
            exchange_type='topic',
            auto_delete=True,
            durable=False
        )

        self.channel.queue_bind(
            exchange=self.exchange,
            queue=self.queue_name,
            routing_key=self.routing_key
        )

        self.channel.basic_consume(
            queue=result.method.queue,
            on_message_callback=self.consumer_callback,
            auto_ack=True
        )

    @staticmethod
    def callback(ch, method, properties, body):
        '''
        Callback function to get messages from the exchange given a routing key
        '''
        print('Received from rabbitmq: ' + str(body))

    @retry(
        exceptions=(
            pika.exceptions.AMQPConnectionError,
            pika.exceptions.ChannelWrongStateError
        ),
        delay=5,
        jitter=(1, 3)
    )
    def consume(self):
        '''
        Start consuming messages
        '''
        if self.connection.is_closed:
            self.init_connection()

        self.channel.start_consuming()

    def __del__(self):
        try:
            print('Closing channel...')
            self.channel.close()
            print('Closing connection...')
            self.connection.close()
        except AttributeError:
            print('  Channel and connection cannot be removed due to \
                previous error')
