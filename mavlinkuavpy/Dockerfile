FROM python:3.6-slim

RUN apt update && \
    apt install python3-pip -y

COPY . /gaas

WORKDIR /gaas/

RUN pip3 install --upgrade .

ENTRYPOINT ["python", "mavlinkuavpy/mavlink_uav.py"]
