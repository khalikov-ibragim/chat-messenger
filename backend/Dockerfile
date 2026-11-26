FROM docker.io/library/node:20-alpine

#СОздаем рабочую папку
WORKDIR /app

#Перенос всего когда в рабочую папку
COPY . . 

#Устанавдиваем зависимость
RUN npm install

#устанавливаем пользователя и переключаемся на него
RUN useradd --create-home --uid 10001 appuser
USER appuser

#запуск зависимости
CMD ["node", "server.js"]

