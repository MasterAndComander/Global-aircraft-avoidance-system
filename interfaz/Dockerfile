FROM node:20.15.1-slim

# Copy code
COPY . /gaas

WORKDIR /gaas/libraries/loggerlib
RUN npm install

WORKDIR /gaas/libraries/rabbit-js
RUN npm install

WORKDIR /gaas/interfaz

RUN npm install
RUN npm run gulp

CMD node bin/www
