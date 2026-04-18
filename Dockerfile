FROM node:25-alpine3.22

WORKDIR /app

# Copy everything
COPY frontend/ ./frontend/
COPY server/ ./server/
COPY scripts/ ./scripts/

RUN ["sh", "scripts/install-deps.sh"]

EXPOSE 3001
ENV NODE_ENV=production
CMD ["sh", "scripts/start.sh"]