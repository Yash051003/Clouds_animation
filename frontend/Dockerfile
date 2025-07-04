# Dockerfile
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies first (cache efficient)
COPY package*.json ./

RUN npm install

# Copy the rest of the code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start the Vite dev server
CMD ["npm", "run", "dev"]
