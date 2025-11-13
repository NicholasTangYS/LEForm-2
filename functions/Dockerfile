# Use a Node.js base image
FROM node:20-slim

# Install necessary system packages: Chromium and Xvfb (Virtual Display)
# Xvfb is required for running the browser in non-headless mode
# Fix for missing dependencies and ensure Xvfb/Chromium are installed
RUN apt-get update \
    && apt-get install -yq --no-install-recommends \
    # Required dependencies for Chromium to run on a Linux environment
    libnss3 \
    libgconf-2-4 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    # Install Xvfb and Chromium itself
    xvfb \
    chromium \
    # Clean up APT cache
    && rm -rf /var/lib/apt/lists/*

# Set the working directory

USER root

# Explicitly ensure the standard binary paths are in the execution PATH
ENV PATH="/usr/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:$PATH"

WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Expose the port your server listens on (Cloud Run requires this)
# Assuming your Express app listens on port 8080 (or process.env.PORT)
EXPOSE 8080

# The command to run your app, wrapped with Xvfb
# Xvfb starts the virtual display server (on display :99)
# and then runs your Node.js application.
USER root
# CMD ["xvfb-run", "--server-args=-screen 0 1920x1080x24", "node", "index.js"]
# Use this TEMPORARY command
CMD ["sh", "-c", "which xvfb-run && which chromium-browser && sleep 300"]