require('dotenv').config();
const { StringSession } = require('telegram/sessions');
const { TelegramClient } = require('telegram');
const input = require('input'); // npm install input
const fs = require('fs-extra');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const phoneNumber = process.env.TELEGRAM_PHONE;
const outputDir = process.env.OUTPUT_DIR || './output';

fs.ensureDirSync(outputDir);

const stringSession = new StringSession(process.env.TELEGRAM_SESSION || '');

async function main() {
  console.log('== Telegram Group Downloader (gramjs) ==');
  if (!apiId || !apiHash || !phoneNumber) {
    console.error('❌ Укажите TELEGRAM_API_ID, TELEGRAM_API_HASH и TELEGRAM_PHONE в .env');
    process.exit(1);
  }

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => phoneNumber,
    password: async () => await input.text('Введите 2FA пароль (если есть): '),
    phoneCode: async () => await input.text('Введите код из Telegram: '),
    onError: (err) => console.log(err),
  });

  console.log('✅ Авторизация успешна!');
  const sessionString = client.session.save();
  console.log('Сессия сохранена в переменной TELEGRAM_SESSION. Добавьте её в .env для повторного входа без кода.');
  console.log('Session string:', sessionString);

  // Сохраняем строку сессии в .env автоматически
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    // Удаляем старую строку, если есть
    envContent = envContent.replace(/^TELEGRAM_SESSION=.*$/m, '');
    envContent = envContent.trim() + '\n';
  }
  envContent += `TELEGRAM_SESSION=${sessionString}\n`;
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ Строка сессии сохранена в .env (TELEGRAM_SESSION)');

  // Получаем список чатов
  const dialogs = await client.getDialogs({ limit: 100 });
  console.log('Ваши чаты:');
  dialogs.forEach((d, i) => {
    const title = d.title || d.name || d.username || d.id;
    console.log(`${i + 1}. ${title} (id: ${d.id})`);
  });

  // Запрашиваем у пользователя id чата
  const chatId = await input.text('Введите ID группы/чата для скачивания сообщений: ');

  // Получаем объект чата
  const chat = await client.getEntity(chatId);
  const chatTitle = (chat.title || chat.username || chat.id.toString()).replace(/[^a-zA-Z0-9_а-яА-Я-]/g, '_');
  const csvFileName = `messages_${chatId}_${chatTitle}.csv`;
  const csvPath = path.join(outputDir, csvFileName);

  // Скачиваем сообщения
  const messages = [];
  console.log('⏬ Скачиваем сообщения...');
  let total = 0;
  for await (const message of client.iterMessages(chatId, { limit: 10000 })) {
    if (message.message) {
      messages.push({
        id: message.id,
        date: (message.date instanceof Date ? message.date : new Date(message.date)).toISOString(),
        user_id: message.senderId?.value || '',
        text: message.message,
      });
      total++;
      if (total % 100 === 0) console.log(`... скачано ${total}`);
    }
  }
  console.log(`✅ Всего скачано сообщений: ${messages.length}`);

  // Сохраняем в CSV
  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      { id: 'id', title: 'ID' },
      { id: 'date', title: 'Дата' },
      { id: 'user_id', title: 'ID пользователя' },
      { id: 'text', title: 'Текст сообщения' },
    ]
  });
  await csvWriter.writeRecords(messages);
  console.log(`💾 Сообщения сохранены в ${csvPath}`);
  console.log(`\nЧтобы проанализировать этот чат, выполните:`);
  console.log(`node summarize_gramjs_csv.js`);

  process.exit(0);
}

main();