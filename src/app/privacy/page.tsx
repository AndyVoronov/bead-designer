import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <div className="home-page-root min-h-screen bg-[#FFF8F5]">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <a
            href={typeof window !== "undefined" ? (document.referrer || "/") : "/"}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </a>
          <h1 className="text-lg font-bold text-gray-800">Политика конфиденциальности</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="prose prose-sm prose-gray max-w-none">
          <p className="text-sm text-gray-500 mb-8">Дата последнего обновления: 24 мая 2025 г.</p>

          <h2 className="text-base font-bold text-gray-800 mt-8 mb-3">1. Общие положения</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей
            интернет-магазина «5 минут тишины» (далее — Магазин), расположенного по адресу{" "}
            <a href="https://5minutesofsilence.ru" className="text-rose-500 hover:text-rose-600">5minutesofsilence.ru</a>.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Используя сайт Магазина, вы подтверждаете своё согласие с настоящей Политикой. Если вы не согласны с условиями
            Политики, пожалуйста, прекратите использование сайта.
          </p>

          <h2 className="text-base font-bold text-gray-800 mt-8 mb-3">2. Какие данные мы собираем</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            При оформлении заказа мы собираем: имя, номер телефона, email (если указан), адрес доставки.
            При регистрации через социальные сети (Яндекс, ВКонтакте, Telegram) мы получаем имя и уникальный идентификатор
            аккаунта социальной сети.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Мы не собираем данные автоматически, кроме технической информации (IP-адрес, тип браузера, ОС),
            необходимой для работы сайта и аналитики.
          </p>

          <h2 className="text-base font-bold text-gray-800 mt-8 mb-3">3. Цели обработки данных</h2>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600 leading-relaxed mb-4">
            <li>Обработка и выполнение заказов</li>
            <li>Связь с клиентом по поводу заказа</li>
            <li>Отправка уведомлений о статусе заказа (через Telegram)</li>
            <li>Отправка подтверждения заказа на email (если указан)</li>
            <li>Аналитика посещаемости сайта (Яндекс Метрика)</li>
          </ul>

          <h2 className="text-base font-bold text-gray-800 mt-8 mb-3">4. Защита данных</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Мы принимаем организационные и технические меры для защиты ваших персональных данных от неправомерного доступа,
            уничтожения, изменения, блокирования, копирования, распространения, а также от иных неправомерных действий
            третьих лиц.
          </p>

          <h2 className="text-base font-bold text-gray-800 mt-8 mb-3">5. Передача данных третьим лицам</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Мы не передаём ваши персональные данные третьим лицам, за исключением случаев:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600 leading-relaxed mb-4">
            <li>Службы доставки (СДЭК, Почта России) — только для выполнения заказа</li>
            <li>По требованию закона на основании судебного решения или запроса уполномоченного государственного органа</li>
          </ul>

          <h2 className="text-base font-bold text-gray-800 mt-8 mb-3">6. Хранение данных</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Персональные данные хранятся в течение срока, необходимого для достижения целей обработки, но не более 3 лет
            с момента последнего взаимодействия, если иное не установлено законодательством РФ.
          </p>

          <h2 className="text-base font-bold text-gray-800 mt-8 mb-3">7. Права пользователя</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">Вы имеете право:</p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600 leading-relaxed mb-4">
            <li>Получить информацию об обработке ваших персональных данных</li>
            <li>Потребовать уточнения, обновления или удаления ваших данных</li>
            <li>Отозвать согласие на обработку данных</li>
            <li>Обратиться в Роскомнадзор при нарушении ваших прав</li>
          </ul>

          <h2 className="text-base font-bold text-gray-800 mt-8 mb-3">8. Файлы cookie</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Сайт использует файлы cookie для работы корзины, аутентификации и аналитики. Вы можете отключить cookie
            в настройках браузера, но это может повлиять на работу сайта.
          </p>

          <h2 className="text-base font-bold text-gray-800 mt-8 mb-3">9. Сервисы аналитики</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Сайт использует Яндекс Метрику для сбора обезличенных данных о посещаемости. Вы можете отключить сбор
            аналитических данных с помощью специальных расширений для браузера.
          </p>

          <h2 className="text-base font-bold text-gray-800 mt-8 mb-3">10. Контакты</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            По вопросам, связанным с обработкой персональных данных, обращайтесь:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600 leading-relaxed">
            <li>Email: <a href="mailto:info@5minutesofsilence.ru" className="text-rose-500 hover:text-rose-600">info@5minutesofsilence.ru</a></li>
            <li>Telegram: <a href="https://t.me/karinavoronova" className="text-rose-500 hover:text-rose-600" target="_blank" rel="noopener noreferrer">@karinavoronova</a></li>
          </ul>
        </div>
      </main>
    </div>
  );
}
