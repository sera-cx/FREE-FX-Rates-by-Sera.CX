FROM node:22-alpine AS dashboard-build

WORKDIR /build/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./

ARG VITE_KEYS_ENDPOINT=https://rates.sera.cx/api-keys
ARG VITE_RATES_BASE=https://rates.sera.cx
ENV VITE_KEYS_ENDPOINT=$VITE_KEYS_ENDPOINT
ENV VITE_RATES_BASE=$VITE_RATES_BASE
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx . /usr/share/nginx/html
COPY --from=dashboard-build --chown=nginx:nginx /build/dashboard/ /usr/share/nginx/html/dashboard/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
