# Use the official Puppeteer image (which includes Chrome)
FROM ghcr.io/puppeteer/puppeteer:24.0.0

# Switch to root to install dependencies
USER root

WORKDIR /usr/src/app

COPY package*.json ./

# Install dependencies (ignoring scripts can sometimes help with puppeteer, but usually standard install is fine)
RUN npm install --omit=dev

COPY . .

# Create/Verify user permissions (Puppeteer image has 'pptruser')
RUN chown -R pptruser:pptruser /usr/src/app

# Run as non-root user
USER pptruser

EXPOSE 3000

CMD [ "node", "index.js" ]
