# Global-aircraft-avoidance-system

Drone fleet management to avoid collisions during combined actions between two or more aerial vehicles.

### UAV
[MAVLink](https://mavlink.io/en/) based UAV vehicles control using
[DRONEKIT](https://dronekit-python.readthedocs.io/en/latest/) and the
[latest API](https://dronekit-python.readthedocs.io/en/latest/automodule.html#).

### Core control
[NodeJs] (https://nodejs.org/) is used for drone fleet control

### Communications
[RabbitMQ] (https://www.rabbitmq.com/) is used for communications between modules
Web insterface is deployed at [localhost:15672](localhost:15672)

### Local interface
In order to visualize and obtain results, a web interface has been implemented with [expressjs] (https://expressjs.com/)

## deploy

```bash
# clone project
git clone <change-me>
cd Global-aircraft-avoidance-system

# edit .env and docker-compose.yml to fit your needs
cat .env
cat docker-compose.yml

# launch compose
docker compose up -d --build

# Log control
docker compose logs -f
```

## testing

To test, open a browser and enter localhost:3000 to access the web interface.
From there you can connect to the devices and send actions.

