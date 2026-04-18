FROM node:25-alpine3.22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG SOCKET_URL=https://blabla.com:443
ENV SOCKET_URL=$SOCKET_URL
ENV VITE_SOCKET_URL=$SOCKET_URL

EXPOSE 5173

CMD ["npm", "run", "dev"]
