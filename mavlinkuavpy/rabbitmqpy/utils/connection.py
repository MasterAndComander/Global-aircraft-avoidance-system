#!/usr/bin/python

'''
Basic pika connection creation
'''

from socket import gaierror
import logging
import pika

from retry import retry
from rabbitmqpy.utils import configuration

logging.basicConfig(level=logging.INFO)

configuration = configuration.Configuration()


class Connection:
    '''
    Default RabbitMQ Connection
    '''
    def __init__(self) -> None:
        self.credentials = pika.PlainCredentials(
            configuration.RABBITMQ_USER,
            configuration.RABBITMQ_PASSWORD
        )
        self.connection_params = pika.ConnectionParameters(
            host=configuration.RABBITMQ_URL,
            port=configuration.RABBITMQ_PORT,
            virtual_host=configuration.RABBITMQ_VHOST,
            credentials=self.credentials,
            socket_timeout=None
        )

    @retry(
        exceptions=(
            pika.exceptions.AMQPConnectionError,
            gaierror
        ),
        delay=5,
        jitter=(1, 3)
    )
    def connect(self):
        '''
        Create RabbitMQ connection using pika
        '''
        try:
            return pika.BlockingConnection(self.connection_params)
        except pika.exceptions.ProbableAuthenticationError:
            return None
