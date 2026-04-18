FROM node:25-alpine3.22

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN npm ci && cd server && npm ci && cd ..

# Build Vite app
RUN npm run build

# Copy dist to public
RUN cp -r dist/* public/

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server/server.js"]