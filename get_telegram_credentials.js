const input = require('input');

async function getCredentials() {
  console.log('🔑 Получение данных для Telegram API');
  console.log('');
  console.log('1. Перейдите на https://my.telegram.org');
  console.log('2. Войдите в свой аккаунт');
  console.log('3. Нажмите "API development tools"');
  console.log('4. Создайте новое приложение');
  console.log('5. Введите полученные данные ниже:');
  console.log('');

  try {
    const apiId = await input.text('Введите API ID (число): ');
    const apiHash = await input.text('Введите API Hash (строка): ');
    const phone = await input.text('Введите номер телефона (+79991234567): ');

    console.log('');
    console.log('✅ Данные получены!');
    console.log('');
    console.log('Добавьте эти строки в файл .env:');
    console.log('');
    console.log(`TELEGRAM_API_ID=${apiId}`);
    console.log(`TELEGRAM_API_HASH=${apiHash}`);
    console.log(`TELEGRAM_PHONE=${phone}`);
    console.log('');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

getCredentials();
