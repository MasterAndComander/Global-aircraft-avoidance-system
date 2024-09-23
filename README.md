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

## Prerequisites
To use this application it is recommended to have [Ubuntu 20.04](https://releases.ubuntu.com/focal/) or [Ubuntu 22.04](https://releases.ubuntu.com/jammy/) installed.
Then you have to install [Docker](https://www.docker.com/) and Docker Compose following these steps:

```bash
# Installing Docker

# First, update your existing list of packages
sudo apt update
# Next, install a few prerequisite packages which let apt use packages over HTTPS
sudo apt install apt-transport-https ca-certificates curl software-properties-common
# Then add the GPG key for the official Docker repository to your system
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
# Add the Docker repository to APT sources
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
# Update your existing list of packages again for the addition to be recognized
sudo apt update
# Make sure you are about to install from the Docker repo instead of the default Ubuntu repo
apt-cache policy docker-ce
# Finally, install Docker
sudo apt install docker-ce
# Check that it’s running
sudo systemctl status docker
# The output should be  showing that the service is active and running

# If you want to avoid typing sudo whenever you run the docker command, add your username to the docker group
sudo usermod -aG docker ${USER}
# To apply the new group membership, log out of the server and back in, or type the following
su - ${USER}

# Installing Docker Compose

# Use the following command to download
mkdir -p ~/.docker/cli-plugins/
curl -SL https://github.com/docker/compose/releases/download/v2.29.6/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
# Next, set the correct permissions so that the docker compose command is executable
chmod +x ~/.docker/cli-plugins/docker-compose
# To verify that the installation was successful, you can run
docker compose version
```

## Deploy

```bash
# clone project
git clone https://github.com/MasterAndComander/Global-aircraft-avoidance-system.git
cd Global-aircraft-avoidance-system

# edit .env and docker-compose.yml to fit your needs
cat .env
cat docker-compose.yml

```

## Execution

```bash
# Launch compose
docker compose up -d --build

# Log control
docker compose logs -f
```

## Ending

```bash
# Down compose
docker compose down
```

## Create missions
Missions are based on [GeoJSON format](https://geojson.org/) 
To add missions, it is recommended to use the website [geojson.io](https://geojson.io/)
The accepted missions are those that form a line or a polygon. And the GeoJSON obtained must be included in the .env file as a MISSION_LIST variable, which must be an array in string format. Currently there is an example that can be used as a reference.
The 'properties' field of GeoJSON can include variables to make the creation of missions more useful. The variables are:

* name: The name we want to give to the mission.

* altitude: The altitude value that all the waypoints of the mission will have. (It must be greater than 10). If it is not included, the value will be 20.

## Testing

To test, open a browser and enter localhost:3000 to access the web interface.
From there you can connect to the devices and send actions.

