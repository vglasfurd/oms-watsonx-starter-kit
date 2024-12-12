FROM node:18.20-alpine3.20

USER 1000 
WORKDIR /usr/src/app

ADD --chown=1000:1000 --chmod=755 docker-build/ /usr/src/app
RUN yarn install

EXPOSE 8200
EXPOSE 5858

ENV DIST_DIRECTORY=/usr/src/app/dist
ENV APPLICATION_CONFIG_YAML_PATH=/usr/src/app/dist/config/app-configuration.yaml

ENTRYPOINT ["yarn"]
CMD ["start:prod"]
