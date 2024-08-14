# Global-aircraft-avoidance-system

[MAVLink](https://mavlink.io/en/) based UAV vehicles control using
[DRONEKIT](https://dronekit-python.readthedocs.io/en/latest/) and the
[latest API](https://dronekit-python.readthedocs.io/en/latest/automodule.html#).

## deploy

```bash
# clone project
git clone <change-me>
cd mavlinkuav-py

# edit .env to fit your needs
cp .env.sample .env

# launch compose
docker compose up -d --build
```

## rabbitmq

Web insterface is deployed at [localhost:15672](localhost:15672)

## testing

In order to test please open mavlinkuav-py [VSCode](https://code.visualstudio.com/) using [devcontainers](https://code.visualstudio.com/docs/remote/containers)
and execute:

```bash
# check all tests
python mavlinkuavpy/tests/test_telemetry_reader.py
```
