FROM ubuntu:16.04

# Install server dependencies
RUN apt-get install --fix-missing
RUN apt-get update --yes && apt-get upgrade --yes
RUN apt-get install git nodejs npm \
libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev libpng-dev build-essential g++ \
ffmpeg \
redis-server --yes

RUN ln -s `which nodejs` /usr/bin/node

# Non-privileged user
RUN useradd -m audiogram #reset

# early copy of client side javascript required for postinstall script
ADD ./client/* /home/audiogram/src/client/
ADD ./lib/logger/* /home/audiogram/src/client/

# Install application dependencies (see http://www.clock.co.uk/blog/a-guide-on-how-to-cache-npm-install-with-docker)
ADD ./package.json /home/audiogram/src/package.json
RUN chown -R audiogram:audiogram /home/audiogram

USER audiogram
WORKDIR /home/audiogram/src
RUN npm install

# Copy rest of source
USER root
COPY . /home/audiogram/src
RUN chown -R audiogram:audiogram /home/audiogram

ENV NODE_ENV production
CMD [ "sh", "bin/start.sh" ]
