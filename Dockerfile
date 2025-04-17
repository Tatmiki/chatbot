FROM node:20-alpine
WORKDIR /app

# Só copia o package.json e package-lock.json inicialmente
COPY package*.json ./

# Instala dependências (cache será reutilizado se esses arquivos não mudarem)
RUN npm install

# Agora copia o restante do projeto
COPY . .

# Comando para rodar
CMD ["npm", "run", "dev"]