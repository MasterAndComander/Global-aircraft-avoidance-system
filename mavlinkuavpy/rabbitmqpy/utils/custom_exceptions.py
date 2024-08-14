#!/usr/bin/python

'''
Create custom rabbitmq-py exceptions.
'''


class TLSCertificatesNotFound(Exception):
    '''
    Exception when TLS cert and key file are missing
    '''
    pass
