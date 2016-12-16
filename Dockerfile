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
RUN useradd -m audiogram
WORKDIR /home/audiogram

# Clone repo
COPY . /home/audiogram
RUN chown -R audiogram:audiogram /home/audiogram

# Install application dependencies
USER audiogram
WORKDIR /home/audiogram/audiogram
RUN npm install

#EXPOSE 8081
CMD [ "npm", "start" ]
