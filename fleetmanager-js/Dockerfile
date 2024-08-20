FROM node:14

# Copy code
COPY . /gaas

WORKDIR /gaas/libraries/loggerlib
RUN npm install

WORKDIR /gaas/libraries/quadtree-js
RUN npm install

WORKDIR /gaas/libraries/rabbit-js
RUN npm install

WORKDIR /gaas/libraries/uuid-generator
RUN npm install

WORKDIR /gaas/fleetmanager-js
RUN npm install

CMD node main.js
