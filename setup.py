import os
from setuptools import setup

install_requires = []
if os.path.isfile('requirements.txt'):
    with open('requirements.txt', encoding='utf-8') as f:
        install_requires = f.read().splitlines()

setup(
    name='mavlinkuavpy',
    version='0.0',
    packages=['mavlinkuavpy', 'mavlinkuavpy.utils', 'mavlinkuavpy.rabbitmqpy', 'mavlinkuavpy.rabbitmqpy.utils'],
    package_dir={'': '.'},
    install_requires=install_requires
)
