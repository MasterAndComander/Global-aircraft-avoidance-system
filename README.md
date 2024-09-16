# Global-aircraft-avoidance-system

Drone fleet management to avoid collisions during combined actions between two or more aerial vehicles.

### UAV
[MAVLink](https://mavlink.io/en/) based UAV vehicles control using
[DRONEKIT](https://dronekit-python.readthedocs.io/en/latest/) and the
[latest API](https://dronekit-python.readthedocs.io/en/latest/automodule.html#).

### Core control
[NodeJs](https://nodejs.org/) is used for drone fleet control

### Communications
[RabbitMQ](https://www.rabbitmq.com/) is used for communications between modules
Web insterface is deployed at [localhost:15672](localhost:15672)

### Local interface
In order to visualize and obtain results, a web interface has been implemented with [expressJS](https://expressjs.com/)

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

## Create missions
Missions are based on [GeoJSON format](https://geojson.org/) 
To add missions, it is recommended to use the website [geojson.io](https://geojson.io/)
The accepted missions are those that form a line or a polygon. And the GeoJSON obtained must be included in the .env file as a MISSION_LIST variable, which must be an array in string format. Currently there is an example that can be used as a reference.
The 'properties' field of GeoJSON can include variables to make the creation of missions more useful. The variables are:

* name: The name we want to give to the mission.

* altitude: The altitude value that all the waypoints of the mission will have. (It must be greater than 10). If it is not included, the value will be 20.

## testing

To test, open a browser and enter localhost:3000 to access the web interface.
From there you can connect to the devices and send actions.

