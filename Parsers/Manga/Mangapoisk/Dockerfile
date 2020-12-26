FROM node:current-alpine3.10
# Установить зависимости приложения
# Используется символ подстановки для копирования как package.json, так и package-lock.json,
# работает с npm@5+
COPY package.json ./

RUN npm i --only=production
# Используется при сборке кода в продакшене
# RUN npm install --only=production

# Скопировать исходники приложения
COPY ./ ./
CMD [ "node", "main.js" ]