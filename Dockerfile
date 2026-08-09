FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++ 
RUN npm install -g bun

COPY package.json bun.lock* ./
RUN bun install

COPY . .
RUN bun run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN apk add --no-cache ffmpeg python3
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001
ENV PORT 3001
ENV HOSTNAME 0.0.0.0

CMD ["node", "server.js"]
