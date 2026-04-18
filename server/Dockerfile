FROM node:25-alpine3.22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "start"]
