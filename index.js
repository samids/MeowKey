import axios from "axios";
import prompt from "prompt-sync";
import { randint, colors } from "./utils.js";
const input = prompt({ sigint: true });
let ver = '5.178', headers = {
  "User-Agent": "VKAndroidApp/7.7-11871 (Android 13; SDK 30; arm64-v8a; web.vk.me; ru; 3040x1440)"
};
const ERRORS = {
  "invalid_client": `${colors.fg.blue}Неверный логин или пароль ${colors.reset}`,
  "invalid_request": `${colors.fg.blue} Неверный запрос, попробуйте позже${colors.reset}`,
  "need_captcha": `${colors.fg.blue} Нужно решить капчу${colors.reset}`
};
console.logger = function() {
  let args = [];
  args.push(`  ${colors.bg.black}>> Meow <<${colors.reset}`);
  for (var i in arguments) {
    args.push(arguments[i]);
  }
  console.log.apply(console, args);
};


async function auth(login, password, two_fa = false, code = null, captcha_sid = null, captcha_key = null) {
  console.logger(`Запрос для получения токена${code ? " с СМС кодом" : ""}...`);
  return axios.get("https://oauth.vk.com/token", {
    params: {
      "grant_type": "password",
      "client_id": "6146827",
      "client_secret": "qVxWRF1CwHERuIrKBnqe",
      "username": login,
      "password": password,
      "v": ver,
      "2fa_supported": "1",
      "force_sms": two_fa ? 1 : 0,
      "code": two_fa ? code : null,
      "captcha_sid": captcha_sid,
      "captcha_key": captcha_key
    },
    headers
  }).then((res) => res.data)
    .catch((error) => error.response.data);
}

async function process_auth(login, password, captcha_sid = null, captcha_key = null) {
  console.logger("Отлично, запускаю процесс авторизации!");
  let response = await auth(login, password, captcha_sid, captcha_key);
  if ("validation_sid" in response) {
    if (input("Вы хотите отправить код на телефон? Если у вас есть включенный аутентификатор(2fa) на аккаунте то смс-код отправлять не обязательно, нужно только вписать код из приложения\n Для того чтобы отправить смс-код нужно нажать любое число/букву, либо оставить поле пустым и нажать Enter/Return, если не надо: "))
      await axios.get("https://api.vk.me/method/auth.validatePhone", {
        params: {
          "sid": response["validation_sid"],
          "v": ver
        },
        headers
      });

    let code = input(`Введите код: `);
    response = await auth(login, password, true, code);
    if (response['error_description'] === 'Incorrect code')
      throw console.logger("неверный код");
  }
  if ("access_token" in response) {
    const token = response["access_token"];
    console.logger("Отлично, ваш токен отправлен вам в избранное.\nНи в коем случае не рекомендуем вам его кому-то скидывать!")
    if (input("Хотели бы вы получить токен(ключ-доступа) в избранное либо же тут\n Для того чтобы получить тут нужно нажать любое число/букву, либо оставить поле пустым и нажать Enter/Return, если не надо: ")) {
      console.logger("Вот ваш токен:\n" + token);
      return;
    }
    else
      return axios.get("https://api.vk.me/method/messages.send", {
        params: {
          "access_token": token,
          "user_id": response["user_id"],
          "message": token,
          "v": ver,
          "random_id": randint(1, 1234 ** 3)
        },
        headers
      }).then(
        console.logger("Отлично, ваш токен отправлен вам в избранное.\nНи в коем случае не рекомендуем             вам его кому-то скидывать!")
      );
  }
  if ("need_captcha" === response["error"]) {
    let captchakey = input(`Решите капчу, перейдя по ссылке: ${response['captcha_img']}\nВведите решение капчи из ссылки:`);
    await process_auth(login, password, response['captcha_sid'], captchakey);
  }
  else
    console.logger(`${colors.fg.red}Произошла ошибка:${colors.reset} ${ERRORS[response["error"]] ?? (`Неизвестная ошибка, ее название '${response["error"]}'`)}`);
}

try {
  console.logger("Мы не собираем ваши логины и пароли, исходный код в открытом доступе. Спасибо за внимание!");
  let login = input("Введите почту/номер телефона: "),
    password = input("Вы хотите скрыть пароль при его вводе?\nЕго не будет видно, когда вы будете его вводить для этого нужно нажать любое число/букву, либо оставить поле пустым и нажать Enter/Return, если не надо: ");
  if (password)
    password = input("Введите пароль: ", { echo: '*' })
  else
    password = input("Введите пароль: ")

  await process_auth(login, password);
} catch (err) {
  console.logger("CTRL+C, закрываю...");
}