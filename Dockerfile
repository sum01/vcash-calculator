FROM alpine:latest
RUN apk update \
	&& apk add nodejs-npm \
	&& npm install -g eslint \
	&& rm -rf /etc/apk/cache/*
