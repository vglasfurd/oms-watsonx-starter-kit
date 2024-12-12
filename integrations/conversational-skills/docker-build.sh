#!/bin/bash

set -e
set -o allexport

source .env

echo "cleaning build folder"
rm -rf docker-build

# Run yarn install and build the application
yarn install
yarn build

mkdir -p docker-build

echo "Copying build assets to docker-build folder"
mv dist docker-build
cp package.json yarn.lock nodemon-debug.json docker-build

if [ -z "$IMAGE_TAG" ]; then 
  IMAGE_TAG="$(date '+v%Y%md_%H%M%S')"
fi

echo "Using tag: $IMAGE_TAG, Docker image: cc-conversational-skills:$IMAGE_TAG"
docker build -t "cc-conversational-skills:$IMAGE_TAG" .

rm -rf docker-build