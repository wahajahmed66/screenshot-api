# Use the official Puppeteer image which includes Chrome installed
FROM ghcr.io/puppeteer/puppeteer:21.5.2

# Switch to root to install dependencies if needed (usually not for this base)
USER root

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
# --omit=dev keeps it smaller
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Create a user to run the browser (security best practice)
# The base image already has a 'pptruser', but we ensure permissions
RUN chown -R pptruser:pptruser /usr/src/app

# Run as non-root user
USER pptruser

# Expose the port
EXPOSE 3000

# Start the app

CMD [ "node", "index.js" ]
