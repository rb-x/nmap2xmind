FROM node:12.16.1-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "nmap2xmind.js" ]