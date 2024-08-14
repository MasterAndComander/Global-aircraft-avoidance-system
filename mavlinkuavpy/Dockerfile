FROM python:3.6-slim

RUN apt update && \
    apt install python3-pip -y

COPY . /mavlinkuav-py

WORKDIR /mavlinkuav-py/

RUN pip3 install --upgrade .

ENTRYPOINT ["python", "mavlinkuavpy/mavlink_uav.py"]
