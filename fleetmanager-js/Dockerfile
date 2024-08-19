FROM node:14

# Copy code
COPY ../libraries/ /libraries
COPY . /fleet_manager-js

WORKDIR /fleet_manager-js/
RUN npm install

CMD node main.js
