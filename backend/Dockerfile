# 扇区能力评估系统 - 后端 CloudRun 部署
FROM node:20-alpine

WORKDIR /app

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm install --production

# 复制源码
COPY src/ ./src/
COPY index.js ./

EXPOSE 5000

# 环境变量
ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "index.js"]
