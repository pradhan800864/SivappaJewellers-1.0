FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG REACT_APP_API_BASE
ARG REACT_APP_UPLOADS_BASE
ENV REACT_APP_API_BASE=$REACT_APP_API_BASE
ENV REACT_APP_UPLOADS_BASE=$REACT_APP_UPLOADS_BASE

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80