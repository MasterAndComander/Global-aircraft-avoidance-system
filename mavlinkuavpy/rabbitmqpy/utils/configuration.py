#!/usr/bin/python

'''
Configuration module in order to store configuration parameters.

Its uses BaseSettings. Thus, configuration parameters wich are not at
environment are set to this dile defaults.
'''

from pydantic import BaseSettings


class Configuration(BaseSettings):
    '''
    Configure program within environment or default values
    '''

    RABBITMQ_URL = 'localhost'
    RABBITMQ_PORT = 5672
    RABBITMQ_USER = 'guest'
    RABBITMQ_PASSWORD = 'guest'
    RABBITMQ_VHOST = 'tfm'
    RABBITMQ_QUEUE = 'tfm'
    RABBITMQ_EXCHANGE = 'tfm'
    RABBITMQ_ROUTINGKEY = 'tfm'
